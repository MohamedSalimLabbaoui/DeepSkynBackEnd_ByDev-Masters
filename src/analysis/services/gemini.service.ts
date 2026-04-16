import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { GrokService } from './grok.service';
import {
  compressWhitespace,
  buildCompactAnalysisPrompt,
  buildUltraCompactScanPrompt,
  buildMinimalScanPrompt,
} from './prompt-compression.util';

export interface GeminiAnalysisResult {
  skinType: string;
  skinAge: number;
  healthScore: number;
  conditions: string[];
  concerns: string[];
  recommendations: {
    products: string[];
    ingredients: string[];
    lifestyle: string[];
    warnings: string[];
  };
  detailedAnalysis: {
    hydration: { score: number; description: string };
    texture: { score: number; description: string };
    pores: { score: number; description: string };
    pigmentation: { score: number; description: string };
    wrinkles: { score: number; description: string };
    acne: { score: number; description: string };
    redness: { score: number; description: string };
    elasticity: { score: number; description: string };
  };
  fitzpatrickType: number;
  summary: string;
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export interface CosmeticProductAnalysisResult {
  name: string;
  brand: string;
  category: string;
  ingredients: string[];
  benefits: {
    title: string;
    description: string;
    matchPercentage: number;
  }[];
  concerns: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  skinTypeCompatibility: {
    skinType: string;
    compatibility: number;
  }[];
  recommendation: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly vertexApiKeys: string[];
  private readonly vertexModels: string[];
  private readonly vertexBaseUrl =
    'https://aiplatform.googleapis.com/v1/publishers/google/models';
  private readonly geminiApiKeys: string[];
  private readonly geminiModels: string[];
  private readonly geminiBaseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly maxRetries = 2;
  private readonly retryDelay = 2000; // 2 seconds
  private readonly grokService: GrokService;

  constructor(private readonly configService: ConfigService) {
    this.vertexApiKeys = this.loadApiKeys('VERTEX_API_KEY');
    this.vertexModels = [
      this.configService.get<string>('VERTEX_PRIMARY_MODEL') || 'gemini-2.5-pro',
      this.configService.get<string>('VERTEX_FALLBACK_MODEL') || 'gemini-2.0-flash',
    ].filter((value, index, arr) => !!value && arr.indexOf(value) === index);

    this.geminiApiKeys = this.loadApiKeys('GEMINI_API_KEY');
    this.geminiModels = [
      this.configService.get<string>('GEMINI_PRIMARY_MODEL') || 'gemini-2.5-flash',
      this.configService.get<string>('GEMINI_FALLBACK_MODEL') || 'gemini-1.5-flash',
    ].filter((value, index, arr) => !!value && arr.indexOf(value) === index);

    if (this.vertexApiKeys.length < 2) {
      this.logger.warn(
        'Vertex AI resilience is limited. Configure at least VERTEX_API_KEY and VERTEX_API_KEY_2.',
      );
    }

    if (this.geminiApiKeys.length < 2) {
      this.logger.warn(
        'Gemini fallback resilience is limited. Configure at least GEMINI_API_KEY and GEMINI_API_KEY_2.',
      );
    }

    this.grokService = new GrokService(configService);
  }

  private loadApiKeys(baseName: string): string[] {
    const keys = [
      this.configService.get<string>(baseName),
      this.configService.get<string>(`${baseName}_2`),
      this.configService.get<string>(`${baseName}_3`),
    ].filter((key): key is string => !!key && key.trim().length > 0);

    return Array.from(new Set(keys));
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableStatus(status?: number): boolean {
    return status === 429 || status === 500 || status === 503;
  }

  private async requestVertexWithFallback(
    requestBody: Record<string, any>,
    options?: { timeout?: number },
  ): Promise<GeminiResponse> {
    if (this.vertexApiKeys.length === 0) {
      throw new Error('No Vertex AI API key configured');
    }

    const timeout = options?.timeout ?? 30000;
    const errors: string[] = [];

    for (const model of this.vertexModels) {
      for (let keyIndex = 0; keyIndex < this.vertexApiKeys.length; keyIndex++) {
        const apiKey = this.vertexApiKeys[keyIndex];
        const url = `${this.vertexBaseUrl}/${model}:generateContent?key=${apiKey}`;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            this.logger.debug(
              `Vertex request with model=${model}, key#${keyIndex + 1}, attempt=${attempt}`,
            );

            const response = await axios.post<GeminiResponse>(url, requestBody, {
              headers: { 'Content-Type': 'application/json' },
              timeout,
            });

            return response.data;
          } catch (error) {
            const axiosError = error as AxiosError;
            const status = axiosError.response?.status;
            const canRetry = this.isRetryableStatus(status);

            this.logger.warn(
              `Vertex failed (model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`,
            );

            if (canRetry && attempt < this.maxRetries) {
              await this.sleep(this.retryDelay * attempt);
              continue;
            }

            errors.push(
              `vertex:model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}`,
            );
            break;
          }
        }
      }
    }

    throw new Error(`All Vertex candidates failed: ${errors.join(' | ')}`);
  }

