"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ContextualAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("axios");
const grok_service_1 = require("../analysis/services/grok.service");
const prompt_compression_util_1 = require("./prompt-compression.util");
let ContextualAnalysisService = ContextualAnalysisService_1 = class ContextualAnalysisService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(ContextualAnalysisService_1.name);
        this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.maxRetries = 2;
        this.retryDelay = 1500;
        this.geminiApiKeys = this.loadApiKeys('GEMINI_API_KEY');
        this.geminiModels = [
            this.configService.get('GEMINI_PRIMARY_MODEL') ||
                'gemini-2.5-flash',
            this.configService.get('GEMINI_FALLBACK_MODEL') ||
                'gemini-1.5-flash',
        ].filter((value, index, arr) => !!value && arr.indexOf(value) === index);
        if (this.geminiApiKeys.length === 0) {
            this.logger.warn('Contextual analysis Gemini is not configured. Set GEMINI_API_KEY.');
        }
        this.grokService = new grok_service_1.GrokService(configService);
    }
    loadApiKeys(baseName) {
        const key = this.configService.get(baseName);
        return key && key.trim().length > 0 ? [key.trim()] : [];
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    isRetryableStatus(status) {
        return status === 429 || status === 500 || status === 503;
    }
    async requestGeminiAdvice(prompt) {
        if (this.geminiApiKeys.length === 0) {
            throw new Error('No Gemini API key configured');
        }
        const apiKey = this.geminiApiKeys[0];
        for (const model of this.geminiModels) {
            const url = `${this.geminiBaseUrl}/${model}:generateContent?key=${apiKey}`;
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    const response = await axios_1.default.post(url, {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1024,
                        },
                    }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });
                    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        return text;
                    }
                }
                catch (error) {
                    const status = error?.response?.status;
                    this.logger.warn(`Gemini advice failed (model=${model}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`);
                    if (this.isRetryableStatus(status) && attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt);
                        continue;
                    }
                }
            }
        }
        throw new Error('All Gemini model/key candidates failed');
    }
    async getWeatherAlert(userId, query) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        try {
            const { latitude, longitude, city, country } = query;
            const weatherData = await this.fetchWeatherData(latitude, longitude);
            const skinProfile = await this.prisma.skinProfile.findUnique({
                where: { userId },
            });
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
            }
            catch (logError) {
                this.logger.warn('Failed to log weather data', logError);
            }
            const alert = await this.generateWeatherAlert(userId, weatherData, city);
            let aiAdvice;
            try {
                aiAdvice = await this.generateAIAdvice(weatherData, skinProfile, city);
            }
            catch (error) {
                this.logger.warn('Failed to generate AI advice, using fallback', error);
                aiAdvice = this.getFallbackAdvice(weatherData);
            }
            return {
                alert,
                weather: weatherData,
                location: { latitude, longitude, city, country },
                aiAdvice,
            };
        }
        catch (error) {
            this.logger.error('Weather alert service failed, returning fallback', error);
            const { latitude, longitude, city, country } = query;
            const fallbackWeather = {
                uvIndex: 5,
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
    async generateAIAdvice(weather, skinProfile, city) {
        if (this.geminiApiKeys.length === 0) {
            return this.getFallbackAdvice(weather);
        }
        const weatherCtx = (0, prompt_compression_util_1.buildCompactWeatherContext)(weather, city);
        const skinCtx = (0, prompt_compression_util_1.buildCompactSkinProfile)(skinProfile);
        const uvLevel = this.getUvLevelText(weather.uvIndex);
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermato expert. Conseils peau temps réel.
Météo:${weatherCtx}(${uvLevel})
Profil:${skinCtx}
Rép JSON:{personalizedMessage:string,skinCareRoutine:[],productsToUse:[],warnings:[],protectionLevel:low|medium|high|extreme}
Court, français.`);
        try {
            const text = await this.requestGeminiAdvice(prompt);
            if (!text) {
                throw new Error('Empty Gemini response');
            }
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        }
        catch (error) {
            this.logger.error('Gemini AI advice generation failed, trying OpenRouter fallback', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter fallback for AI advice');
                    const grokResponse = await this.grokService.generate(prompt);
                    const jsonMatch = grokResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        this.logger.log('OpenRouter AI advice generated successfully');
                        return parsed;
                    }
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            return this.getFallbackAdvice(weather);
        }
    }
    getFallbackAdvice(weather) {
        const uvLevel = weather.uvIndex;
        let protectionLevel = 'low';
        const skinCareRoutine = [];
        const productsToUse = [];
        const warnings = [];
        if (uvLevel >= 8) {
            protectionLevel = 'extreme';
            skinCareRoutine.push('Applique une protection solaire SPF 50+ généreusement');
            skinCareRoutine.push('Réapplique toutes les 2 heures');
            productsToUse.push("Écran solaire SPF 50+ résistant à l'eau");
            productsToUse.push('Sérum antioxydant (Vitamine C)');
            warnings.push("Évite l'exposition directe entre 11h et 16h");
        }
        else if (uvLevel >= 6) {
            protectionLevel = 'high';
            skinCareRoutine.push('Applique une protection solaire SPF 50+');
            productsToUse.push('Écran solaire SPF 50+');
            productsToUse.push('Chapeau et lunettes de soleil');
        }
        else if (uvLevel >= 3) {
            protectionLevel = 'medium';
            skinCareRoutine.push('Applique une protection solaire SPF 30+');
            productsToUse.push('Crème hydratante avec SPF 30');
        }
        if (weather.humidity !== null) {
            if (weather.humidity < 30) {
                skinCareRoutine.push("Utilise un sérum hydratant à l'acide hyaluronique");
                productsToUse.push('Sérum hydratant');
                productsToUse.push('Crème riche et occlusive');
            }
            else if (weather.humidity > 80) {
                skinCareRoutine.push('Privilégie des textures légères');
                productsToUse.push('Gel hydratant léger');
            }
        }
        if (weather.aqi !== null && weather.aqi > 75) {
            skinCareRoutine.push('Double nettoyage ce soir');
            productsToUse.push('Huile démaquillante');
            productsToUse.push('Sérum anti-pollution aux antioxydants');
            if (weather.aqi > 100) {
                warnings.push("Qualité de l'air très dégradée - limite les sorties");
            }
        }
        const personalizedMessage = this.buildFallbackMessage(weather);
        return {
            personalizedMessage,
            skinCareRoutine: skinCareRoutine.length > 0
                ? skinCareRoutine
                : ['Continue ta routine habituelle'],
            productsToUse: productsToUse.length > 0
                ? productsToUse
                : ['Ta crème hydratante habituelle'],
            warnings,
            protectionLevel,
        };
    }
    buildFallbackMessage(weather) {
        const parts = [];
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
            return "Conditions météo favorables pour ta peau. N'oublie pas ta protection solaire quotidienne !";
        }
        return `${parts.join(', ')}. Adapte ta routine en conséquence.`;
    }
    getUvLevelText(uvIndex) {
        if (uvIndex >= 11)
            return 'Extrême';
        if (uvIndex >= 8)
            return 'Très élevé';
        if (uvIndex >= 6)
            return 'Élevé';
        if (uvIndex >= 3)
            return 'Modéré';
        return 'Faible';
    }
    async fetchWeatherData(latitude, longitude) {
        try {
            this.logger.log(`Fetching weather data for lat: ${latitude}, lon: ${longitude}`);
            const uvResponse = await axios_1.default.get(`https://api.open-meteo.com/v1/forecast`, {
                params: {
                    latitude,
                    longitude,
                    daily: 'uv_index_max',
                    current: 'temperature_2m,relative_humidity_2m',
                    forecast_days: 1,
                    timezone: 'auto',
                },
                timeout: 5000,
            });
            this.logger.log(`UV API Response: ${JSON.stringify(uvResponse.data)}`);
            let aqi = null;
            try {
                const aqiResponse = await axios_1.default.get(`https://air-quality-api.open-meteo.com/v1/air-quality`, {
                    params: {
                        latitude,
                        longitude,
                        current: 'european_aqi',
                    },
                    timeout: 5000,
                });
                aqi = aqiResponse.data?.current?.european_aqi ?? null;
                this.logger.log(`AQI API Response: ${JSON.stringify(aqiResponse.data)}`);
            }
            catch (aqiError) {
                this.logger.warn('Failed to fetch AQI data', aqiError);
            }
            const uvIndex = uvResponse.data?.daily?.uv_index_max?.[0] ?? 0;
            const temperature = uvResponse.data?.current?.temperature_2m ?? null;
            const humidity = uvResponse.data?.current?.relative_humidity_2m ?? null;
            const weatherData = { uvIndex, aqi, humidity, temperature };
            this.logger.log(`Parsed weather data: ${JSON.stringify(weatherData)}`);
            return weatherData;
        }
        catch (error) {
            this.logger.error('Failed to fetch weather data', error);
            this.logger.log('Returning fallback weather data');
            return {
                uvIndex: 5,
                aqi: null,
                humidity: 50,
                temperature: 20,
            };
        }
    }
    async generateWeatherAlert(userId, weather, city) {
        const alerts = [];
        if (weather.uvIndex >= 3) {
            const uvAlert = this.generateUvAlert(weather.uvIndex, city);
            alerts.push(uvAlert);
        }
        if (weather.aqi && weather.aqi > 50) {
            const aqiAlert = this.generateAqiAlert(weather.aqi, city);
            alerts.push(aqiAlert);
        }
        if (weather.humidity !== null) {
            if (weather.humidity < 30) {
                alerts.push({
                    type: 'humidity',
                    severity: 'medium',
                    message: `Humidité très basse (${weather.humidity}%)${city ? ` à ${city}` : ''} — ta peau risque de se déshydrater. Applique un sérum hydratant et une crème riche.`,
                });
            }
            else if (weather.humidity > 80) {
                alerts.push({
                    type: 'humidity',
                    severity: 'low',
                    message: `Humidité élevée (${weather.humidity}%)${city ? ` à ${city}` : ''} — privilégie des textures légères et un nettoyage doux pour éviter les pores obstrués.`,
                });
            }
        }
        if (alerts.length === 0) {
            return null;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        alerts.sort((a, b) => priorityOrder[a.severity] -
            priorityOrder[b.severity]);
        const primaryAlert = alerts[0];
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
    generateUvAlert(uvIndex, city) {
        let severity;
        let recommendation;
        if (uvIndex >= 8) {
            severity = 'high';
            recommendation =
                "applique SPF 50+ toutes les 2 heures, porte un chapeau et des lunettes de soleil, et évite l'exposition directe entre 11h et 16h";
        }
        else if (uvIndex >= 6) {
            severity = 'medium';
            recommendation =
                'applique SPF 50+ et un sérum antioxydant (vitamine C) avant de sortir';
        }
        else {
            severity = 'low';
            recommendation =
                'applique SPF 30 pour protéger ta peau des rayons UV cumulés';
        }
        const location = city ? ` à ${city}` : '';
        const message = `Indice UV élevé (${uvIndex}/11)${location} aujourd'hui — ${recommendation}.`;
        return { type: 'uv', message, severity };
    }
    generateAqiAlert(aqi, city) {
        let severity;
        let recommendation;
        if (aqi > 100) {
            severity = 'high';
            recommendation =
                'nettoie ta peau en profondeur ce soir avec un double nettoyage et applique un sérum anti-pollution riche en antioxydants';
        }
        else if (aqi > 75) {
            severity = 'medium';
            recommendation =
                'protège ta peau avec une crème barrière anti-pollution et pense à un nettoyage en profondeur ce soir';
        }
        else {
            severity = 'low';
            recommendation =
                'un nettoyage doux ce soir suffira pour éliminer les particules accumulées';
        }
        const location = city ? ` à ${city}` : '';
        const message = `Qualité de l'air dégradée (AQI: ${aqi})${location} — ${recommendation}.`;
        return { type: 'pollution', message, severity };
    }
    async getUnreadAlerts(userId) {
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
    async getAllAlerts(userId, page = 1, limit = 20) {
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
    async markAlertAsRead(alertId, userId) {
        const alert = await this.prisma.skinAlert.findFirst({
            where: { id: alertId, userId },
        });
        if (!alert) {
            throw new common_1.NotFoundException(`Alerte avec l'ID ${alertId} non trouvée`);
        }
        return this.prisma.skinAlert.update({
            where: { id: alertId },
            data: { isRead: true },
        });
    }
    async markAllAlertsAsRead(userId) {
        await this.prisma.skinAlert.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { message: 'Toutes les alertes ont été marquées comme lues' };
    }
    async createSkinLog(userId, dto) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingLog = await this.prisma.skinDailyLog.findFirst({
            where: {
                userId,
                date: { gte: today },
            },
        });
        if (existingLog) {
            return this.prisma.skinDailyLog.update({
                where: { id: existingLog.id },
                data: {
                    conditionScore: dto.conditionScore,
                    notes: dto.notes,
                    concerns: dto.concerns || [],
                },
            });
        }
        const log = await this.prisma.skinDailyLog.create({
            data: {
                userId,
                conditionScore: dto.conditionScore,
                notes: dto.notes,
                concerns: dto.concerns || [],
            },
        });
        await this.updateSeasonalPattern(userId);
        return log;
    }
    async updateSeasonalPattern(userId) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const logs = await this.prisma.skinDailyLog.findMany({
            where: {
                userId,
                date: { gte: startOfMonth, lte: endOfMonth },
            },
        });
        if (logs.length === 0)
            return;
        const avgScore = logs.reduce((sum, log) => sum + log.conditionScore, 0) / logs.length;
        const concernCounts = {};
        logs.forEach((log) => {
            log.concerns.forEach((concern) => {
                concernCounts[concern] = (concernCounts[concern] || 0) + 1;
            });
        });
        const dominantIssue = Object.entries(concernCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
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
    async getSeasonalPrediction(userId) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentPattern = await this.prisma.skinSeasonalPattern.findUnique({
            where: {
                userId_month_year: { userId, month: currentMonth, year: currentYear },
            },
        });
        const lastYearPattern = await this.prisma.skinSeasonalPattern.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month: currentMonth,
                    year: currentYear - 1,
                },
            },
        });
        const historicalPatterns = await this.prisma.skinSeasonalPattern.findMany({
            where: { userId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 12,
        });
        const prediction = this.generatePrediction(currentMonth, currentPattern, lastYearPattern, historicalPatterns);
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
    generatePrediction(currentMonth, currentPattern, lastYearPattern, _historicalPatterns) {
        const monthName = this.getMonthName(currentMonth);
        const recommendations = [];
        let trend = 'stable';
        let message = '';
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
            }
            else if (diff < -1) {
                trend = 'declining';
                message = `Ta peau semble moins en forme ce ${monthName} comparé à l'année dernière (${diff.toFixed(1)} points). `;
                if (currentPattern.dominantIssue) {
                    message += `Le problème dominant est: ${this.translateConcern(currentPattern.dominantIssue)}.`;
                    recommendations.push(...this.getRecommendationsForConcern(currentPattern.dominantIssue));
                }
            }
            else {
                trend = 'stable';
                message = `Ta peau est stable par rapport à ${monthName} dernier. ${lastYearPattern.dominantIssue ? `Attention au problème récurrent: ${this.translateConcern(lastYearPattern.dominantIssue)}.` : ''}`;
            }
        }
        else if (lastYearPattern) {
            message = `L'année dernière en ${monthName}, ta peau avait un score de ${lastYearPattern.avgConditionScore.toFixed(1)}/10. ${lastYearPattern.dominantIssue ? `Le problème principal était: ${this.translateConcern(lastYearPattern.dominantIssue)}.` : ''} Anticipe ces problèmes cette année !`;
            if (lastYearPattern.dominantIssue) {
                recommendations.push(...this.getRecommendationsForConcern(lastYearPattern.dominantIssue));
            }
        }
        else if (currentPattern) {
            message = `Score actuel pour ${monthName}: ${currentPattern.avgConditionScore.toFixed(1)}/10. Continue à logger pour construire ton historique saisonnier.`;
        }
        return { message, recommendations, trend };
    }
    getSeasonalTips(month) {
        if ([12, 1, 2].includes(month)) {
            return [
                'Privilégie des textures riches et des huiles nourrissantes',
                "N'oublie pas la protection solaire même en hiver",
                "Utilise un humidificateur pour contrer l'air sec du chauffage",
            ];
        }
        if ([3, 4, 5].includes(month)) {
            return [
                'Augmente progressivement ta protection solaire',
                'Attention aux allergies saisonnières qui peuvent affecter ta peau',
                'Allège tes textures progressivement',
            ];
        }
        if ([6, 7, 8].includes(month)) {
            return [
                'SPF 50+ obligatoire, réapplique toutes les 2h',
                'Privilégie des textures légères et non-comédogènes',
                'Double nettoyage le soir pour éliminer la crème solaire',
            ];
        }
        return [
            'Répare les dommages du soleil avec des sérums réparateurs',
            'Réintroduis progressivement les textures plus riches',
            "C'est le moment idéal pour les traitements exfoliants",
        ];
    }
    getRecommendationsForConcern(concern) {
        const recommendations = {
            acne: [
                'Utilise un nettoyant à base de BHA (acide salicylique)',
                'Évite les produits comédogènes',
                "N'oublie pas d'hydrater malgré les imperfections",
            ],
            dryness: [
                "Applique un sérum à l'acide hyaluronique sur peau humide",
                'Utilise une crème riche matin et soir',
                'Évite les nettoyants agressifs',
            ],
            redness: [
                'Utilise des produits apaisants à la centella asiatica',
                "Évite les parfums et l'alcool dans tes produits",
                'Protège-toi du froid et du vent',
            ],
            oiliness: [
                'Utilise un nettoyant doux (évite de décaper)',
                'Applique un sérum au niacinamide pour réguler le sébum',
                'Hydrate avec une texture légère gel ou fluide',
            ],
            sensitivity: [
                'Simplifie ta routine (moins de produits)',
                'Teste chaque nouveau produit sur une petite zone',
                'Privilégie les formules sans parfum',
            ],
            pigmentation: [
                'Utilise un sérum à la vitamine C le matin',
                'SPF 50+ est indispensable tous les jours',
                "Considère des soins à l'arbutine ou au niacinamide",
            ],
        };
        return recommendations[concern] || [];
    }
    translateConcern(concern) {
        const translations = {
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
    getMonthName(month) {
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
    async getSkinLogs(userId, days = 30) {
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
};
exports.ContextualAnalysisService = ContextualAnalysisService;
exports.ContextualAnalysisService = ContextualAnalysisService = ContextualAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ContextualAnalysisService);
//# sourceMappingURL=contextual-analysis.service.js.map