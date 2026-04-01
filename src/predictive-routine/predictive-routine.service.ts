import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

interface AnalysisResult {
  condition: string;
  detectedIssues: string[];
  skinType: string;
}

interface WeatherForecast {
  daily: {
    time: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
  };
}

export interface RoutineDay {
  day: string;
  morning: string[];
  evening: string[];
  tip: string;
  warning: string | null;
}

export interface GeneratedRoutine {
  days: RoutineDay[];
  globalAdvice: string;
}

@Injectable()
export class PredictiveRoutineService {
  private readonly logger = new Logger(PredictiveRoutineService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async generatePredictiveRoutine(
    userId: string,
    analysisId: string,
    analysisResult: AnalysisResult,
    latitude: number,
    longitude: number,
  ) {
    try {
      this.logger.log(`Generating predictive routine for user ${userId}, analysis ${analysisId}`);

      // 1. Fetch 7-day weather forecast
      const weatherData = await this.fetchWeatherForecast(latitude, longitude);
      
      // 2. Get user profile (optional: cycle phase, products)
      const userProfile = await this.getUserProfile(userId);
      
      // 3. Generate routine with Claude AI
      const routine = await this.generateWithClaude(
        analysisResult,
        weatherData,
        userProfile.cyclePhase,
        userProfile.products,
      );

      // 4. Calculate expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 5. Save to database
      const savedRoutine = await this.prisma.predictiveRoutine.create({
        data: {
          userId,
          analysisId,
          routine: routine as any,
          weatherData: weatherData as any,
          expiresAt,
        },
      });

      this.logger.log(`Predictive routine saved with ID ${savedRoutine.id}`);

      return {
        id: savedRoutine.id,
        routine,
        generatedAt: savedRoutine.generatedAt,
        expiresAt: savedRoutine.expiresAt,
      };
    } catch (error) {
      this.logger.error(`Error generating predictive routine: ${error.message}`, error.stack);
      
      // Fallback: return a static routine based on skin type
      const fallbackRoutine = this.getFallbackRoutine(analysisResult.skinType);
      
      return {
        id: 'fallback',
        routine: fallbackRoutine,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    }
  }

  private async fetchWeatherForecast(
    latitude: number,
    longitude: number,
  ): Promise<WeatherForecast> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=uv_index_max,precipitation_sum,temperature_2m_max&forecast_days=7&timezone=auto`;
      
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      
      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.logger.warn(`Weather API failed: ${error.message}, using default data`);
      
      // Return default weather data
      return {
        daily: {
          time: Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          }),
          uv_index_max: [5, 5, 6, 4, 5, 6, 5],
          precipitation_sum: [0, 2, 0, 5, 0, 0, 1],
          temperature_2m_max: [20, 22, 21, 19, 23, 24, 22],
        },
      };
    }
  }

  private async getUserProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          settings: true,
          skinProfile: {
            select: {
              skinType: true,
              concerns: true,
            },
          },
        },
      });

      const settings = user?.settings as any;
      const cyclePhase = settings?.cyclePhase || null;
      const products = settings?.savedProducts || null;

      return { cyclePhase, products };
    } catch (error) {
      this.logger.warn(`Error fetching user profile: ${error.message}`);
      return { cyclePhase: null, products: null };
    }
  }

  private async generateWithClaude(
    analysisResult: AnalysisResult,
    weatherData: WeatherForecast,
    cyclePhase: string | null,
    products: string[] | null,
  ): Promise<GeneratedRoutine> {
    if (!this.anthropic) {
      this.logger.warn('Claude API not configured, using fallback');
      return this.getFallbackRoutine(analysisResult.skinType);
    }

    try {
      // Format weather summary
      const weatherSummary = this.formatWeatherSummary(weatherData);

      // Build user prompt
      const userPrompt = `État de peau actuel: ${analysisResult.condition}, problèmes détectés: ${analysisResult.detectedIssues.join(', ')}, type de peau: ${analysisResult.skinType}.
Prévisions météo 7 jours: ${weatherSummary}.
Phase du cycle: ${cyclePhase || 'non renseigné'}.
Produits disponibles: ${products?.join(', ') || 'non renseignés'}.
Génère la routine prédictive 7 jours en JSON strict.`;

      const systemPrompt = `Tu es un expert dermatologue et cosmétologue. 
Tu génères des routines de soin cutané personnalisées et prédictives.
Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après.
Format exact:
{
  "days": [
    {
      "day": "Lundi 31 Mars",
      "morning": ["étape 1", "étape 2"],
      "evening": ["étape 1", "étape 2"],
      "tip": "conseil spécifique du jour",
      "warning": "alerte si UV élevé ou pluie etc (null si rien)"
    }
  ],
  "globalAdvice": "conseil général pour la semaine"
}`;

      this.logger.log('Calling Claude API...');

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const responseText = content.text.trim();
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        jsonText = responseText.split('```')[1].split('```')[0].trim();
      }

      const routine = JSON.parse(jsonText) as GeneratedRoutine;

      // Validate structure
      if (!routine.days || !Array.isArray(routine.days) || routine.days.length === 0) {
        throw new Error('Invalid routine structure');
      }

      this.logger.log('Claude AI routine generated successfully');
      return routine;
    } catch (error) {
      this.logger.error(`Claude API failed: ${error.message}`, error.stack);
      return this.getFallbackRoutine(analysisResult.skinType);
    }
  }

  private formatWeatherSummary(weatherData: WeatherForecast): string {
    const summaries: string[] = [];
    
    for (let i = 0; i < weatherData.daily.time.length; i++) {
      const date = new Date(weatherData.daily.time[i]);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      const uv = weatherData.daily.uv_index_max[i];
      const rain = weatherData.daily.precipitation_sum[i];
      const temp = weatherData.daily.temperature_2m_max[i];
      
      summaries.push(`${dayName}: ${temp}°C, UV ${uv}, ${rain}mm pluie`);
    }
    
    return summaries.join(' | ');
  }

  private getFallbackRoutine(skinType: string): GeneratedRoutine {
    const days: RoutineDay[] = [];
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = `${dayNames[i]} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`;
      
      let morning: string[];
      let evening: string[];
      let tip: string;
      
      if (skinType === 'oily' || skinType === 'grasse') {
        morning = [
          "Nettoyage doux avec gel moussant",
          "Tonique purifiant",
          "Sérum matifiant",
          "Crème légère non comédogène",
          "SPF 50+ texture fluide"
        ];
        evening = [
          "Démaquillage à l'eau micellaire",
          "Nettoyage gel purifiant",
          "Sérum à l'acide salicylique",
          "Crème hydratante légère"
        ];
        tip = "Évitez de toucher votre visage en journée pour réduire l'excès de sébum.";
      } else if (skinType === 'dry' || skinType === 'sèche') {
        morning = [
          "Nettoyage doux au lait",
          "Tonique hydratant",
          "Sérum à l'acide hyaluronique",
          "Crème riche nourrissante",
          "SPF 50+"
        ];
        evening = [
          "Démaquillage à l'huile",
          "Nettoyage doux",
          "Sérum hydratant",
          "Crème de nuit réparatrice",
          "Huile végétale (optionnel)"
        ];
        tip = "Buvez au moins 2L d'eau par jour et utilisez un humidificateur la nuit.";
      } else {
        // Mixed/Normal skin
        morning = [
          "Nettoyage gel doux",
          "Tonique équilibrant",
          "Sérum vitamine C",
          "Crème hydratante légère",
          "SPF 50+"
        ];
        evening = [
          "Démaquillage biphasé",
          "Nettoyage doux",
          "Sérum rétinol (2-3x/semaine)",
          "Crème de nuit équilibrante"
        ];
        tip = "Alternez les zones T et joues selon leurs besoins spécifiques.";
      }
      
      days.push({
        day: dayName,
        morning,
        evening,
        tip,
        warning: i === 2 ? "UV élevé prévu, renforcez la protection solaire" : null,
      });
    }
    
    return {
      days,
      globalAdvice: `Cette routine de base est adaptée pour une peau ${skinType}. Ajustez selon vos réactions cutanées et consultez un dermatologue si nécessaire.`,
    };
  }
}