  private async requestGeminiWithFallback(
    requestBody: Record<string, any>,
    options?: { timeout?: number },
  ): Promise<GeminiResponse> {
    if (this.vertexApiKeys.length === 0 && this.geminiApiKeys.length === 0) {
      throw new Error('No Vertex/Gemini API key configured');
    }

    const timeout = options?.timeout ?? 30000;
    const errors: string[] = [];

    if (this.vertexApiKeys.length > 0) {
      try {
        return await this.requestVertexWithFallback(requestBody, { timeout });
      } catch (error) {
        errors.push((error as Error).message);
      }
    }

    if (this.geminiApiKeys.length > 0) {
      for (const model of this.geminiModels) {
        for (let keyIndex = 0; keyIndex < this.geminiApiKeys.length; keyIndex++) {
          const apiKey = this.geminiApiKeys[keyIndex];
          const url = `${this.geminiBaseUrl}/${model}:generateContent?key=${apiKey}`;

          for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
              this.logger.debug(
                `Gemini request with model=${model}, key#${keyIndex + 1}, attempt=${attempt}`,
              );

              const response = await axios.post<GeminiResponse>(url, requestBody, {
                headers: { 'Content-Type': 'application/json' },
                timeout,
              });

              return response.data;
            } catch (error) {
              const axiosError = error as AxiosError;
              const status = axiosError.response?.status;
              const canRetry = this.isRetryableStatus(status);

              this.logger.warn(
                `Gemini failed (model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`,
              );

              if (canRetry && attempt < this.maxRetries) {
                await this.sleep(this.retryDelay * attempt);
                continue;
              }

              errors.push(
                `gemini:model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}`,
              );
              break;
            }
          }
        }
      }
    }

    throw new Error(`All Gemini candidates failed: ${errors.join(' | ')}`);
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          if (attempt < retries) {
            const delay = this.retryDelay * attempt; // Exponential backoff
            this.logger.warn(
              `Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt}/${retries})`,
            );
            await this.sleep(delay);
            continue;
          }
          throw new HttpException(
            'API rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (
          axiosError.response?.status === 503 ||
          axiosError.response?.status === 500
        ) {
          if (attempt < retries) {
            const delay = this.retryDelay * attempt;
            this.logger.warn(
              `Server error (${axiosError.response?.status}). Retrying in ${delay}ms...`,
            );
            await this.sleep(delay);
            continue;
          }
        }

        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Analyze skin images using Gemini AI with OpenRouter fallback
   */
  async analyzeSkinImages(
    imageUrls: string[],
    questionnaire?: Record<string, any>,
  ): Promise<GeminiAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(questionnaire);
      const imageParts = await this.prepareImageParts(imageUrls);

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }, ...imageParts],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      };

      const response = await this.requestGeminiWithFallback(requestBody, {
        timeout: 60000,
      });

      const textResponse = response.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      return this.parseAnalysisResponse(textResponse);
    } catch (error) {
      this.logger.error('Gemini analysis failed, trying OpenRouter fallback', error);
      
      // Fallback to OpenRouter with vision model
      try {
        const isGrokAvailable = await this.grokService.isAvailable();
        if (isGrokAvailable) {
          this.logger.log('Using OpenRouter vision fallback for image analysis');
          const fallbackPrompt = this.buildAnalysisPrompt(questionnaire);
          const fallbackImageParts = await this.prepareImageParts(imageUrls);
          
          if (fallbackImageParts.length > 0) {
            const base64Image = fallbackImageParts[0].inlineData.data;
            const grokResponse = await this.grokService.analyzeImage(base64Image, fallbackPrompt);
            return this.parseAnalysisResponse(grokResponse);
          }
        }
      } catch (grokError) {
        this.logger.error('OpenRouter fallback also failed', grokError);
      }
      
      throw error;
    }
  }

  /**
   * Analyze real-time face scan with OpenRouter fallback
   */
  async analyzeRealTimeScan(
    base64Image: string,
    mimeType: string = 'image/jpeg',
  ): Promise<GeminiAnalysisResult> {
    try {
      const prompt = this.buildRealTimeScanPrompt();

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        },
      };

      const response = await this.requestGeminiWithFallback(requestBody, {
        timeout: 30000,
      });

      const textResponse = response.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      return this.parseAnalysisResponse(textResponse);
    } catch (error) {
      this.logger.error('Real-time scan analysis failed, trying OpenRouter fallback', error);
      
      // Fallback to OpenRouter with vision model
      try {
        const isGrokAvailable = await this.grokService.isAvailable();
        if (isGrokAvailable) {
          this.logger.log('Using OpenRouter vision fallback for real-time scan');
          const prompt = this.buildRealTimeScanPrompt();
          const grokResponse = await this.grokService.analyzeImage(base64Image, prompt);
          return this.parseAnalysisResponse(grokResponse);
        }
      } catch (grokError) {
        this.logger.error('OpenRouter fallback also failed', grokError);
      }
      
      throw error;
    }
  }

  /**
   * Build the compressed analysis prompt (~50% token reduction)
   */
  private buildAnalysisPrompt(questionnaire?: Record<string, any>): string {
    return buildCompactAnalysisPrompt(questionnaire);
  }

  /**
   * Build compressed prompt for real-time scan (~60% token reduction)
   */
  private buildRealTimeScanPrompt(): string {
    return buildUltraCompactScanPrompt();
  }

  /**
   * Prepare image parts for Gemini API
   */
  private async prepareImageParts(imageUrls: string[]): Promise<any[]> {
    const imageParts = [];

    for (const url of imageUrls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });

        const base64 = Buffer.from(response.data).toString('base64');
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        imageParts.push({
          inlineData: {
            mimeType,
            data: base64,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to fetch image: ${url}`, error);
      }
    }

    return imageParts;
  }

  /**
   * Parse the Gemini response into structured data
   */
  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const normalized = trimmed.replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private normalizeSkinAge(value: unknown): number {
    const direct = this.toNumber(value);
    if (direct !== null) {
      return Math.max(10, Math.min(100, Math.round(direct)));
    }

    if (typeof value === 'string') {
      const matches = value.match(/\d+(?:[.,]\d+)?/g);
      if (matches?.length) {
        const nums = matches
          .map((v) => this.toNumber(v))
          .filter((n): n is number => n !== null);
        if (nums.length === 1) {
          return Math.max(10, Math.min(100, Math.round(nums[0])));
        }
        if (nums.length >= 2) {
          const avg = (nums[0] + nums[1]) / 2;
          return Math.max(10, Math.min(100, Math.round(avg)));
        }
      }
    }

    return 25;
  }

  private normalizeHealthScore(value: unknown): number {
    const num = this.toNumber(value);
    if (num === null) return 70;

    // Some model responses return score on a 0-10 scale.
    const normalized = num <= 10 ? num * 10 : num;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  }

  private normalizeMetric(
    value: unknown,
    fallbackDescription: string,
  ): { score: number; description: string } {
    if (value && typeof value === 'object') {
      const maybeScore = this.toNumber((value as any).score);
      const maybeDescription =
        typeof (value as any).description === 'string'
          ? (value as any).description
          : fallbackDescription;

      return {
        score:
          maybeScore === null
            ? 70
            : Math.max(0, Math.min(100, Math.round(maybeScore <= 10 ? maybeScore * 10 : maybeScore))),
        description: maybeDescription,
      };
    }

    if (typeof value === 'string' && value.trim()) {
      return { score: 70, description: value.trim() };
    }

    return { score: 70, description: fallbackDescription };
  }

  private parseAnalysisResponse(textResponse: string): GeminiAnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and provide defaults
      return {
        skinType: parsed.skinType || 'normal',
        skinAge: this.normalizeSkinAge(parsed.skinAge),
        healthScore: this.normalizeHealthScore(parsed.healthScore),
        conditions: parsed.conditions || [],
        concerns: parsed.concerns || [],
        recommendations: {
          products: parsed.recommendations?.products || [],
          ingredients: parsed.recommendations?.ingredients || [],
          lifestyle: parsed.recommendations?.lifestyle || [],
          warnings: parsed.recommendations?.warnings || [],
        },
        detailedAnalysis: {
          hydration: this.normalizeMetric(
            parsed.detailedAnalysis?.hydration,
            'Normal hydration',
          ),
          texture: this.normalizeMetric(
            parsed.detailedAnalysis?.texture,
            'Normal texture',
          ),
          pores: this.normalizeMetric(
            parsed.detailedAnalysis?.pores,
            'Normal pore size',
          ),
          pigmentation: this.normalizeMetric(
            parsed.detailedAnalysis?.pigmentation,
            'Even tone',
          ),
          wrinkles: this.normalizeMetric(
            parsed.detailedAnalysis?.wrinkles,
            'Minimal wrinkles',
          ),
          acne: this.normalizeMetric(
            parsed.detailedAnalysis?.acne,
            'Clear skin',
          ),
          redness: this.normalizeMetric(
            parsed.detailedAnalysis?.redness,
            'No redness',
          ),
          elasticity: this.normalizeMetric(
            parsed.detailedAnalysis?.elasticity,
            'Good elasticity',
          ),
        },
        fitzpatrickType: Math.min(6, Math.max(1, parsed.fitzpatrickType || 3)),
        summary: parsed.summary || 'Analysis completed successfully.',
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini response', error);
      throw new Error('Failed to parse analysis response');
    }
  }

  /**
   * Get skincare advice based on conditions with OpenRouter fallback
   */
  async getSkincareAdvice(
    conditions: string[],
    concerns: string[],
  ): Promise<string> {
    // Handle empty arrays
    const conditionsList =
      conditions?.length > 0 ? conditions.join(', ') : 'general skin health';
    const concernsList =
      concerns?.length > 0 ? concerns.join(', ') : 'overall skincare';

    // Compressed prompt
    const prompt = compressWhitespace(`
Dermatologist. Advice for:
Cond:${conditionsList}
Concerns:${concernsList}
3-4 sentences, actionable.`);

    try {
      const response = await this.requestGeminiWithFallback(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        },
        { timeout: 30000 },
      );

      return (
        response.candidates[0]?.content?.parts[0]?.text ||
        'Unable to generate advice.'
      );
    } catch (error) {
      this.logger.error('Failed to get skincare advice from Gemini, trying OpenRouter', error);
      
      try {
        const isGrokAvailable = await this.grokService.isAvailable();
        if (isGrokAvailable) {
          this.logger.log('Using OpenRouter fallback for skincare advice');
          return await this.grokService.getSkincareAdvice(conditions, concerns);
        }
      } catch (grokError) {
        this.logger.error('OpenRouter fallback also failed', grokError);
      }
      
      return 'Unable to generate advice at this time. Please try again later.';
    }
  }

  /**
   * Chat with AI - Conversational skincare assistant (compressed)
   */
  async chat(
    systemPrompt: string,
    conversationHistory: string,
    userMessage: string,
  ): Promise<string> {
    // Compress history by keeping only last 500 chars
    const compressedHistory = conversationHistory?.length > 500 
      ? '...' + conversationHistory.slice(-500) 
      : (conversationHistory || '-');

    const prompt = compressWhitespace(`
${systemPrompt}
Hist:${compressedHistory}
User:${userMessage}
Rép:français,utile,pro.`);

    try {
      const response = await this.requestGeminiWithFallback(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        },
        { timeout: 3000000 },
      );

      return (
        response.candidates[0]?.content?.parts[0]?.text ||
        "Je suis désolé, je n'ai pas pu générer une réponse."
      );
    } catch (error) {
      this.logger.error('Failed to generate chat response from Gemini, trying OpenRouter', error);
      
      try {
        const isGrokAvailable = await this.grokService.isAvailable();
        if (isGrokAvailable) {
          this.logger.log('Using OpenRouter fallback for chat');
          return await this.grokService.chatSkincare(systemPrompt, conversationHistory, userMessage);
        }
      } catch (grokError) {
        this.logger.error('OpenRouter fallback also failed', grokError);
      }
      
      throw error;
    }
  }

  /**
   * Analyze a cosmetic product image and return structured compatibility details.
   */
  async analyzeCosmeticProductImage(
    base64Image: string,
    skinProfile?: {
      skinType?: string;
      concerns?: string[];
      sensitivities?: string[];
    },
    mimeType: string = 'image/jpeg',
  ): Promise<CosmeticProductAnalysisResult> {
    const prompt = compressWhitespace(`
Dermatology expert for cosmetic products.
Analyze this product image and return ONLY valid JSON.
User profile:
- skinType: ${skinProfile?.skinType || 'unknown'}
- concerns: ${(skinProfile?.concerns || []).join(', ') || 'none'}
- sensitivities: ${(skinProfile?.sensitivities || []).join(', ') || 'none'}

Required JSON schema:
{
  "name": "string",
  "brand": "string",
  "category": "string",
  "ingredients": ["string"],
  "benefits": [{"title":"string","description":"string","matchPercentage":0}],
  "concerns": [{"title":"string","description":"string","severity":"low|medium|high"}],
  "skinTypeCompatibility": [{"skinType":"Dry|Oily|Combination|Sensitive|Normal","compatibility":0}],
  "recommendation": "string"
}

Rules:
- identify the most likely product name and brand from packaging text;
- infer ingredients only from visible/legible text; if unclear use empty array;
- compatibility and recommendation must be specific to the provided user profile;
- return JSON only, no markdown and no extra text.
`);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      },
    };

    try {
      const response = await this.requestGeminiWithFallback(requestBody, {
        timeout: 45000,
      });

      const textResponse = response.candidates[0]?.content?.parts[0]?.text;
      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      return this.parseCosmeticProductAnalysis(textResponse);
    } catch (error) {
      this.logger.error('Failed cosmetic product analysis', error);
      throw error;
    }
  }

  private parseCosmeticProductAnalysis(
    textResponse: string,
  ): CosmeticProductAnalysisResult {
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in product analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const benefits = Array.isArray(parsed.benefits)
        ? parsed.benefits
            .filter((item: any) => item && (item.title || item.description))
            .map((item: any) => ({
              title: String(item.title || 'Benefit'),
              description: String(item.description || ''),
              matchPercentage: Math.max(
                0,
                Math.min(100, Number(item.matchPercentage ?? 0) || 0),
              ),
            }))
        : [];

      const concerns = Array.isArray(parsed.concerns)
        ? parsed.concerns
            .filter((item: any) => item && (item.title || item.description))
            .map((item: any) => {
              const severityValue = String(item.severity || 'low').toLowerCase();
              const severity: 'low' | 'medium' | 'high' =
                severityValue === 'high'
                  ? 'high'
                  : severityValue === 'medium'
                    ? 'medium'
                    : 'low';

              return {
                title: String(item.title || 'Concern'),
                description: String(item.description || ''),
                severity,
              };
            })
        : [];

      const compatibility = Array.isArray(parsed.skinTypeCompatibility)
        ? parsed.skinTypeCompatibility
            .filter((item: any) => item && item.skinType)
            .map((item: any) => ({
              skinType: String(item.skinType),
              compatibility: Math.max(
                0,
                Math.min(100, Number(item.compatibility ?? 0) || 0),
              ),
            }))
        : [];

      return {
        name: String(parsed.name || 'Unknown Product'),
        brand: String(parsed.brand || 'Unknown Brand'),
        category: String(parsed.category || 'Cosmetics'),
        ingredients: Array.isArray(parsed.ingredients)
          ? parsed.ingredients
              .map((item: any) => String(item).trim())
              .filter((item: string) => item.length > 0)
          : [],
        benefits,
        concerns,
        skinTypeCompatibility: compatibility,
        recommendation: String(
          parsed.recommendation ||
            'Recommendation unavailable. Please verify ingredients manually.',
        ),
      };
    } catch (error) {
      this.logger.error('Failed to parse cosmetic analysis response', error);
      throw new Error('Failed to parse cosmetic analysis response');
    }
  }
}
