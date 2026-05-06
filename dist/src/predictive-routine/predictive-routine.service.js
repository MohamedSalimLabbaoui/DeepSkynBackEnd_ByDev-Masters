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
var PredictiveRoutineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveRoutineService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const digital_twin_service_1 = require("../digital-twin/digital-twin.service");
const routine_status_dto_1 = require("./dto/routine-status.dto");
const axios_1 = require("axios");
const grok_service_1 = require("../analysis/services/grok.service");
const prompt_compression_util_1 = require("./prompt-compression.util");
let PredictiveRoutineService = PredictiveRoutineService_1 = class PredictiveRoutineService {
    constructor(prisma, config, digitalTwinService) {
        this.prisma = prisma;
        this.config = config;
        this.digitalTwinService = digitalTwinService;
        this.logger = new common_1.Logger(PredictiveRoutineService_1.name);
        this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.geminiApiKeys = this.loadApiKeys('GEMINI_API_KEY');
        this.geminiModels = [
            this.config.get('GEMINI_PRIMARY_MODEL') || 'gemini-2.5-flash',
            this.config.get('GEMINI_FALLBACK_MODEL') || 'gemini-1.5-flash',
        ].filter((value, index, arr) => !!value && arr.indexOf(value) === index);
        if (this.geminiApiKeys.length === 0) {
            this.logger.warn('Predictive routine Gemini is not configured. Set GEMINI_API_KEY.');
        }
        this.grokService = new grok_service_1.GrokService(config);
    }
    loadApiKeys(baseName) {
        const key = this.config.get(baseName);
        return key && key.trim().length > 0 ? [key.trim()] : [];
    }
    isRetryableStatus(status) {
        return status === 429 || status === 500 || status === 503;
    }
    async requestGeminiRoutine(prompt) {
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
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4096,
                        },
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 60000,
                    });
                    const textResponse = response.data.candidates[0]?.content?.parts[0]?.text;
                    if (textResponse) {
                        return textResponse;
                    }
                }
                catch (error) {
                    const axiosError = error;
                    const status = axiosError.response?.status;
                    this.logger.warn(`Gemini routine failed (model=${model}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`);
                    if (this.isRetryableStatus(status) && attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt);
                        continue;
                    }
                }
            }
        }
        throw new Error('All Gemini model/key candidates failed');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async makeRequestWithRetry(requestFn, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await requestFn();
            }
            catch (error) {
                const axiosError = error;
                if (axiosError.response?.status === 429) {
                    if (attempt < retries) {
                        const delay = this.retryDelay * attempt;
                        this.logger.warn(`Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
                        await this.sleep(delay);
                        continue;
                    }
                    throw new common_1.HttpException('API rate limit exceeded. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
                if (axiosError.response?.status === 503 ||
                    axiosError.response?.status === 500) {
                    if (attempt < retries) {
                        const delay = this.retryDelay * attempt;
                        this.logger.warn(`Server error (${axiosError.response?.status}). Retrying in ${delay}ms...`);
                        await this.sleep(delay);
                        continue;
                    }
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }
    async generatePredictiveRoutine(userId, analysisId, analysisResult, latitude, longitude) {
        try {
            this.logger.log(`Generating predictive routine for user ${userId}, analysis ${analysisId}`);
            const weatherData = await this.fetchWeatherForecast(latitude, longitude);
            const userProfile = await this.getUserProfile(userId);
            const twinData = await this.getDigitalTwinData(userId);
            const routine = await this.generateWithGemini(analysisResult, weatherData, userProfile.cyclePhase, userProfile.products, twinData);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            const savedRoutine = await this.prisma.predictiveRoutine.create({
                data: {
                    userId,
                    analysisId,
                    routine: routine,
                    weatherData: weatherData,
                    expiresAt,
                },
            });
            this.logger.log(`Predictive routine saved with ID ${savedRoutine.id} (Twin-enhanced: ${twinData.enabled})`);
            return {
                id: savedRoutine.id,
                routine,
                generatedAt: savedRoutine.generatedAt,
                expiresAt: savedRoutine.expiresAt,
                twinEnhanced: twinData.enabled,
                confidence: twinData.confidence,
            };
        }
        catch (error) {
            const err = error;
            this.logger.error(`Error generating predictive routine: ${err.message}`, err.stack);
            const fallbackRoutine = this.getFallbackRoutine(analysisResult.skinType);
            return {
                id: 'fallback',
                routine: fallbackRoutine,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                twinEnhanced: false,
                confidence: 0,
            };
        }
    }
    async getDigitalTwinData(userId) {
        try {
            const twin = await this.digitalTwinService.getOrCreateTwin(userId);
            const snapshots = await this.digitalTwinService.getSnapshots(userId, 5);
            return {
                enabled: snapshots.length >= 3,
                confidence: twin.confidence,
                currentState: twin.currentState,
                trendAnalysis: twin.trendAnalysis,
                seasonalPatterns: twin.seasonalPatterns,
                productSensitivity: twin.productSensitivity,
                improvementRate: twin.improvementRate,
                recentSnapshots: snapshots.slice(0, 3),
            };
        }
        catch (error) {
            this.logger.warn(`Could not fetch Digital Twin data: ${error.message}`);
            return {
                enabled: false,
                confidence: 0,
                currentState: null,
                trendAnalysis: null,
                seasonalPatterns: null,
                productSensitivity: null,
                improvementRate: null,
                recentSnapshots: [],
            };
        }
    }
    async fetchWeatherForecast(latitude, longitude) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=uv_index_max,precipitation_sum,temperature_2m_max&forecast_days=7&timezone=auto`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) {
                throw new Error(`Weather API returned ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            this.logger.warn(`Weather API failed: ${error.message}, using default data`);
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
    async getUserProfile(userId) {
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
            const settings = user?.settings;
            const cyclePhase = settings?.cyclePhase || null;
            const products = settings?.savedProducts || null;
            return { cyclePhase, products };
        }
        catch (error) {
            this.logger.warn(`Error fetching user profile: ${error.message}`);
            return { cyclePhase: null, products: null };
        }
    }
    async generateWithGemini(analysisResult, weatherData, cyclePhase, products, twinData) {
        if (this.geminiApiKeys.length === 0) {
            this.logger.warn('Gemini API not configured, using fallback');
            return this.getFallbackRoutine(analysisResult.skinType);
        }
        try {
            const weatherSummary = (0, prompt_compression_util_1.compressWeatherForecast)(weatherData.daily);
            const st = (0, prompt_compression_util_1.abbrevSkinType)(analysisResult.skinType);
            const issues = analysisResult.detectedIssues.slice(0, 3).join(',') || '-';
            const prods = products?.slice(0, 5).join(',') || '-';
            let twinSummary = '';
            if (twinData?.enabled) {
                const trend = twinData.trendAnalysis?.healthScoreTrend || 'stable';
                const rate = twinData.improvementRate
                    ? `${twinData.improvementRate.toFixed(1)}%`
                    : '0%';
                const conf = `${Math.round(twinData.confidence * 100)}%`;
                twinSummary = `\nTwin:${trend},imp:${rate},conf:${conf}`;
                if (twinData.trendAnalysis?.conditionTrends) {
                    const topTrends = Object.entries(twinData.trendAnalysis.conditionTrends)
                        .slice(0, 2)
                        .map(([cond, data]) => `${cond}:${data.direction}`)
                        .join(',');
                    if (topTrends)
                        twinSummary += `,trends:${topTrends}`;
                }
            }
            const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermato/cosmeto expert. Routine prédictive 7j.
Peau:${st},${analysisResult.condition},${issues}
Météo7j(jour:uv,pluie,temp):${weatherSummary}
Cycle:${cyclePhase || '-'}
Produits:${prods}${twinSummary}
Rép JSON strict:{days:[{day,morning:[],evening:[],tip,warning}],globalAdvice}
Français, 7 jours.
${twinData?.enabled ? 'Utilise données Twin pour routine optimisée.' : ''}`);
            this.logger.log(`Calling Gemini API with compressed prompt (Twin: ${twinData?.enabled || false})...`);
            const textResponse = await this.requestGeminiRoutine(prompt);
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            let jsonText = textResponse.trim();
            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            }
            else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }
            const startIndex = jsonText.indexOf('{');
            const lastIndex = jsonText.lastIndexOf('}');
            if (startIndex === -1 || lastIndex === -1 || lastIndex <= startIndex) {
                throw new Error('No valid JSON object found in response');
            }
            jsonText = jsonText.substring(startIndex, lastIndex + 1);
            const routine = JSON.parse(jsonText);
            if (!routine.days ||
                !Array.isArray(routine.days) ||
                routine.days.length === 0) {
                throw new Error('Invalid routine structure');
            }
            this.logger.log('Gemini AI routine generated successfully');
            return routine;
        }
        catch (error) {
            const err = error;
            this.logger.error(`Gemini API failed: ${err.message}, trying OpenRouter fallback`, err.stack);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter fallback for predictive routine');
                    const weatherSummary = (0, prompt_compression_util_1.compressWeatherForecast)(weatherData.daily);
                    const st = (0, prompt_compression_util_1.abbrevSkinType)(analysisResult.skinType);
                    const issues = analysisResult.detectedIssues.slice(0, 3).join(',') || '-';
                    const prods = products?.slice(0, 5).join(',') || '-';
                    const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
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
                    }
                    else if (jsonText.includes('```')) {
                        jsonText = jsonText.split('```')[1].split('```')[0].trim();
                    }
                    const routine = JSON.parse(jsonText);
                    if (routine.days &&
                        Array.isArray(routine.days) &&
                        routine.days.length > 0) {
                        this.logger.log('OpenRouter routine generated successfully');
                        return routine;
                    }
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            return this.getFallbackRoutine(analysisResult.skinType);
        }
    }
    formatWeatherSummary(weatherData) {
        const summaries = [];
        for (let i = 0; i < weatherData.daily.time.length; i++) {
            const date = new Date(weatherData.daily.time[i]);
            const dayName = date.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            });
            const uv = weatherData.daily.uv_index_max[i];
            const rain = weatherData.daily.precipitation_sum[i];
            const temp = weatherData.daily.temperature_2m_max[i];
            summaries.push(`${dayName}: ${temp}°C, UV ${uv}, ${rain}mm pluie`);
        }
        return summaries.join(' | ');
    }
    getFallbackRoutine(skinType) {
        const days = [];
        const dayNames = [
            'Lundi',
            'Mardi',
            'Mercredi',
            'Jeudi',
            'Vendredi',
            'Samedi',
            'Dimanche',
        ];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = `${dayNames[i]} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`;
            let morning;
            let evening;
            let tip;
            if (skinType === 'oily' || skinType === 'grasse') {
                morning = [
                    'Nettoyage doux avec gel moussant',
                    'Tonique purifiant',
                    'Sérum matifiant',
                    'Crème légère non comédogène',
                    'SPF 50+ texture fluide',
                ];
                evening = [
                    "Démaquillage à l'eau micellaire",
                    'Nettoyage gel purifiant',
                    "Sérum à l'acide salicylique",
                    'Crème hydratante légère',
                ];
                tip =
                    "Évitez de toucher votre visage en journée pour réduire l'excès de sébum.";
            }
            else if (skinType === 'dry' || skinType === 'sèche') {
                morning = [
                    'Nettoyage doux au lait',
                    'Tonique hydratant',
                    "Sérum à l'acide hyaluronique",
                    'Crème riche nourrissante',
                    'SPF 50+',
                ];
                evening = [
                    "Démaquillage à l'huile",
                    'Nettoyage doux',
                    'Sérum hydratant',
                    'Crème de nuit réparatrice',
                    'Huile végétale (optionnel)',
                ];
                tip =
                    "Buvez au moins 2L d'eau par jour et utilisez un humidificateur la nuit.";
            }
            else {
                morning = [
                    'Nettoyage gel doux',
                    'Tonique équilibrant',
                    'Sérum vitamine C',
                    'Crème hydratante légère',
                    'SPF 50+',
                ];
                evening = [
                    'Démaquillage biphasé',
                    'Nettoyage doux',
                    'Sérum rétinol (2-3x/semaine)',
                    'Crème de nuit équilibrante',
                ];
                tip = 'Alternez les zones T et joues selon leurs besoins spécifiques.';
            }
            days.push({
                day: dayName,
                morning,
                evening,
                tip,
                warning: i === 2 ? 'UV élevé prévu, renforcez la protection solaire' : null,
            });
        }
        return {
            days,
            globalAdvice: `Cette routine de base est adaptée pour une peau ${skinType}. Ajustez selon vos réactions cutanées et consultez un dermatologue si nécessaire.`,
        };
    }
    async validateAndActivateRoutine(userId, predictiveRoutineId) {
        try {
            const predictiveRoutine = await this.prisma.predictiveRoutine.findUnique({
                where: { id: predictiveRoutineId },
            });
            if (!predictiveRoutine) {
                throw new common_1.HttpException('Routine prédictive non trouvée', common_1.HttpStatus.NOT_FOUND);
            }
            if (predictiveRoutine.userId !== userId) {
                throw new common_1.HttpException('Non autorisé à valider cette routine', common_1.HttpStatus.FORBIDDEN);
            }
            const routineData = predictiveRoutine.routine;
            const generatedRoutine = routineData;
            if (!generatedRoutine.days || generatedRoutine.days.length === 0) {
                throw new common_1.HttpException('Routine prédictive invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            await this.prisma.routine.updateMany({
                where: {
                    userId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                },
            });
            const categoryMapping = {
                nettoyage: { category: 'cleanser', duration: 60 },
                nettoyant: { category: 'cleanser', duration: 60 },
                démaquillage: { category: 'cleanser', duration: 60 },
                démaquillant: { category: 'cleanser', duration: 60 },
                gel: { category: 'cleanser', duration: 60 },
                lait: { category: 'cleanser', duration: 60 },
                huile: { category: 'cleanser', duration: 45 },
                tonique: { category: 'toner', duration: 30 },
                lotion: { category: 'toner', duration: 30 },
                sérum: { category: 'serum', duration: 30 },
                vitamine: { category: 'serum', duration: 30 },
                acide: { category: 'treatment', duration: 30 },
                rétinol: { category: 'treatment', duration: 30 },
                contour: { category: 'treatment', duration: 20 },
                yeux: { category: 'treatment', duration: 20 },
                crème: { category: 'moisturizer', duration: 30 },
                hydratant: { category: 'moisturizer', duration: 30 },
                moisturizer: { category: 'moisturizer', duration: 30 },
                spf: { category: 'sunscreen', duration: 30 },
                solaire: { category: 'sunscreen', duration: 30 },
                protection: { category: 'sunscreen', duration: 30 },
                masque: { category: 'mask', duration: 900 },
                exfoliant: { category: 'treatment', duration: 60 },
                gommage: { category: 'treatment', duration: 60 },
            };
            const getCategoryAndDuration = (stepName) => {
                const lowerName = stepName.toLowerCase();
                for (const [key, value] of Object.entries(categoryMapping)) {
                    if (lowerName.includes(key)) {
                        return value;
                    }
                }
                return { category: 'treatment', duration: 30 };
            };
            const createStep = (stepName, order) => {
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
            const morningStepsOrdered = [];
            const eveningStepsOrdered = [];
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
            const morningFormattedSteps = morningStepsOrdered.map((step, index) => createStep(step, index + 1));
            const eveningFormattedSteps = eveningStepsOrdered.map((step, index) => createStep(step, index + 1));
            const morningRoutine = await this.prisma.routine.create({
                data: {
                    userId,
                    name: `Routine Matin IA - ${new Date().toLocaleDateString('fr-FR')}`,
                    type: 'AM',
                    steps: morningFormattedSteps,
                    notes: `${generatedRoutine.globalAdvice}\n\nRoutine générée automatiquement par l'IA dermatologique.`,
                    isActive: true,
                    isAIGenerated: true,
                },
            });
            const eveningRoutine = await this.prisma.routine.create({
                data: {
                    userId,
                    name: `Routine Soir IA - ${new Date().toLocaleDateString('fr-FR')}`,
                    type: 'PM',
                    steps: eveningFormattedSteps,
                    notes: `${generatedRoutine.globalAdvice}\n\nRoutine générée automatiquement par l'IA dermatologique.`,
                    isActive: true,
                    isAIGenerated: true,
                },
            });
            this.logger.log(`Predictive routine ${predictiveRoutineId} validated. Created AM routine ${morningRoutine.id} and PM routine ${eveningRoutine.id}`);
            return {
                success: true,
                routineId: morningRoutine.id,
                message: 'Routines matin et soir créées et activées avec succès',
            };
        }
        catch (error) {
            const err = error;
            this.logger.error(`Error validating routine: ${err.message}`, err.stack);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Erreur lors de la validation de la routine', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    extractStepName(fullStep) {
        const shortNames = {
            'nettoyage doux': 'Nettoyage',
            'nettoyage gel': 'Nettoyage',
            'nettoyant doux': 'Nettoyant',
            'gel nettoyant': 'Gel nettoyant',
            'gel moussant': 'Gel moussant',
            'lait nettoyant': 'Lait nettoyant',
            démaquillage: 'Démaquillage',
            'eau micellaire': 'Eau micellaire',
            'huile démaquillante': 'Huile démaquillante',
            tonique: 'Tonique',
            'lotion tonique': 'Tonique',
            sérum: 'Sérum',
            'sérum vitamine c': 'Sérum Vitamine C',
            'acide hyaluronique': 'Acide hyaluronique',
            'acide salicylique': 'Acide salicylique',
            rétinol: 'Rétinol',
            'contour des yeux': 'Contour des yeux',
            'crème hydratante': 'Hydratant',
            'crème de nuit': 'Crème de nuit',
            'crème légère': 'Hydratant léger',
            spf: 'Protection solaire',
            'protection solaire': 'Protection solaire',
            'crème solaire': 'Protection solaire',
            masque: 'Masque',
            exfoliant: 'Exfoliant',
            gommage: 'Gommage',
        };
        const lowerStep = fullStep.toLowerCase();
        for (const [key, value] of Object.entries(shortNames)) {
            if (lowerStep.includes(key)) {
                return value;
            }
        }
        const cleanStep = fullStep
            .replace(/^(nettoyage|démaquillage|application)\s+(de\s+|d'|du\s+|de la\s+)?/i, '')
            .replace(/\s+(doux|léger|hydratant|purifiant|matifiant|équilibrant|nourrissant|réparateur)$/i, '')
            .trim();
        if (cleanStep.length > 0) {
            return cleanStep.charAt(0).toUpperCase() + cleanStep.slice(1);
        }
        return fullStep.charAt(0).toUpperCase() + fullStep.slice(1);
    }
    async getPendingRoutines(userId) {
        return this.prisma.predictiveRoutine.findMany({
            where: {
                userId,
                status: routine_status_dto_1.PredictiveRoutineStatus.PENDING,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                generatedAt: 'desc',
            },
            select: {
                id: true,
                routine: true,
                generatedAt: true,
                expiresAt: true,
                status: true,
                weatherData: true,
            },
        });
    }
    async getUserRoutines(userId, status, includeExpired = false) {
        const where = { userId };
        if (status) {
            where.status = status;
        }
        if (!includeExpired) {
            where.expiresAt = { gt: new Date() };
        }
        return this.prisma.predictiveRoutine.findMany({
            where,
            orderBy: {
                generatedAt: 'desc',
            },
            select: {
                id: true,
                routine: true,
                generatedAt: true,
                expiresAt: true,
                status: true,
                actionedAt: true,
                feedback: true,
                weatherData: true,
            },
        });
    }
    async updateRoutineStatus(userId, routineId, updateDto) {
        const routine = await this.prisma.predictiveRoutine.findFirst({
            where: { id: routineId, userId },
        });
        if (!routine) {
            throw new common_1.NotFoundException('Routine not found or access denied');
        }
        const updateData = {
            status: updateDto.status,
            actionedAt: new Date(),
        };
        switch (updateDto.status) {
            case routine_status_dto_1.PredictiveRoutineStatus.ACCEPTED:
                updateData.implementedAt = new Date();
                break;
            case routine_status_dto_1.PredictiveRoutineStatus.DISMISSED:
                updateData.dismissedAt = new Date();
                break;
            case routine_status_dto_1.PredictiveRoutineStatus.IMPLEMENTED:
                updateData.implementedAt = new Date();
                if (updateDto.feedback) {
                    updateData.feedback = updateDto.feedback;
                }
                break;
        }
        const updatedRoutine = await this.prisma.predictiveRoutine.update({
            where: { id: routineId },
            data: updateData,
        });
        this.logger.log(`Routine ${routineId} status updated to ${updateDto.status} for user ${userId}`);
        return {
            id: updatedRoutine.id,
            status: updatedRoutine.status,
            actionedAt: updatedRoutine.actionedAt,
            message: this.getStatusMessage(updateDto.status),
        };
    }
    getStatusMessage(status) {
        switch (status) {
            case routine_status_dto_1.PredictiveRoutineStatus.VIEWED:
                return 'Routine consultée';
            case routine_status_dto_1.PredictiveRoutineStatus.ACCEPTED:
                return 'Routine acceptée! Vous pouvez maintenant la suivre.';
            case routine_status_dto_1.PredictiveRoutineStatus.DISMISSED:
                return 'Routine supprimée de vos recommandations.';
            case routine_status_dto_1.PredictiveRoutineStatus.IMPLEMENTED:
                return 'Merci pour votre retour! Cela nous aide à améliorer nos recommandations.';
            default:
                return 'Statut mis à jour';
        }
    }
    async markAsViewed(userId, routineId) {
        return this.updateRoutineStatus(userId, routineId, {
            status: routine_status_dto_1.PredictiveRoutineStatus.VIEWED,
        });
    }
    async acceptRoutine(userId, routineId, implement = false) {
        const status = implement
            ? routine_status_dto_1.PredictiveRoutineStatus.IMPLEMENTED
            : routine_status_dto_1.PredictiveRoutineStatus.ACCEPTED;
        return this.updateRoutineStatus(userId, routineId, { status });
    }
    async dismissRoutine(userId, routineId) {
        return this.updateRoutineStatus(userId, routineId, {
            status: routine_status_dto_1.PredictiveRoutineStatus.DISMISSED,
        });
    }
    async expireOldRoutines() {
        const result = await this.prisma.predictiveRoutine.updateMany({
            where: {
                expiresAt: { lt: new Date() },
                status: {
                    in: [routine_status_dto_1.PredictiveRoutineStatus.PENDING, routine_status_dto_1.PredictiveRoutineStatus.VIEWED],
                },
            },
            data: {
                status: routine_status_dto_1.PredictiveRoutineStatus.EXPIRED,
            },
        });
        this.logger.log(`Expired ${result.count} old routines`);
        return result;
    }
};
exports.PredictiveRoutineService = PredictiveRoutineService;
exports.PredictiveRoutineService = PredictiveRoutineService = PredictiveRoutineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        digital_twin_service_1.DigitalTwinService])
], PredictiveRoutineService);
//# sourceMappingURL=predictive-routine.service.js.map