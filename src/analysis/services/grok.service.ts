import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokResponseMessage {
  role: string;
  content: string;
}

interface GrokChatCompletionsResponse {
  choices?: Array<{
    message?: GrokResponseMessage;
  }>;
}

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly openRouterKeys: string[];
  private readonly openRouterBaseUrl: string;
  private readonly groqApiKeys: string[];
  private readonly groqBaseUrl: string;
  private readonly groqTextModel: string;
  private readonly textModel: string;
  private readonly visionModel: string;
  private readonly maxRetries = 5;
  private readonly retryDelay = 1000;
  private readonly cooldownMs = 60_000;
  private readonly cooldownMap = new Map<string, number>();
  private readonly disabledModels = new Set<string>();

  private readonly textRotationBase = [
    'openrouter/free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'google/gemma-3-12b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
  ];

  private readonly visionRotationBase = [
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'google/gemma-3-27b-it:free',
  ];

  constructor(private readonly configService: ConfigService) {
    this.openRouterBaseUrl =
      this.configService.get<string>('OPENROUTER_BASE_URL') ||
      this.configService.get<string>('GROK_BASE_URL') ||
      'https://openrouter.ai/api/v1';
    this.groqBaseUrl =
      this.configService.get<string>('GROQ_BASE_URL') ||
      'https://api.groq.com/openai/v1';

    this.openRouterKeys = this.loadApiKeys('OPENROUTER_API_KEY');
    this.groqApiKeys = this.loadApiKeys('GROQ_API_KEY');

    this.textModel =
      this.configService.get<string>('OPENROUTER_TEXT_MODEL') ||
      this.configService.get<string>('GROK_TEXT_MODEL') ||
      'openrouter/free';
    this.visionModel =
      this.configService.get<string>('OPENROUTER_VISION_MODEL') ||
      this.configService.get<string>('GROK_VISION_MODEL') ||
      'nvidia/nemotron-nano-12b-v2-vl:free';
    this.groqTextModel =
      this.configService.get<string>('GROQ_TEXT_MODEL') ||
      'llama-3.3-70b-versatile';

    if (this.openRouterKeys.length > 0 && this.openRouterKeys.length < 2) {
      this.logger.warn(
        'OpenRouter resilience is limited. Configure OPENROUTER_API_KEY and OPENROUTER_API_KEY_2.',
      );
    }

    if (this.groqApiKeys.length > 0 && this.groqApiKeys.length < 2) {
      this.logger.warn(
        'Groq resilience is limited. Configure GROQ_API_KEY and GROQ_API_KEY_2.',
      );
    }
  }

  private loadApiKeys(baseName: string): string[] {
    const keys = [
      this.configService.get<string>(baseName),
      this.configService.get<string>(`${baseName}_2`),
      this.configService.get<string>(`${baseName}_3`),
      // Backward compatibility
      baseName === 'OPENROUTER_API_KEY'
        ? this.configService.get<string>('GROK_API_KEY')
        : undefined,
    ].filter((key): key is string => !!key && key.trim().length > 0);

    return Array.from(new Set(keys));
  }

  async isAvailable(): Promise<boolean> {
    if (this.openRouterKeys.length > 0) {
      try {
        const response = await axios.get(`${this.openRouterBaseUrl}/models`, {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${this.openRouterKeys[0]}`,
          },
        });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        this.logger.warn(
          `OpenRouter availability check failed: ${(error as Error).message}`,
        );
      }
    }

    return this.groqApiKeys.length > 0;
  }

  async getAvailableModels(): Promise<string[]> {
    if (this.openRouterKeys.length === 0) {
      return [];
    }

    try {
      const response = await axios.get(`${this.openRouterBaseUrl}/models`, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${this.openRouterKeys[0]}`,
        },
      });

      return response.data?.data?.map((m: { id: string }) => m.id) || [];
    } catch {
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Completion URL must stay under configured base URL.
  private getCompletionUrl(): string {
    return this.openRouterBaseUrl.replace(/\/+$/, '') + '/chat/completions';
  }

  private getGroqCompletionUrl(): string {
    return this.groqBaseUrl.replace(/\/+$/, '') + '/chat/completions';
  }

  private cleanExpiredCooldowns(): void {
    const now = Date.now();
    for (const [model, until] of this.cooldownMap.entries()) {
      if (until <= now) {
        this.cooldownMap.delete(model);
      }
    }
  }

  getCooldownModels(): string[] {
    this.cleanExpiredCooldowns();
    const now = Date.now();
    return Array.from(this.cooldownMap.entries())
      .filter(([, until]) => until > now)
      .map(([model]) => model);
  }

  private markModelCooldown(model: string): void {
    const until = Date.now() + this.cooldownMs;
    this.cooldownMap.set(model, until);
  }

  private removeModelForSession(model: string): void {
    this.disabledModels.add(model);
    this.cooldownMap.delete(model);
  }

  private getRotationModels(
    mode: 'text' | 'vision',
    requestedModel?: string,
  ): string[] {
    const primary = mode === 'vision' ? this.visionRotationBase : this.textRotationBase;
    const configured = mode === 'vision' ? this.visionModel : this.textModel;

    // Dynamic rotation list: request-specific + configured + base order.
    const merged = [requestedModel, configured, ...primary].filter(
      (m): m is string => !!m,
    );

    this.cleanExpiredCooldowns();

    return Array.from(new Set(merged)).filter((model) => {
      if (this.disabledModels.has(model)) return false;
      const cooldownUntil = this.cooldownMap.get(model);
      return !cooldownUntil || cooldownUntil <= Date.now();
    });
  }

  private async requestCompletion(
    model: string,
    messages: Array<{ role: string; content: any }>,
    temperature = 0.7,
    maxTokens = 2048,
    mode: 'text' | 'vision' = 'text',
  ): Promise<string> {
    const endpoint = this.getCompletionUrl();
    const modelCandidates = this.getRotationModels(mode, model);

    if (modelCandidates.length === 0 && mode === 'vision') {
      throw new Error('No available OpenRouter vision models (all disabled or cooling down)');
    }

    let lastError: unknown;

    if (this.openRouterKeys.length > 0) {
      for (const currentModel of modelCandidates) {
        for (let keyIndex = 0; keyIndex < this.openRouterKeys.length; keyIndex++) {
          const apiKey = this.openRouterKeys[keyIndex];
          for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
              const response = await axios.post<GrokChatCompletionsResponse>(
                endpoint,
                {
                  model: currentModel,
                  messages,
                  temperature,
                  max_tokens: maxTokens,
                },
                {
                  timeout: 120000,
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost',
                    'X-Title': 'DeepSkynBackEnd',
                  },
                },
              );

              const content = response.data?.choices?.[0]?.message?.content;
              if (content) {
                return content;
              }

              throw new Error('Empty response from OpenRouter');
            } catch (error) {
              lastError = error;
              const axiosError = error as AxiosError;
              const status = axiosError.response?.status;
              this.logger.warn(
                `OpenRouter request failed (model=${currentModel}, key#${keyIndex + 1}, attempt=${attempt}): ${axiosError.message}`,
              );

              // 404: remove model permanently from current app session.
              if (status === 404) {
                this.removeModelForSession(currentModel);
                break;
              }

              // 429: put model on cooldown for 60s and move to next model.
              if (status === 429) {
                this.markModelCooldown(currentModel);
                break;
              }

              if (attempt < this.maxRetries) {
                await this.sleep(this.retryDelay * attempt);
              }
            }
          }
        }
      }
    }

    if (mode === 'text') {
      return this.requestGroqCompletion(messages, temperature, maxTokens, lastError);
    }

    throw lastError || new Error('OpenRouter request failed after all retries');
  }

  private async requestGroqCompletion(
    messages: Array<{ role: string; content: any }>,
    temperature: number,
    maxTokens: number,
    previousError?: unknown,
  ): Promise<string> {
    if (this.groqApiKeys.length === 0) {
      throw previousError || new Error('No Groq API key configured');
    }

    const endpoint = this.getGroqCompletionUrl();
    let lastError = previousError;

    for (let keyIndex = 0; keyIndex < this.groqApiKeys.length; keyIndex++) {
      const apiKey = this.groqApiKeys[keyIndex];

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await axios.post<GrokChatCompletionsResponse>(
            endpoint,
            {
              model: this.groqTextModel,
              messages,
              temperature,
              max_tokens: maxTokens,
            },
            {
              timeout: 120000,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          );

          const content = response.data?.choices?.[0]?.message?.content;
          if (content) {
            this.logger.log(
              `Groq fallback succeeded (model=${this.groqTextModel}, key#${keyIndex + 1})`,
            );
            return content;
          }

          throw new Error('Empty response from Groq');
        } catch (error) {
          lastError = error;
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;
          this.logger.warn(
            `Groq request failed (model=${this.groqTextModel}, key#${keyIndex + 1}, attempt=${attempt}): ${axiosError.message}`,
          );

          if (attempt < this.maxRetries && (status === 429 || status === 500 || status === 503)) {
            await this.sleep(this.retryDelay * attempt);
            continue;
          }

          break;
        }
      }
    }

    throw lastError || new Error('Groq request failed after all retries');
  }

  async generate(prompt: string, model?: string): Promise<string> {
    return this.requestCompletion(
      model || this.textModel,
      [{ role: 'user', content: prompt }],
      0.7,
      2048,
      'text',
    );
  }

  async chat(messages: GrokChatMessage[], model?: string): Promise<string> {
    const normalized = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return this.requestCompletion(model || this.textModel, normalized, 0.7, 2048, 'text');
  }

  async analyzeImage(
    base64Image: string,
    prompt: string,
    model?: string,
  ): Promise<string> {
    return this.requestCompletion(
      model || this.visionModel,
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      0.4,
      4096,
      'vision',
    );
  }

  async getSkincareAdvice(
    conditions: string[],
    concerns: string[],
  ): Promise<string> {
    const conditionsList =
      conditions.length > 0 ? conditions.join(', ') : 'general skin health';
    const concernsList =
      concerns.length > 0 ? concerns.join(', ') : 'overall skincare';

    const prompt = `Tu es un dermatologue expert. Fournis des conseils de soins de la peau pour quelqu'un avec:\nConditions: ${conditionsList}\nPréoccupations: ${concernsList}\n\nDonne des conseils pratiques et actionnables en 3-4 phrases en français.`;
    return this.generate(prompt);
  }

  async chatSkincare(
    systemPrompt: string,
    conversationHistory: string,
    userMessage: string,
  ): Promise<string> {
    const messages: GrokChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    if (conversationHistory && conversationHistory.trim()) {
      const lines = conversationHistory.split('\n');
      for (const line of lines) {
        if (line.startsWith('Utilisateur:')) {
          messages.push({
            role: 'user',
            content: line.replace('Utilisateur:', '').trim(),
          });
        } else if (line.startsWith('Assistant:')) {
          messages.push({
            role: 'assistant',
            content: line.replace('Assistant:', '').trim(),
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    return this.chat(messages);
  }
}