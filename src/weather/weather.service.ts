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
  private readonly grokService: GrokService;

  constructor(private readonly configService: ConfigService) {
    this.grokService = new GrokService(configService);
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
   * Générer un conseil météo personnalisé via OpenRouter
   */
  async generateWeatherAdvice(data: WeatherAdviceInput): Promise<{
    advice: string;
    emoji: string;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const prompt = this.buildWeatherPrompt(data);
    const urgencyLevel = this.calculateUrgency(data);

    // OpenRouter only
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
