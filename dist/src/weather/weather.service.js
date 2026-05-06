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
var WeatherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const grok_service_1 = require("../analysis/services/grok.service");
let WeatherService = WeatherService_1 = class WeatherService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WeatherService_1.name);
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
            this.logger.warn('Weather Gemini is not configured. Set GEMINI_API_KEY.');
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
                            temperature: 0.6,
                            maxOutputTokens: 1024,
                        },
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 15000,
                    });
                    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        return text;
                    }
                }
                catch (error) {
                    const status = error?.response?.status;
                    this.logger.warn(`Gemini weather failed (model=${model}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`);
                    if (this.isRetryableStatus(status) && attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt);
                        continue;
                    }
                }
            }
        }
        throw new Error('All Gemini weather candidates failed');
    }
    async getLocationFromIP() {
        try {
            const response = await axios_1.default.get('https://ipapi.co/json/', {
                timeout: 5000,
            });
            return {
                latitude: response.data.latitude,
                longitude: response.data.longitude,
                city: response.data.city,
                country: response.data.country_name,
            };
        }
        catch (error) {
            this.logger.warn('IP-based geolocation failed', error);
            return {
                latitude: 36.8065,
                longitude: 10.1657,
                city: 'Tunis',
                country: 'Tunisia',
            };
        }
    }
    async generateWeatherAdvice(data) {
        const prompt = this.buildWeatherPrompt(data);
        const urgencyLevel = this.calculateUrgency(data);
        if (this.geminiApiKeys.length > 0) {
            try {
                this.logger.log('Using Gemini for weather advice');
                const geminiResponse = await this.requestGeminiAdvice(prompt);
                const parsed = this.parseAdviceResponse(geminiResponse);
                return {
                    advice: parsed.advice,
                    emoji: parsed.emoji,
                    urgency: urgencyLevel,
                };
            }
            catch (geminiError) {
                this.logger.warn('Gemini weather advice failed, trying OpenRouter', geminiError);
            }
        }
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
        }
        catch (grokError) {
            this.logger.error('OpenRouter weather advice failed', grokError);
        }
        return {
            advice: this.generateFallbackAdvice(data),
            emoji: '🌍',
            urgency: urgencyLevel,
        };
    }
    buildWeatherPrompt(data) {
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
    calculateUrgency(data) {
        let urgencyScore = 0;
        if (data.temperature < 0 || data.temperature > 35)
            urgencyScore += 3;
        else if (data.temperature < 5 || data.temperature > 30)
            urgencyScore += 1;
        if (data.humidity < 20 || data.humidity > 80)
            urgencyScore += 2;
        if (data.windSpeed > 30)
            urgencyScore += 2;
        else if (data.windSpeed > 20)
            urgencyScore += 1;
        if (data.uvIndex > 7)
            urgencyScore += 2;
        else if (data.uvIndex > 5)
            urgencyScore += 1;
        if (data.condition === 'heavy_rain' ||
            data.condition === 'thunderstorm' ||
            data.condition === 'thunderstorm_heavy')
            urgencyScore += 3;
        else if (data.condition === 'heavy_snow')
            urgencyScore += 2;
        if (urgencyScore >= 6)
            return 'high';
        if (urgencyScore >= 3)
            return 'medium';
        return 'low';
    }
    parseAdviceResponse(response) {
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
        }
        catch (error) {
            this.logger.error('Failed to parse advice response', error);
            return {
                advice: 'Prenez soin de votre peau selon vos besoins!',
                emoji: '🌍',
            };
        }
    }
    generateFallbackAdvice(data) {
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
        return `Les conditions à ${data.city || 'votre localisation'} sont ${data.condition === 'clear'
            ? 'belles'
            : data.condition === 'overcast'
                ? 'nuageuses'
                : 'changeantes'}. Maintenez une routine régulière de soins.`;
    }
};
exports.WeatherService = WeatherService;
exports.WeatherService = WeatherService = WeatherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WeatherService);
//# sourceMappingURL=weather.service.js.map