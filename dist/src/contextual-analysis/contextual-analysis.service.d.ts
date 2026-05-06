import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkinLogDto, WeatherAlertQueryDto } from './dto';
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
export declare class ContextualAnalysisService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly geminiApiKeys;
    private readonly geminiModels;
    private readonly geminiBaseUrl;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly grokService;
    constructor(prisma: PrismaService, configService: ConfigService);
    private loadApiKeys;
    private sleep;
    private isRetryableStatus;
    private requestGeminiAdvice;
    getWeatherAlert(userId: string, query: WeatherAlertQueryDto): Promise<AlertResult>;
    private generateAIAdvice;
    private getFallbackAdvice;
    private buildFallbackMessage;
    private getUvLevelText;
    private fetchWeatherData;
    private generateWeatherAlert;
    private generateUvAlert;
    private generateAqiAlert;
    getUnreadAlerts(userId: string): Promise<{
        alerts: {
            id: string;
            createdAt: Date;
            userId: string;
            severity: string;
            type: string;
            message: string;
            isRead: boolean;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            date: Date;
        }[];
        unreadCount: number;
    }>;
    getAllAlerts(userId: string, page?: number, limit?: number): Promise<{
        alerts: {
            id: string;
            createdAt: Date;
            userId: string;
            severity: string;
            type: string;
            message: string;
            isRead: boolean;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            date: Date;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    markAlertAsRead(alertId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        severity: string;
        type: string;
        message: string;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        date: Date;
    }>;
    markAllAlertsAsRead(userId: string): Promise<{
        message: string;
    }>;
    createSkinLog(userId: string, dto: CreateSkinLogDto): Promise<{
        id: string;
        createdAt: Date;
        concerns: string[];
        userId: string;
        notes: string | null;
        date: Date;
        weather: import("@prisma/client/runtime/library").JsonValue | null;
        conditionScore: number;
    }>;
    private updateSeasonalPattern;
    getSeasonalPrediction(userId: string): Promise<{
        currentMonth: string;
        currentScore: number;
        lastYearScore: number;
        prediction: {
            message: string;
            recommendations: string[];
            trend: string;
        };
        historicalData: {
            month: string;
            year: number;
            score: number;
            dominantIssue: string;
        }[];
    }>;
    private generatePrediction;
    private getSeasonalTips;
    private getRecommendationsForConcern;
    private translateConcern;
    private getMonthName;
    getSkinLogs(userId: string, days?: number): Promise<{
        id: string;
        createdAt: Date;
        concerns: string[];
        userId: string;
        notes: string | null;
        date: Date;
        weather: import("@prisma/client/runtime/library").JsonValue | null;
        conditionScore: number;
    }[]>;
}
