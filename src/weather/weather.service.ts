// Service backend pour générer des conseils météo via OpenRouter (GrokService)
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GrokService } from '../analysis/services/grok.service';

export interface WeatherAdviceInput {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  city?: string;
  country?: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly vertexApiKeys: string[];
  private readonly vertexModels: string[];
  private readonly vertexBaseUrl =
    'https://aiplatform.googleapis.com/v1/publishers/google/models';
  private readonly geminiApiKeys: string[];
  private readonly geminiModels: string[];
  private readonly geminiBaseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly maxRetries = 2;
  private readonly retryDelay = 1500;
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
        'Weather Vertex resilience is limited. Configure VERTEX_API_KEY and VERTEX_API_KEY_2.',
      );
    }

    if (this.geminiApiKeys.length < 2) {
      this.logger.warn(
        'Weather Gemini resilience is limited. Configure GEMINI_API_KEY and GEMINI_API_KEY_2.',
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableStatus(status?: number): boolean {
    return status === 429 || status === 500 || status === 503;
  }

  private async requestVertexAdvice(prompt: string): Promise<string> {
    if (this.vertexApiKeys.length === 0) {
      throw new Error('No Vertex API key configured');
    }

    for (const model of this.vertexModels) {
      for (let keyIndex = 0; keyIndex < this.vertexApiKeys.length; keyIndex++) {
        const apiKey = this.vertexApiKeys[keyIndex];
        const url = `${this.vertexBaseUrl}/${model}:generateContent?key=${apiKey}`;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            const response = await axios.post(
              url,
              {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.6,
                  maxOutputTokens: 1024,
                },
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
              },
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return text;
            }
          } catch (error) {
            const status = (error as any)?.response?.status as number | undefined;
            this.logger.warn(
              `Vertex weather failed (model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`,
            );

            if (this.isRetryableStatus(status) && attempt < this.maxRetries) {
              await this.sleep(this.retryDelay * attempt);
              continue;
            }
          }
        }
      }
    }

    throw new Error('All Vertex weather candidates failed');
  }

  private async requestGeminiAdvice(prompt: string): Promise<string> {
    if (this.geminiApiKeys.length === 0) {
      throw new Error('No Gemini API key configured');
    }

    for (const model of this.geminiModels) {
      for (let keyIndex = 0; keyIndex < this.geminiApiKeys.length; keyIndex++) {
        const apiKey = this.geminiApiKeys[keyIndex];
        const url = `${this.geminiBaseUrl}/${model}:generateContent?key=${apiKey}`;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            const response = await axios.post(
              url,
              {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.6,
                  maxOutputTokens: 1024,
                },
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
              },
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return text;
            }
          } catch (error) {
            const status = (error as any)?.response?.status as number | undefined;
            this.logger.warn(
              `Gemini weather failed (model=${model}, key#${keyIndex + 1}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`,
            );

            if (this.isRetryableStatus(status) && attempt < this.maxRetries) {
              await this.sleep(this.retryDelay * attempt);
              continue;
            }
          }
        }
      }
    }

    throw new Error('All Gemini weather candidates failed');
  }

  /**
   * Get user location from IP address (backend-side)
   * No CORS issues when called from backend
   */
  async getLocationFromIP(): Promise<{
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }> {
    try {
      // Use ipapi.co (no key required, 30k requests/month free)
      const response = await axios.get('https://ipapi.co/json/', {
        timeout: 5000,
      });

      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        city: response.data.city,
        country: response.data.country_name,
      };
    } catch (error) {
      this.logger.warn('IP-based geolocation failed', error);
      // Fallback to default location
      return {
        latitude: 36.8065,
        longitude: 10.1657,
        city: 'Tunis',
        country: 'Tunisia',
      };
    }
  }


  /**
   * Générer un conseil météo personnalisé via Vertex -> Gemini -> OpenRouter
   */
  async generateWeatherAdvice(data: WeatherAdviceInput): Promise<{
    advice: string;
    emoji: string;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const prompt = this.buildWeatherPrompt(data);
    const urgencyLevel = this.calculateUrgency(data);

    // Vertex first
    if (this.vertexApiKeys.length > 0) {
      try {
        this.logger.log('Using Vertex AI for weather advice');
        const vertexResponse = await this.requestVertexAdvice(prompt);
        const parsed = this.parseAdviceResponse(vertexResponse);

        return {
          advice: parsed.advice,
          emoji: parsed.emoji,
          urgency: urgencyLevel,
        };
      } catch (vertexError) {
        this.logger.warn('Vertex weather advice failed, trying Gemini', vertexError);
      }
    }

    // Gemini fallback
    if (this.geminiApiKeys.length > 0) {
      try {
        this.logger.log('Using Gemini fallback for weather advice');
        const geminiResponse = await this.requestGeminiAdvice(prompt);
        const parsed = this.parseAdviceResponse(geminiResponse);

        return {
          advice: parsed.advice,
          emoji: parsed.emoji,
          urgency: urgencyLevel,
        };
      } catch (geminiError) {
        this.logger.warn('Gemini weather advice failed, trying OpenRouter', geminiError);
      }
    }

    // OpenRouter fallback
    try {
      const isGrokAvailable = await this.grokService.isAvailable();
      if (isGrokAvailable) {
        this.logger.log('Using OpenRouter for weather advice');
        const grokResponse = await this.grokService.generate(prompt);
        const parsed = this.parseAdviceResponse(grokResponse);
        
        return {
          advice: parsed.advice,
          emoji: parsed.emoji,
          urgency: urgencyLevel,
        };
      }
    } catch (grokError) {
      this.logger.error('OpenRouter weather advice failed', grokError);
    }

    // Final local fallback
    return {
      advice: this.generateFallbackAdvice(data),
      emoji: '🌍',
      urgency: urgencyLevel,
    };
  }

  /**
   * Construire le prompt pour le modèle OpenRouter
   */
  private buildWeatherPrompt(data: WeatherAdviceInput): string {
    return `Tu es un expert en soins de la peau et météorologie. Basé sur les conditions météorologiques actuelles, génère un conseil personnalisé et actionnable pour les soins de la peau.

Conditions météorologiques à ${data.city || 'votre localisation'}, ${data.country || ''}:
- Température: ${data.temperature}°C
- Condition: ${data.condition}
- Humidité: ${data.humidity}%
- Vitesse du vent: ${data.windSpeed} km/h
- Indice UV: ${data.uvIndex}

Réponds UNIQUEMENT en JSON valide (pas de texte avant/après):
{
  "advice": "Conseil concis et pratique adapté aux conditions (1-2 phrases max, en français)",
  "emoji": "Un emoji approprié"
}

Le conseil doit:
- Être spécifique aux conditions météorologiques actuelles
- Donner des recommandations concrètes de soins de la peau
- Être actionnable immédiatement
- Être en français
- Utiliser un ton amical et encourageant`;
  }

  /**
   * Calculer le niveau d'urgence basé sur les conditions
   */
  private calculateUrgency(data: WeatherAdviceInput): 'low' | 'medium' | 'high' {
    let urgencyScore = 0;

    // Température extrême
    if (data.temperature < 0 || data.temperature > 35) urgencyScore += 3;
    else if (data.temperature < 5 || data.temperature > 30) urgencyScore += 1;

    // Humidité anormale
    if (data.humidity < 20 || data.humidity > 80) urgencyScore += 2;

    // Vent fort
    if (data.windSpeed > 30) urgencyScore += 2;
    else if (data.windSpeed > 20) urgencyScore += 1;

    // UV élevé
    if (data.uvIndex > 7) urgencyScore += 2;
    else if (data.uvIndex > 5) urgencyScore += 1;

    // Conditions extrêmes
    if (
      data.condition === 'heavy_rain' ||
      data.condition === 'thunderstorm' ||
      data.condition === 'thunderstorm_heavy'
    )
      urgencyScore += 3;
    else if (data.condition === 'heavy_snow') urgencyScore += 2;

    if (urgencyScore >= 6) return 'high';
    if (urgencyScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Parser la réponse JSON du modèle
   */
  private parseAdviceResponse(response: string): {
    advice: string;
    emoji: string;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        advice: parsed.advice || 'Prenez soin de votre peau!',
        emoji: parsed.emoji || '🌍',
      };
    } catch (error) {
      this.logger.error('Failed to parse advice response', error);
      return {
        advice: 'Prenez soin de votre peau selon vos besoins!',
        emoji: '🌍',
      };
    }
  }

  /**
   * Conseil par défaut si OpenRouter échoue
   */
  private generateFallbackAdvice(data: WeatherAdviceInput): string {
    if (data.temperature < 0) {
      return `À ${data.temperature}°C, protégez votre peau du froid! Appliquez une crème hydratante riche sur le visage et les mains.`;
    }
    if (data.temperature > 30) {
      return `Avec une température de ${data.temperature}°C, maintenez une bonne hydratation! Buvez régulièrement de l'eau et appliquez un sérum hydratant léger.`;
    }
    if (data.uvIndex > 7) {
      return `L'indice UV est élevé (${data.uvIndex})! Utilisez un SPF 50+ et réappliquez toutes les 2 heures.`;
    }
    if (data.humidity > 80) {
      return `L'humidité est très élevée (${data.humidity}%). Utilisez des sérums légers plutôt que des crèmes lourdes.`;
    }
    if (data.humidity < 20) {
      return `L'air est très sec (${data.humidity}%). Privilégiez les hydratants riches et appliquez un baume à lèvres SPF.`;
    }
    if (data.windSpeed > 30) {
      return `Le vent est fort (${data.windSpeed} km/h). Limitez votre exposition et appliquez une crème protectrice.`;
    }
    return `Les conditions à ${data.city || 'votre localisation'} sont ${
      data.condition === 'clear'
        ? 'belles'
        : data.condition === 'overcast'
          ? 'nuageuses'
          : 'changeantes'
    }. Maintenez une routine régulière de soins.`;
  }
}
