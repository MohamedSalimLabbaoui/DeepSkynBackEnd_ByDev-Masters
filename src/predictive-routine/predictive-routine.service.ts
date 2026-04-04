import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosError } from 'axios';
import { GrokService } from '../analysis/services/grok.service';
import {
  compressWhitespace,
  compressWeatherForecast,
  abbrevSkinType,
} from './prompt-compression.util';

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

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

@Injectable()
export class PredictiveRoutineService {
  private readonly logger = new Logger(PredictiveRoutineService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly grokService: GrokService;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    this.grokService = new GrokService(config);
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
        return await requestFn();
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          if (attempt < retries) {
            const delay = this.retryDelay * attempt;
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
      
      // 3. Generate routine with Gemini AI
      const routine = await this.generateWithGemini(
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

  private async generateWithGemini(
    analysisResult: AnalysisResult,
    weatherData: WeatherForecast,
    cyclePhase: string | null,
    products: string[] | null,
  ): Promise<GeneratedRoutine> {
    if (!this.apiKey) {
      this.logger.warn('Gemini API not configured, using fallback');
      return this.getFallbackRoutine(analysisResult.skinType);
    }

    try {
      // Compressed weather format: L31:uv,rain,temp|Ma1:uv,rain,temp|...
      const weatherSummary = compressWeatherForecast(weatherData.daily);
      const st = abbrevSkinType(analysisResult.skinType);
      const issues = analysisResult.detectedIssues.slice(0, 3).join(',') || '-';
      const prods = products?.slice(0, 5).join(',') || '-';

      // Compressed prompt - ~55% token reduction
      const prompt = compressWhitespace(`
Dermato/cosmeto expert. Routine prédictive 7j.
Peau:${st},${analysisResult.condition},${issues}
Météo7j(jour:uv,pluie,temp):${weatherSummary}
Cycle:${cyclePhase || '-'}
Produits:${prods}
Rép JSON strict:{days:[{day,morning:[],evening:[],tip,warning}],globalAdvice}
Français, 7 jours.`);

      this.logger.log('Calling Gemini API with compressed prompt...');

      const response = await this.makeRequestWithRetry(() =>
        axios.post<GeminiResponse>(
          `${this.apiUrl}?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
          },
        ),
      );

      const textResponse = response.data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      let jsonText = textResponse.trim();
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }

      const routine = JSON.parse(jsonText) as GeneratedRoutine;

      if (!routine.days || !Array.isArray(routine.days) || routine.days.length === 0) {
        throw new Error('Invalid routine structure');
      }

      this.logger.log('Gemini AI routine generated successfully');
      return routine;
    } catch (error) {
      this.logger.error(`Gemini API failed: ${error.message}, trying OpenRouter fallback`, error.stack);
      
      try {
        const isGrokAvailable = await this.grokService.isAvailable();
        if (isGrokAvailable) {
          this.logger.log('Using OpenRouter fallback for predictive routine');
          const weatherSummary = compressWeatherForecast(weatherData.daily);
          const st = abbrevSkinType(analysisResult.skinType);
          const issues = analysisResult.detectedIssues.slice(0, 3).join(',') || '-';
          const prods = products?.slice(0, 5).join(',') || '-';
          
          const prompt = compressWhitespace(`
Dermato/cosmeto expert. Routine prédictive 7j.
Peau:${st},${analysisResult.condition},${issues}
Météo7j(jour:uv,pluie,temp):${weatherSummary}
Cycle:${cyclePhase || '-'}
Produits:${prods}
Rép JSON strict:{days:[{day,morning:[],evening:[],tip,warning}],globalAdvice}
Français, 7 jours.`);

          const grokResponse = await this.grokService.generate(prompt);
          
          let jsonText = grokResponse.trim();
          if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0].trim();
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0].trim();
          }
          
          const routine = JSON.parse(jsonText) as GeneratedRoutine;
          if (routine.days && Array.isArray(routine.days) && routine.days.length > 0) {
            this.logger.log('OpenRouter routine generated successfully');
            return routine;
          }
        }
      } catch (grokError) {
        this.logger.error('OpenRouter fallback also failed', grokError);
      }
      
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

  /**
   * Valider et activer une routine prédictive
   * Convertit une routine prédictive en routine standard active
   */
  async validateAndActivateRoutine(
    userId: string,
    predictiveRoutineId: string,
  ): Promise<{ success: boolean; routineId: string; message: string }> {
    try {
      // 1. Récupérer la routine prédictive
      const predictiveRoutine = await this.prisma.predictiveRoutine.findUnique({
        where: { id: predictiveRoutineId },
      });

      if (!predictiveRoutine) {
        throw new HttpException(
          'Routine prédictive non trouvée',
          HttpStatus.NOT_FOUND,
        );
      }

      if (predictiveRoutine.userId !== userId) {
        throw new HttpException(
          'Non autorisé à valider cette routine',
          HttpStatus.FORBIDDEN,
        );
      }

      // 2. Extraire les données de la routine
      const routineData = predictiveRoutine.routine as any;
      const generatedRoutine = routineData as GeneratedRoutine;

      if (!generatedRoutine.days || generatedRoutine.days.length === 0) {
        throw new HttpException(
          'Routine prédictive invalide',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Désactiver toutes les routines actives de l'utilisateur
      await this.prisma.routine.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 4. Mapping des catégories pour chaque type d'étape
      const categoryMapping: Record<string, { category: string; duration: number }> = {
        'nettoyage': { category: 'cleanser', duration: 60 },
        'nettoyant': { category: 'cleanser', duration: 60 },
        'démaquillage': { category: 'cleanser', duration: 60 },
        'démaquillant': { category: 'cleanser', duration: 60 },
        'gel': { category: 'cleanser', duration: 60 },
        'lait': { category: 'cleanser', duration: 60 },
        'huile': { category: 'cleanser', duration: 45 },
        'tonique': { category: 'toner', duration: 30 },
        'lotion': { category: 'toner', duration: 30 },
        'sérum': { category: 'serum', duration: 30 },
        'vitamine': { category: 'serum', duration: 30 },
        'acide': { category: 'treatment', duration: 30 },
        'rétinol': { category: 'treatment', duration: 30 },
        'contour': { category: 'treatment', duration: 20 },
        'yeux': { category: 'treatment', duration: 20 },
        'crème': { category: 'moisturizer', duration: 30 },
        'hydratant': { category: 'moisturizer', duration: 30 },
        'moisturizer': { category: 'moisturizer', duration: 30 },
        'spf': { category: 'sunscreen', duration: 30 },
        'solaire': { category: 'sunscreen', duration: 30 },
        'protection': { category: 'sunscreen', duration: 30 },
        'masque': { category: 'mask', duration: 900 },
        'exfoliant': { category: 'treatment', duration: 60 },
        'gommage': { category: 'treatment', duration: 60 },
      };

      // Fonction pour déterminer la catégorie et la durée
      const getCategoryAndDuration = (stepName: string): { category: string; duration: number } => {
        const lowerName = stepName.toLowerCase();
        for (const [key, value] of Object.entries(categoryMapping)) {
          if (lowerName.includes(key)) {
            return value;
          }
        }
        return { category: 'treatment', duration: 30 };
      };

      // Fonction pour créer une étape formatée
      const createStep = (stepName: string, order: number) => {
        const { category, duration } = getCategoryAndDuration(stepName);
        return {
          order,
          name: this.extractStepName(stepName),
          description: stepName,
          category,
          duration,
          isCompleted: false,
        };
      };

      // 5. Créer les routines matin et soir séparément
      const morningStepsOrdered: string[] = [];
      const eveningStepsOrdered: string[] = [];

      // Utiliser le premier jour comme référence pour l'ordre des étapes
      if (generatedRoutine.days.length > 0) {
        const firstDay = generatedRoutine.days[0];
        firstDay.morning.forEach((step) => {
          if (!morningStepsOrdered.includes(step)) {
            morningStepsOrdered.push(step);
          }
        });
        firstDay.evening.forEach((step) => {
          if (!eveningStepsOrdered.includes(step)) {
            eveningStepsOrdered.push(step);
          }
        });
      }

      // Créer les étapes formatées pour le matin
      const morningFormattedSteps = morningStepsOrdered.map((step, index) => 
        createStep(step, index + 1)
      );

      // Créer les étapes formatées pour le soir
      const eveningFormattedSteps = eveningStepsOrdered.map((step, index) => 
        createStep(step, index + 1)
      );

      // 6. Créer la routine du matin (AM)
      const morningRoutine = await this.prisma.routine.create({
        data: {
          userId,
          name: `Routine Matin IA - ${new Date().toLocaleDateString('fr-FR')}`,
          type: 'AM',
          steps: morningFormattedSteps as any,
          notes: `${generatedRoutine.globalAdvice}\n\nRoutine générée automatiquement par l'IA dermatologique.`,
          isActive: true,
          isAIGenerated: true,
        },
      });

      // 7. Créer la routine du soir (PM)
      const eveningRoutine = await this.prisma.routine.create({
        data: {
          userId,
          name: `Routine Soir IA - ${new Date().toLocaleDateString('fr-FR')}`,
          type: 'PM',
          steps: eveningFormattedSteps as any,
          notes: `${generatedRoutine.globalAdvice}\n\nRoutine générée automatiquement par l'IA dermatologique.`,
          isActive: true,
          isAIGenerated: true,
        },
      });

      this.logger.log(
        `Predictive routine ${predictiveRoutineId} validated. Created AM routine ${morningRoutine.id} and PM routine ${eveningRoutine.id}`,
      );

      return {
        success: true,
        routineId: morningRoutine.id,
        message: 'Routines matin et soir créées et activées avec succès',
      };
    } catch (error) {
      this.logger.error(
        `Error validating routine: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la validation de la routine',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extrait le nom court d'une étape
   */
  private extractStepName(fullStep: string): string {
    // Mapping des noms courts pour les étapes communes
    const shortNames: Record<string, string> = {
      'nettoyage doux': 'Nettoyage',
      'nettoyage gel': 'Nettoyage',
      'nettoyant doux': 'Nettoyant',
      'gel nettoyant': 'Gel nettoyant',
      'gel moussant': 'Gel moussant',
      'lait nettoyant': 'Lait nettoyant',
      'démaquillage': 'Démaquillage',
      'eau micellaire': 'Eau micellaire',
      'huile démaquillante': 'Huile démaquillante',
      'tonique': 'Tonique',
      'lotion tonique': 'Tonique',
      'sérum': 'Sérum',
      'sérum vitamine c': 'Sérum Vitamine C',
      'acide hyaluronique': 'Acide hyaluronique',
      'acide salicylique': 'Acide salicylique',
      'rétinol': 'Rétinol',
      'contour des yeux': 'Contour des yeux',
      'crème hydratante': 'Hydratant',
      'crème de nuit': 'Crème de nuit',
      'crème légère': 'Hydratant léger',
      'spf': 'Protection solaire',
      'protection solaire': 'Protection solaire',
      'crème solaire': 'Protection solaire',
      'masque': 'Masque',
      'exfoliant': 'Exfoliant',
      'gommage': 'Gommage',
    };
    
    const lowerStep = fullStep.toLowerCase();
    
    // Chercher une correspondance exacte ou partielle
    for (const [key, value] of Object.entries(shortNames)) {
      if (lowerStep.includes(key)) {
        return value;
      }
    }
    
    // Sinon, nettoyer le texte et capitaliser
    const cleanStep = fullStep
      .replace(/^(nettoyage|démaquillage|application)\s+(de\s+|d'|du\s+|de la\s+)?/i, '')
      .replace(/\s+(doux|léger|hydratant|purifiant|matifiant|équilibrant|nourrissant|réparateur)$/i, '')
      .trim();
    
    if (cleanStep.length > 0) {
      return cleanStep.charAt(0).toUpperCase() + cleanStep.slice(1);
    }
    
    return fullStep.charAt(0).toUpperCase() + fullStep.slice(1);
  }
}
