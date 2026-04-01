import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 encoded images (for vision models like llava)
}

export interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly textModel: string;
  private readonly visionModel: string;
  private readonly maxRetries = 2;
  private readonly retryDelay = 1000;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.textModel = this.configService.get<string>('OLLAMA_TEXT_MODEL') || 'llama3:8b';
    this.visionModel = this.configService.get<string>('OLLAMA_VISION_MODEL') || 'llava';
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.data?.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate text completion (for simple prompts)
   */
  async generate(prompt: string, model?: string): Promise<string> {
    const selectedModel = model || this.textModel;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Ollama generate attempt ${attempt} with model ${selectedModel}`);

        const response = await axios.post<OllamaGenerateResponse>(
          `${this.baseUrl}/api/generate`,
          {
            model: selectedModel,
            prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_predict: 2048,
            },
          },
          { timeout: 300000 }, // 5 minutes pour laisser le temps à Ollama
        );

        if (response.data?.response) {
          this.logger.log('Ollama generate successful');
          return response.data.response;
        }

        throw new Error('Empty response from Ollama');
      } catch (error) {
        const axiosError = error as AxiosError;
        this.logger.warn(
          `Ollama generate attempt ${attempt} failed: ${axiosError.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Ollama generate failed after retries');
  }

  /**
   * Chat completion with conversation history
   */
  async chat(
    messages: OllamaChatMessage[],
    model?: string,
  ): Promise<string> {
    const selectedModel = model || this.textModel;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Ollama chat attempt ${attempt} with model ${selectedModel}`);

        const response = await axios.post<OllamaChatResponse>(
          `${this.baseUrl}/api/chat`,
          {
            model: selectedModel,
            messages,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_predict: 2048,
            },
          },
          { timeout: 300000 }, // 5 minutes pour laisser le temps à Ollama
        );

        if (response.data?.message?.content) {
          this.logger.log('Ollama chat successful');
          return response.data.message.content;
        }

        throw new Error('Empty response from Ollama');
      } catch (error) {
        const axiosError = error as AxiosError;
        this.logger.warn(
          `Ollama chat attempt ${attempt} failed: ${axiosError.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Ollama chat failed after retries');
  }

  /**
   * Analyze image with vision model (llava)
   * Requires a vision-capable model like llava, bakllava, etc.
   */
  async analyzeImage(
    base64Image: string,
    prompt: string,
    model?: string,
  ): Promise<string> {
    const selectedModel = model || this.visionModel;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Ollama vision attempt ${attempt} with model ${selectedModel}`);

        const response = await axios.post<OllamaChatResponse>(
          `${this.baseUrl}/api/chat`,
          {
            model: selectedModel,
            messages: [
              {
                role: 'user',
                content: prompt,
                images: [base64Image],
              },
            ],
            stream: false,
            options: {
              temperature: 0.4,
              top_p: 0.9,
              num_predict: 4096,
            },
          },
          { timeout: 300000 }, // 5 minutes pour l'analyse d'image
        );

        if (response.data?.message?.content) {
          this.logger.log('Ollama vision analysis successful');
          return response.data.message.content;
        }

        throw new Error('Empty response from Ollama vision');
      } catch (error) {
        const axiosError = error as AxiosError;
        this.logger.warn(
          `Ollama vision attempt ${attempt} failed: ${axiosError.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Ollama vision analysis failed after retries');
  }

  /**
   * Generate skincare advice (text-only)
   */
  async getSkincareAdvice(
    conditions: string[],
    concerns: string[],
  ): Promise<string> {
    const conditionsList =
      conditions?.length > 0 ? conditions.join(', ') : 'general skin health';
    const concernsList =
      concerns?.length > 0 ? concerns.join(', ') : 'overall skincare';

    const prompt = `Tu es un dermatologue expert. Fournis des conseils de soins de la peau pour quelqu'un avec:
Conditions: ${conditionsList}
Préoccupations: ${concernsList}

Donne des conseils pratiques et actionnables en 3-4 phrases en français.`;

    return this.generate(prompt);
  }

  /**
   * Chat for skincare assistant
   */
  async chatSkincare(
    systemPrompt: string,
    conversationHistory: string,
    userMessage: string,
  ): Promise<string> {
    const messages: OllamaChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Parse conversation history if exists
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
