import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkinLogDto, WeatherAlertQueryDto } from './dto';
import axios from 'axios';

export interface WeatherData {
  uvIndex: number;
  aqi: number | null;
  humidity: number | null;
  temperature: number | null;
  weatherCode?: number;
  weatherDescription?: string;
}

export interface AIAdvice {
  personalizedMessage: string;
  skinCareRoutine: string[];
  productsToUse: string[];
  warnings: string[];
  protectionLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export interface AlertResult {
  alert: {
    id: string;
    type: string;
    message: string;
    severity: string;
    date: Date;
  } | null;
  weather: WeatherData;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  aiAdvice?: AIAdvice;
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

@Injectable()
export class ContextualAnalysisService {
  private readonly logger = new Logger(ContextualAnalysisService.name);
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl: string;
  private readonly ollamaBaseUrl: string;
  private readonly ollamaTextModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.geminiApiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
    this.ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.ollamaTextModel = this.configService.get<string>('OLLAMA_TEXT_MODEL') || 'llama3:8b';
  }

  /**
   * Check if Ollama is available
   */
  private async isOllamaAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Generate with Ollama fallback
   */
  private async generateWithOllama(prompt: string): Promise<string> {
    const response = await axios.post<OllamaGenerateResponse>(
      `${this.ollamaBaseUrl}/api/generate`,
      {
        model: this.ollamaTextModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1024,
        },
      },
      { timeout: 60000 },
    );

    if (response.data?.response) {
      return response.data.response;
    }

    throw new Error('Empty response from Ollama');
  }

