import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { OllamaService } from './ollama.service';
import { RateLimiterService } from '../../shared/services/rate-limiter.service';
import { CacheService } from '../../shared/services/cache.service';
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

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000; // 5 seconds base delay
  private readonly rateLimit429Delay = 60000; // 60 seconds for quota exceeded
  private readonly backoffMultiplier = 2; // Progressive backoff
  private failureCount = 0; // Track consecutive failures
  private lastFailureTime = 0; // Track when last failure occurred
  private readonly ollamaService: OllamaService;

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimiter: RateLimiterService,
    private readonly cache: CacheService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    this.ollamaService = new OllamaService(configService);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        const result = await requestFn();
        // Reset failure count on successful request
        this.failureCount = Math.max(0, this.failureCount - 1);
        return result;
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          this.failureCount++; // Track rate limit failures
          this.lastFailureTime = Date.now(); // Track when failure occurred
          if (attempt < retries) {
            // Exponential backoff for rate limits with longer delay
            const delay = axiosError.response?.status === 429 
              ? this.rateLimit429Delay 
              : this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
            
            this.logger.warn(
              `Rate limited (429). Failure count: ${this.failureCount}. Retrying in ${delay}ms... (attempt ${attempt}/${retries})`,
            );
            await this.sleep(delay);
            continue;
          }
          throw new HttpException(
            `API rate limit exceeded. Please try again later. (Failed ${this.failureCount} times)`,
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
   * Analyze skin images using Gemini AI with Ollama fallback
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

      const response = await this.makeRequestWithRetry(() =>
        axios.post<GeminiResponse>(
          `${this.apiUrl}?key=${this.apiKey}`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const textResponse = response.data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      return this.parseAnalysisResponse(textResponse);
    } catch (error) {
      this.logger.error('Gemini analysis failed, trying Ollama fallback', error);
      
      // Fallback to Ollama with vision model
      try {
        const isOllamaAvailable = await this.ollamaService.isAvailable();
        if (isOllamaAvailable) {
          this.logger.log('Using Ollama vision fallback for image analysis');
          const fallbackPrompt = this.buildAnalysisPrompt(questionnaire);
          const fallbackImageParts = await this.prepareImageParts(imageUrls);
          
          if (fallbackImageParts.length > 0) {
            const base64Image = fallbackImageParts[0].inlineData.data;
            const ollamaResponse = await this.ollamaService.analyzeImage(base64Image, fallbackPrompt);
            return this.parseAnalysisResponse(ollamaResponse);
          }
        }
      } catch (ollamaError) {
        this.logger.error('Ollama fallback also failed', ollamaError);
      }
      
      throw error;
    }
  }

  /**
   * Analyze real-time face scan with progressive prompt optimization and global rate limiting
   */
  async analyzeRealTimeScan(
    base64Image: string,
    mimeType: string = 'image/jpeg',
  ): Promise<GeminiAnalysisResult> {
    
    // Create cache key
    const imageHash = Buffer.from(base64Image.substring(0, 100)).toString('base64');
    const cacheKey = `scan:${imageHash}:${mimeType}`;
    
    // Check cache first
    const cachedResult = this.cache.get<GeminiAnalysisResult>(cacheKey);
    if (cachedResult) {
      this.logger.debug('Using cached analysis result');
      return cachedResult;
    }
    
    // Check if Gemini quota is likely exhausted (high failure count)
    if (this.failureCount >= 5) {
      this.logger.warn('High failure count detected, trying Ollama first to avoid quota waste');
      try {
        const isOllamaAvailable = await this.ollamaService.isAvailable();
        if (isOllamaAvailable) {
          this.logger.log('Using Ollama as primary due to Gemini quota concerns');
          const prompt = this.buildRealTimeScanPrompt(0);
          const ollamaResponse = await this.ollamaService.analyzeImage(base64Image, prompt);
          const result = this.parseAnalysisResponse(ollamaResponse);
          
          // Cache Ollama result
          this.cache.set(cacheKey, result, 5 * 60 * 1000);
          
          return result;
        }
      } catch (ollamaError) {
        this.logger.warn('Ollama priority attempt failed, falling back to Gemini', ollamaError);
      }
    }
    
    for (let promptAttempt = 0; promptAttempt < 3; promptAttempt++) {
      try {
        const prompt = this.buildRealTimeScanPrompt(promptAttempt);
        
        // Reduce generation config for faster processing on higher attempts
        const maxTokens = promptAttempt >= 2 ? 4096 : promptAttempt >= 1 ? 6144 : 8192;
        const temperature = promptAttempt >= 2 ? 0.2 : 0.4;

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
            temperature,
            topK: 32,
            topP: 1,
            maxOutputTokens: maxTokens,
          },
        };

        // Queue the request through the global rate limiter
        const response = await this.rateLimiter.queueRequest(
          'gemini-scan',
          () =>
            axios.post<GeminiResponse>(
              `${this.apiUrl}?key=${this.apiKey}`,
              requestBody,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 30000,
              },
            ),
          'high', // High priority for real-time scans
        );

        const textResponse = response.data.candidates[0]?.content?.parts[0]?.text;

        if (!textResponse) {
          throw new Error('No response from Gemini API');
        }

        // Reset failure count on success
        this.failureCount = Math.max(0, this.failureCount - 1);
        
        const result = this.parseAnalysisResponse(textResponse);
        
        // Cache the successful result for 10 minutes (extended for quota conservation)
        this.cache.set(cacheKey, result, 10 * 60 * 1000);
        
        return result;
        
      } catch (error) {
        const axiosError = error as AxiosError;
        
        // If it's a rate limit error and we have more attempts, try with smaller prompt
        if (axiosError.response?.status === 429 && promptAttempt < 2) {
          this.logger.warn(
            `Rate limit hit on attempt ${promptAttempt + 1}. Trying with more compact prompt...`,
          );
          this.failureCount++;
          await this.sleep(5000); // Short delay before trying smaller prompt
          continue;
        }
        
        // If it's the last attempt or non-rate-limit error, try fallbacks
        if (promptAttempt === 2 || axiosError.response?.status !== 429) {
          if (axiosError.response) {
            this.logger.error(`Gemini API error ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
          }
          this.logger.error('Real-time scan analysis failed, trying Ollama fallback');
          
          // Fallback to Ollama with vision model
          try {
            const isOllamaAvailable = await this.ollamaService.isAvailable();
            if (isOllamaAvailable) {
              this.logger.log('Using Ollama vision fallback for real-time scan');
              const prompt = this.buildRealTimeScanPrompt(0); // Use standard prompt for Ollama
              const ollamaResponse = await this.ollamaService.analyzeImage(base64Image, prompt);
              const result = this.parseAnalysisResponse(ollamaResponse);
              
              // Cache Ollama result with shorter TTL
              this.cache.set(cacheKey, result, 1 * 60 * 1000);
              
              return result;
            }
          } catch (ollamaError) {
            this.logger.error('Ollama fallback also failed', ollamaError);
          }
          
          throw error;
        }
      }
    }
    
    throw new Error('All real-time scan attempts failed');
  }

  /**
   * Build the compressed analysis prompt (~50% token reduction)
   */
  private buildAnalysisPrompt(questionnaire?: Record<string, any>): string {
    return buildCompactAnalysisPrompt(questionnaire);
  }

  /**
   * Build compressed prompt for real-time scan with progressive optimization
   */
  private buildRealTimeScanPrompt(attemptNumber: number = 0): string {
    // Reset failure count if it's been more than 10 minutes since last failure
    const now = Date.now();
    if (this.lastFailureTime && now - this.lastFailureTime > 10 * 60 * 1000) {
      this.failureCount = 0;
      this.lastFailureTime = 0;
    }
    
    // Progressive prompt reduction based on failure count and attempts
    if (this.failureCount >= 3 || attemptNumber >= 2) {
      this.logger.debug('Using minimal scan prompt due to repeated failures');
      return buildMinimalScanPrompt();
    } else if (this.failureCount >= 1 || attemptNumber >= 1) {
      this.logger.debug('Using ultra-compact scan prompt');
      return buildUltraCompactScanPrompt();
    } else {
      return buildUltraCompactScanPrompt(); // Use ultra-compact as default
    }
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
        skinAge: parsed.skinAge || 25,
        healthScore: Math.min(100, Math.max(0, parsed.healthScore || 70)),
        conditions: parsed.conditions || [],
        concerns: parsed.concerns || [],
        recommendations: {
          products: parsed.recommendations?.products || [],
          ingredients: parsed.recommendations?.ingredients || [],
          lifestyle: parsed.recommendations?.lifestyle || [],
          warnings: parsed.recommendations?.warnings || [],
        },
        detailedAnalysis: {
          hydration: parsed.detailedAnalysis?.hydration || {
            score: 70,
            description: 'Normal hydration',
          },
          texture: parsed.detailedAnalysis?.texture || {
            score: 70,
            description: 'Normal texture',
          },
          pores: parsed.detailedAnalysis?.pores || {
            score: 70,
            description: 'Normal pore size',
          },
          pigmentation: parsed.detailedAnalysis?.pigmentation || {
            score: 70,
            description: 'Even tone',
          },
          wrinkles: parsed.detailedAnalysis?.wrinkles || {
            score: 70,
            description: 'Minimal wrinkles',
          },
          acne: parsed.detailedAnalysis?.acne || {
            score: 70,
            description: 'Clear skin',
          },
          redness: parsed.detailedAnalysis?.redness || {
            score: 70,
            description: 'No redness',
          },
          elasticity: parsed.detailedAnalysis?.elasticity || {
            score: 70,
            description: 'Good elasticity',
          },
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
   * Get skincare advice based on conditions with Ollama fallback
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
      const response = await this.makeRequestWithRetry(() =>
        axios.post<GeminiResponse>(
          `${this.apiUrl}?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        ),
      );

      return (
        response.data.candidates[0]?.content?.parts[0]?.text ||
        'Unable to generate advice.'
      );
    } catch (error) {
      this.logger.error('Failed to get skincare advice from Gemini, trying Ollama', error);
      
      try {
        const isOllamaAvailable = await this.ollamaService.isAvailable();
        if (isOllamaAvailable) {
          this.logger.log('Using Ollama fallback for skincare advice');
          return await this.ollamaService.getSkincareAdvice(conditions, concerns);
        }
      } catch (ollamaError) {
        this.logger.error('Ollama fallback also failed', ollamaError);
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
      const response = await this.makeRequestWithRetry(() =>
        axios.post<GeminiResponse>(
          `${this.apiUrl}?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        ),
      );

      return (
        response.data.candidates[0]?.content?.parts[0]?.text ||
        "Je suis désolé, je n'ai pas pu générer une réponse."
      );
    } catch (error) {
      this.logger.error('Failed to generate chat response from Gemini, trying Ollama', error);
      
      try {
        const isOllamaAvailable = await this.ollamaService.isAvailable();
        if (isOllamaAvailable) {
          this.logger.log('Using Ollama fallback for chat');
          return await this.ollamaService.chatSkincare(systemPrompt, conversationHistory, userMessage);
        }
      } catch (ollamaError) {
        this.logger.error('Ollama fallback also failed', ollamaError);
      }
      
      throw error;
    }
  }
}
