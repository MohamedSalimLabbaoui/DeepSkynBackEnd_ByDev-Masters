import { ConfigService } from '@nestjs/config';
export interface WeatherAdviceInput {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    city?: string;
    country?: string;
}
export declare class WeatherService {
    private readonly configService;
    private readonly logger;
    private readonly geminiApiKeys;
    private readonly geminiModels;
    private readonly geminiBaseUrl;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly grokService;
    constructor(configService: ConfigService);
    private loadApiKeys;
    private sleep;
    private isRetryableStatus;
    private requestGeminiAdvice;
    getLocationFromIP(): Promise<{
        latitude: number;
        longitude: number;
        city?: string;
        country?: string;
    }>;
    generateWeatherAdvice(data: WeatherAdviceInput): Promise<{
        advice: string;
        emoji: string;
        urgency: 'low' | 'medium' | 'high';
    }>;
    private buildWeatherPrompt;
    private calculateUrgency;
    private parseAdviceResponse;
    private generateFallbackAdvice;
}