  /**
   * Fetch weather data from Open-Meteo and generate skin alerts with AI advice
   */
  async getWeatherAlert(
    userId: string,
    query: WeatherAlertQueryDto,
  ): Promise<AlertResult> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    try {
      const { latitude, longitude, city, country } = query;

      // Fetch weather data from Open-Meteo (REAL API)
      const weatherData = await this.fetchWeatherData(latitude, longitude);

      // Get user's skin profile for personalized AI advice
      const skinProfile = await this.prisma.skinProfile.findUnique({
        where: { userId },
      });

      // Log weather data (only if successful)
      try {
        await this.prisma.weatherLog.create({
          data: {
            userId,
            latitude,
            longitude,
            city,
            country,
            uvIndex: weatherData.uvIndex,
            aqi: weatherData.aqi,
            humidity: weatherData.humidity,
            temperature: weatherData.temperature,
          },
        });
      } catch (logError) {
        this.logger.warn('Failed to log weather data', logError);
      }

      // Generate alert if needed
      const alert = await this.generateWeatherAlert(userId, weatherData, city);

      // Generate AI-powered personalized advice
      let aiAdvice: AIAdvice | undefined;
      try {
        aiAdvice = await this.generateAIAdvice(weatherData, skinProfile, city);
      } catch (error) {
        this.logger.warn('Failed to generate AI advice, using fallback', error);
        aiAdvice = this.getFallbackAdvice(weatherData);
      }

      return {
        alert,
        weather: weatherData,
        location: { latitude, longitude, city, country },
        aiAdvice,
      };
    } catch (error) {
      this.logger.error('Weather alert service failed, returning fallback', error);
      
      // Return fallback response instead of 500
      const { latitude, longitude, city, country } = query;
      const fallbackWeather: WeatherData = {
        uvIndex: 5, // Medium UV
        aqi: null,
        humidity: 50,
        temperature: 20,
      };

      return {
        alert: {
          id: 'fallback',
          type: 'info',
          message: 'Les données météo sont temporairement indisponibles. Appliquez une protection solaire par précaution.',
          severity: 'medium',
          date: new Date(),
        },
        weather: fallbackWeather,
        location: { latitude, longitude, city, country },
        aiAdvice: this.getFallbackAdvice(fallbackWeather),
      };
    }
  }

  /**
   * Generate personalized skincare advice using Gemini AI
   */
  private async generateAIAdvice(
    weather: WeatherData,
    skinProfile: { skinType?: string; concerns?: string[]; fitzpatrickType?: number } | null,
    city?: string,
  ): Promise<AIAdvice> {
    if (!this.geminiApiKey) {
      return this.getFallbackAdvice(weather);
    }

    const skinInfo = skinProfile
      ? `Type de peau: ${skinProfile.skinType || 'non défini'}, Préoccupations: ${skinProfile.concerns?.join(', ') || 'aucune'}, Phototype Fitzpatrick: ${skinProfile.fitzpatrickType || 'non défini'}`
      : 'Profil de peau non disponible';

    const prompt = `Tu es un expert dermatologue. Génère des conseils skincare personnalisés en français basés sur ces données météo EN TEMPS RÉEL et le profil de peau de l'utilisateur.

DONNÉES MÉTÉO ACTUELLES${city ? ` à ${city}` : ''}:
- Indice UV: ${weather.uvIndex}/11 (${this.getUvLevelText(weather.uvIndex)})
- Qualité de l'air (AQI): ${weather.aqi !== null ? weather.aqi : 'non disponible'}
- Humidité: ${weather.humidity !== null ? weather.humidity + '%' : 'non disponible'}
- Température: ${weather.temperature !== null ? weather.temperature + '°C' : 'non disponible'}

PROFIL UTILISATEUR:
${skinInfo}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "personalizedMessage": "Message personnalisé de 2-3 phrases max expliquant l'impact de la météo sur la peau aujourd'hui",
  "skinCareRoutine": ["étape 1", "étape 2", "étape 3"],
  "productsToUse": ["type de produit 1", "type de produit 2"],
  "warnings": ["alerte importante si nécessaire"],
  "protectionLevel": "low|medium|high|extreme"
}`;

    try {
      const response = await axios.post(
        `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        },
        { timeout: 15000 },
      );

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty Gemini response');
      }

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as AIAdvice;
      return parsed;
    } catch (error) {
      this.logger.error('Gemini AI advice generation failed, trying Ollama fallback', error);
      
      // Fallback to Ollama
      try {
        const isOllamaAvailable = await this.isOllamaAvailable();
        if (isOllamaAvailable) {
          this.logger.log('Using Ollama fallback for AI advice');
          const ollamaResponse = await this.generateWithOllama(prompt);
          
          const jsonMatch = ollamaResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as AIAdvice;
            this.logger.log('Ollama AI advice generated successfully');
            return parsed;
          }
        }
      } catch (ollamaError) {
        this.logger.error('Ollama fallback also failed', ollamaError);
      }
      
      return this.getFallbackAdvice(weather);
    }
  }

  /**
   * Fallback advice when AI is unavailable
   */
  private getFallbackAdvice(weather: WeatherData): AIAdvice {
    const uvLevel = weather.uvIndex;
    let protectionLevel: AIAdvice['protectionLevel'] = 'low';
    const skinCareRoutine: string[] = [];
    const productsToUse: string[] = [];
    const warnings: string[] = [];

    // UV-based recommendations
    if (uvLevel >= 8) {
      protectionLevel = 'extreme';
      skinCareRoutine.push('Applique une protection solaire SPF 50+ généreusement');
      skinCareRoutine.push('Réapplique toutes les 2 heures');
      productsToUse.push('Écran solaire SPF 50+ résistant à l\'eau');
      productsToUse.push('Sérum antioxydant (Vitamine C)');
      warnings.push('Évite l\'exposition directe entre 11h et 16h');
    } else if (uvLevel >= 6) {
      protectionLevel = 'high';
      skinCareRoutine.push('Applique une protection solaire SPF 50+');
      productsToUse.push('Écran solaire SPF 50+');
      productsToUse.push('Chapeau et lunettes de soleil');
    } else if (uvLevel >= 3) {
      protectionLevel = 'medium';
      skinCareRoutine.push('Applique une protection solaire SPF 30+');
      productsToUse.push('Crème hydratante avec SPF 30');
    }

    // Humidity-based recommendations
    if (weather.humidity !== null) {
      if (weather.humidity < 30) {
        skinCareRoutine.push('Utilise un sérum hydratant à l\'acide hyaluronique');
        productsToUse.push('Sérum hydratant');
        productsToUse.push('Crème riche et occlusive');
      } else if (weather.humidity > 80) {
        skinCareRoutine.push('Privilégie des textures légères');
        productsToUse.push('Gel hydratant léger');
      }
    }

    // AQI-based recommendations
    if (weather.aqi !== null && weather.aqi > 75) {
      skinCareRoutine.push('Double nettoyage ce soir');
      productsToUse.push('Huile démaquillante');
      productsToUse.push('Sérum anti-pollution aux antioxydants');
      if (weather.aqi > 100) {
        warnings.push('Qualité de l\'air très dégradée - limite les sorties');
      }
    }

    const personalizedMessage = this.buildFallbackMessage(weather);

    return {
      personalizedMessage,
      skinCareRoutine: skinCareRoutine.length > 0 ? skinCareRoutine : ['Continue ta routine habituelle'],
      productsToUse: productsToUse.length > 0 ? productsToUse : ['Ta crème hydratante habituelle'],
      warnings,
      protectionLevel,
    };
  }

  /**
   * Build fallback message based on weather
   */
  private buildFallbackMessage(weather: WeatherData): string {
    const parts: string[] = [];

    if (weather.uvIndex >= 6) {
      parts.push(`Attention, indice UV élevé (${weather.uvIndex}/11) aujourd'hui`);
    }
    if (weather.aqi !== null && weather.aqi > 75) {
      parts.push(`qualité de l'air dégradée (AQI: ${weather.aqi})`);
    }
    if (weather.humidity !== null && weather.humidity < 30) {
      parts.push(`air très sec (${weather.humidity}% d'humidité)`);
    }

    if (parts.length === 0) {
      return 'Conditions météo favorables pour ta peau. N\'oublie pas ta protection solaire quotidienne !';
    }

    return `${parts.join(', ')}. Adapte ta routine en conséquence.`;
  }

  /**
   * Get UV level text description
   */
  private getUvLevelText(uvIndex: number): string {
    if (uvIndex >= 11) return 'Extrême';
    if (uvIndex >= 8) return 'Très élevé';
    if (uvIndex >= 6) return 'Élevé';
    if (uvIndex >= 3) return 'Modéré';
    return 'Faible';
  }

  /**
   * Fetch UV and air quality data from Open-Meteo
   */
  private async fetchWeatherData(
    latitude: number,
    longitude: number,
  ): Promise<WeatherData> {
    try {
      this.logger.log(`Fetching weather data for lat: ${latitude}, lon: ${longitude}`);
      
      // Fetch UV index
      const uvResponse = await axios.get(
        `https://api.open-meteo.com/v1/forecast`,
        {
          params: {
            latitude,
            longitude,
            daily: 'uv_index_max',
            current: 'temperature_2m,relative_humidity_2m',
            forecast_days: 1,
            timezone: 'auto',
          },
          timeout: 5000, // 5s timeout
        },
      );

      this.logger.log(`UV API Response: ${JSON.stringify(uvResponse.data)}`);

      // Fetch air quality
      let aqi: number | null = null;
      try {
        const aqiResponse = await axios.get(
          `https://air-quality-api.open-meteo.com/v1/air-quality`,
          {
            params: {
              latitude,
              longitude,
              current: 'european_aqi',
            },
            timeout: 5000, // 5s timeout
          },
        );
        aqi = aqiResponse.data?.current?.european_aqi ?? null;
        this.logger.log(`AQI API Response: ${JSON.stringify(aqiResponse.data)}`);
      } catch (aqiError) {
        this.logger.warn('Failed to fetch AQI data', aqiError);
      }

      const uvIndex = uvResponse.data?.daily?.uv_index_max?.[0] ?? 0;
      const temperature = uvResponse.data?.current?.temperature_2m ?? null;
      const humidity = uvResponse.data?.current?.relative_humidity_2m ?? null;

      const weatherData = { uvIndex, aqi, humidity, temperature };
      this.logger.log(`Parsed weather data: ${JSON.stringify(weatherData)}`);

      return weatherData;
    } catch (error) {
      this.logger.error('Failed to fetch weather data', error);
      this.logger.log('Returning fallback weather data');
      
      // Return fallback data instead of throwing
      return {
        uvIndex: 5, // Medium UV as precaution
        aqi: null,
        humidity: 50,
        temperature: 20,
      };
    }
  }

  /**
   * Generate skin alert based on weather conditions
   */
  private async generateWeatherAlert(
    userId: string,
    weather: WeatherData,
    city?: string,
  ): Promise<AlertResult['alert']> {
    const alerts: { type: string; message: string; severity: string }[] = [];

    // UV Alert
    if (weather.uvIndex >= 3) {
      const uvAlert = this.generateUvAlert(weather.uvIndex, city);
      alerts.push(uvAlert);
    }

    // AQI Alert
    if (weather.aqi && weather.aqi > 50) {
      const aqiAlert = this.generateAqiAlert(weather.aqi, city);
      alerts.push(aqiAlert);
    }

    // Humidity Alert
    if (weather.humidity !== null) {
      if (weather.humidity < 30) {
        alerts.push({
          type: 'humidity',
          severity: 'medium',
          message: `Humidité très basse (${weather.humidity}%)${city ? ` à ${city}` : ''} — ta peau risque de se déshydrater. Applique un sérum hydratant et une crème riche.`,
        });
      } else if (weather.humidity > 80) {
        alerts.push({
          type: 'humidity',
          severity: 'low',
          message: `Humidité élevée (${weather.humidity}%)${city ? ` à ${city}` : ''} — privilégie des textures légères et un nettoyage doux pour éviter les pores obstrués.`,
        });
      }
    }

    // If no alerts needed, return null
    if (alerts.length === 0) {
      return null;
    }

    // Get the most severe alert
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort(
      (a, b) =>
        priorityOrder[a.severity as keyof typeof priorityOrder] -
        priorityOrder[b.severity as keyof typeof priorityOrder],
    );

    const primaryAlert = alerts[0];

    // Save alert to database
    const savedAlert = await this.prisma.skinAlert.create({
      data: {
        userId,
        type: primaryAlert.type,
        message: primaryAlert.message,
        severity: primaryAlert.severity,
        metadata: JSON.parse(JSON.stringify({ weather, allAlerts: alerts })),
      },
    });

    return {
      id: savedAlert.id,
      type: savedAlert.type,
      message: savedAlert.message,
      severity: savedAlert.severity,
      date: savedAlert.date,
    };
  }

  /**
   * Generate UV-specific alert message
   */
  private generateUvAlert(
    uvIndex: number,
    city?: string,
  ): { type: string; message: string; severity: string } {
    let severity: string;
    let recommendation: string;

    if (uvIndex >= 8) {
      severity = 'high';
      recommendation =
        "applique SPF 50+ toutes les 2 heures, porte un chapeau et des lunettes de soleil, et évite l'exposition directe entre 11h et 16h";
    } else if (uvIndex >= 6) {
      severity = 'medium';
      recommendation =
        "applique SPF 50+ et un sérum antioxydant (vitamine C) avant de sortir";
    } else {
      severity = 'low';
      recommendation =
        "applique SPF 30 pour protéger ta peau des rayons UV cumulés";
    }

    const location = city ? ` à ${city}` : '';
    const message = `Indice UV élevé (${uvIndex}/11)${location} aujourd'hui — ${recommendation}.`;

    return { type: 'uv', message, severity };
  }

  /**
   * Generate AQI-specific alert message
   */
  private generateAqiAlert(
    aqi: number,
    city?: string,
  ): { type: string; message: string; severity: string } {
    let severity: string;
    let recommendation: string;

    if (aqi > 100) {
      severity = 'high';
      recommendation =
        "nettoie ta peau en profondeur ce soir avec un double nettoyage et applique un sérum anti-pollution riche en antioxydants";
    } else if (aqi > 75) {
      severity = 'medium';
      recommendation =
        "protège ta peau avec une crème barrière anti-pollution et pense à un nettoyage en profondeur ce soir";
    } else {
      severity = 'low';
      recommendation =
        "un nettoyage doux ce soir suffira pour éliminer les particules accumulées";
    }

    const location = city ? ` à ${city}` : '';
    const message = `Qualité de l'air dégradée (AQI: ${aqi})${location} — ${recommendation}.`;

    return { type: 'pollution', message, severity };
  }

  /**
   * Get all unread alerts for a user
   */
  async getUnreadAlerts(userId: string) {
    const alerts = await this.prisma.skinAlert.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await this.prisma.skinAlert.count({
      where: { userId, isRead: false },
    });

    return { alerts, unreadCount };
  }

  /**
   * Get all alerts for a user (with pagination)
   */
  async getAllAlerts(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.prisma.skinAlert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.skinAlert.count({ where: { userId } }),
    ]);

    return {
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark an alert as read
   */
  async markAlertAsRead(alertId: string, userId: string) {
    const alert = await this.prisma.skinAlert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException(`Alerte avec l'ID ${alertId} non trouvée`);
    }

    return this.prisma.skinAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all alerts as read for a user
   */
  async markAllAlertsAsRead(userId: string) {
    await this.prisma.skinAlert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'Toutes les alertes ont été marquées comme lues' };
  }

  /**
   * Log daily skin condition
   */
  async createSkinLog(userId: string, dto: CreateSkinLogDto) {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already logged today
    const existingLog = await this.prisma.skinDailyLog.findFirst({
      where: {
        userId,
        date: { gte: today },
      },
    });

    if (existingLog) {
      // Update existing log
      return this.prisma.skinDailyLog.update({
        where: { id: existingLog.id },
        data: {
          conditionScore: dto.conditionScore,
          notes: dto.notes,
          concerns: dto.concerns || [],
        },
      });
    }

    // Create new log
    const log = await this.prisma.skinDailyLog.create({
      data: {
        userId,
        conditionScore: dto.conditionScore,
        notes: dto.notes,
        concerns: dto.concerns || [],
      },
    });

    // Update seasonal pattern
    await this.updateSeasonalPattern(userId);

    return log;
  }

  /**
   * Update seasonal pattern for current month
   */
  private async updateSeasonalPattern(userId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get all logs for current month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const logs = await this.prisma.skinDailyLog.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    if (logs.length === 0) return;

    // Calculate average score
    const avgScore =
      logs.reduce((sum, log) => sum + log.conditionScore, 0) / logs.length;

    // Find dominant issue
    const concernCounts: Record<string, number> = {};
    logs.forEach((log) => {
      log.concerns.forEach((concern) => {
        concernCounts[concern] = (concernCounts[concern] || 0) + 1;
      });
    });

    const dominantIssue = Object.entries(concernCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    // Upsert seasonal pattern
    await this.prisma.skinSeasonalPattern.upsert({
      where: {
        userId_month_year: { userId, month, year },
      },
      create: {
        userId,
        month,
        year,
        avgConditionScore: avgScore,
        dominantIssue,
        totalLogs: logs.length,
      },
      update: {
        avgConditionScore: avgScore,
        dominantIssue,
        totalLogs: logs.length,
      },
    });
  }

  /**
   * Get seasonal prediction based on historical data
   */
  async getSeasonalPrediction(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month pattern
    const currentPattern = await this.prisma.skinSeasonalPattern.findUnique({
      where: {
        userId_month_year: { userId, month: currentMonth, year: currentYear },
      },
    });

    // Get same month last year
    const lastYearPattern = await this.prisma.skinSeasonalPattern.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear - 1,
        },
      },
    });

    // Get historical patterns for trend analysis
    const historicalPatterns = await this.prisma.skinSeasonalPattern.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    });

    // Generate prediction
    const prediction = this.generatePrediction(
      currentMonth,
      currentPattern,
      lastYearPattern,
      historicalPatterns,
    );

    return {
      currentMonth: this.getMonthName(currentMonth),
      currentScore: currentPattern?.avgConditionScore ?? null,
      lastYearScore: lastYearPattern?.avgConditionScore ?? null,
      prediction,
      historicalData: historicalPatterns.map((p) => ({
        month: this.getMonthName(p.month),
        year: p.year,
        score: p.avgConditionScore,
        dominantIssue: p.dominantIssue,
      })),
    };
  }

  /**
   * Generate predictive message based on patterns
   */
  private generatePrediction(
    currentMonth: number,
    currentPattern: { avgConditionScore: number; dominantIssue: string | null } | null,
    lastYearPattern: { avgConditionScore: number; dominantIssue: string | null } | null,
    historicalPatterns: Array<{ month: number; avgConditionScore: number; dominantIssue: string | null }>,
  ): { message: string; recommendations: string[]; trend: string } {
    const monthName = this.getMonthName(currentMonth);
    const recommendations: string[] = [];
    let trend = 'stable';
    let message = '';

    // Seasonal-specific recommendations
    const seasonalTips = this.getSeasonalTips(currentMonth);
    recommendations.push(...seasonalTips);

    if (!lastYearPattern && !currentPattern) {
      message = `C'est la première fois que nous analysons ta peau en ${monthName}. Continue à logger tes conditions quotidiennes pour des prédictions personnalisées !`;
      return { message, recommendations, trend: 'new' };
    }

    if (lastYearPattern && currentPattern) {
      const diff = currentPattern.avgConditionScore - lastYearPattern.avgConditionScore;

      if (diff > 1) {
        trend = 'improving';
        message = `Ta peau va mieux ce ${monthName} que l'année dernière (+${diff.toFixed(1)} points). Continue comme ça !`;
      } else if (diff < -1) {
        trend = 'declining';
        message = `Ta peau semble moins en forme ce ${monthName} comparé à l'année dernière (${diff.toFixed(1)} points). `;
        if (currentPattern.dominantIssue) {
          message += `Le problème dominant est: ${this.translateConcern(currentPattern.dominantIssue)}.`;
          recommendations.push(
            ...this.getRecommendationsForConcern(currentPattern.dominantIssue),
          );
        }
      } else {
        trend = 'stable';
        message = `Ta peau est stable par rapport à ${monthName} dernier. ${lastYearPattern.dominantIssue ? `Attention au problème récurrent: ${this.translateConcern(lastYearPattern.dominantIssue)}.` : ''}`;
      }
    } else if (lastYearPattern) {
      message = `L'année dernière en ${monthName}, ta peau avait un score de ${lastYearPattern.avgConditionScore.toFixed(1)}/10. ${lastYearPattern.dominantIssue ? `Le problème principal était: ${this.translateConcern(lastYearPattern.dominantIssue)}.` : ''} Anticipe ces problèmes cette année !`;
      if (lastYearPattern.dominantIssue) {
        recommendations.push(
          ...this.getRecommendationsForConcern(lastYearPattern.dominantIssue),
        );
      }
    } else if (currentPattern) {
      message = `Score actuel pour ${monthName}: ${currentPattern.avgConditionScore.toFixed(1)}/10. Continue à logger pour construire ton historique saisonnier.`;
    }

    return { message, recommendations, trend };
  }

  /**
   * Get seasonal skincare tips
   */
  private getSeasonalTips(month: number): string[] {
    // Winter (Dec-Feb)
    if ([12, 1, 2].includes(month)) {
      return [
        'Privilégie des textures riches et des huiles nourrissantes',
        "N'oublie pas la protection solaire même en hiver",
        "Utilise un humidificateur pour contrer l'air sec du chauffage",
      ];
    }
    // Spring (Mar-May)
    if ([3, 4, 5].includes(month)) {
      return [
        'Augmente progressivement ta protection solaire',
        'Attention aux allergies saisonnières qui peuvent affecter ta peau',
        'Allège tes textures progressivement',
      ];
    }
    // Summer (Jun-Aug)
    if ([6, 7, 8].includes(month)) {
      return [
        'SPF 50+ obligatoire, réapplique toutes les 2h',
        'Privilégie des textures légères et non-comédogènes',
        'Double nettoyage le soir pour éliminer la crème solaire',
      ];
    }
    // Fall (Sep-Nov)
    return [
      'Répare les dommages du soleil avec des sérums réparateurs',
      'Réintroduis progressivement les textures plus riches',
      "C'est le moment idéal pour les traitements exfoliants",
    ];
  }

  /**
   * Get recommendations for specific skin concerns
   */
  private getRecommendationsForConcern(concern: string): string[] {
    const recommendations: Record<string, string[]> = {
      acne: [
        "Utilise un nettoyant à base de BHA (acide salicylique)",
        "Évite les produits comédogènes",
        "N'oublie pas d'hydrater malgré les imperfections",
      ],
      dryness: [
        "Applique un sérum à l'acide hyaluronique sur peau humide",
        "Utilise une crème riche matin et soir",
        "Évite les nettoyants agressifs",
      ],
      redness: [
        "Utilise des produits apaisants à la centella asiatica",
        "Évite les parfums et l'alcool dans tes produits",
        "Protège-toi du froid et du vent",
      ],
      oiliness: [
        "Utilise un nettoyant doux (évite de décaper)",
        "Applique un sérum au niacinamide pour réguler le sébum",
        "Hydrate avec une texture légère gel ou fluide",
      ],
      sensitivity: [
        "Simplifie ta routine (moins de produits)",
        "Teste chaque nouveau produit sur une petite zone",
        "Privilégie les formules sans parfum",
      ],
      pigmentation: [
        "Utilise un sérum à la vitamine C le matin",
        "SPF 50+ est indispensable tous les jours",
        "Considère des soins à l'arbutine ou au niacinamide",
      ],
    };

    return recommendations[concern] || [];
  }

  /**
   * Translate concern to French
   */
  private translateConcern(concern: string): string {
    const translations: Record<string, string> = {
      acne: 'acné',
      dryness: 'sécheresse',
      redness: 'rougeurs',
      oiliness: 'excès de sébum',
      sensitivity: 'sensibilité',
      pigmentation: 'taches pigmentaires',
      wrinkles: 'rides',
      pores: 'pores dilatés',
    };
    return translations[concern] || concern;
  }

  /**
   * Get month name in French
   */
  private getMonthName(month: number): string {
    const months = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    return months[month - 1];
  }

  /**
   * Get user's skin logs history
   */
  async getSkinLogs(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.skinDailyLog.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });
  }
}
