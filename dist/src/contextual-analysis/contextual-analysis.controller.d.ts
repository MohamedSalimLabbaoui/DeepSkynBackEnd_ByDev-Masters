import { ContextualAnalysisService, AlertResult } from './contextual-analysis.service';
import { CreateSkinLogDto, WeatherAlertQueryDto } from './dto';
export declare class ContextualAnalysisController {
    private readonly contextualAnalysisService;
    constructor(contextualAnalysisService: ContextualAnalysisService);
    getWeatherAlert(userId: string, query: WeatherAlertQueryDto): Promise<AlertResult>;
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
