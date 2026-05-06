import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DigitalTwinService } from '../digital-twin/digital-twin.service';
import { UpdateRoutineStatusDto, PredictiveRoutineStatus } from './dto/routine-status.dto';
interface AnalysisResult {
    condition: string;
    detectedIssues: string[];
    skinType: string;
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
export declare class PredictiveRoutineService {
    private readonly prisma;
    private readonly config;
    private readonly digitalTwinService;
    private readonly logger;
    private readonly geminiApiKeys;
    private readonly geminiModels;
    private readonly geminiBaseUrl;
    private readonly grokService;
    private readonly maxRetries;
    private readonly retryDelay;
    constructor(prisma: PrismaService, config: ConfigService, digitalTwinService: DigitalTwinService);
    private loadApiKeys;
    private isRetryableStatus;
    private requestGeminiRoutine;
    private sleep;
    private makeRequestWithRetry;
    generatePredictiveRoutine(userId: string, analysisId: string, analysisResult: AnalysisResult, latitude: number, longitude: number): Promise<{
        id: string;
        routine: GeneratedRoutine;
        generatedAt: Date;
        expiresAt: Date;
        twinEnhanced: boolean;
        confidence: number;
    }>;
    private getDigitalTwinData;
    private fetchWeatherForecast;
    private getUserProfile;
    private generateWithGemini;
    private formatWeatherSummary;
    private getFallbackRoutine;
    validateAndActivateRoutine(userId: string, predictiveRoutineId: string): Promise<{
        success: boolean;
        routineId: string;
        message: string;
    }>;
    private extractStepName;
    getPendingRoutines(userId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        routine: import("@prisma/client/runtime/library").JsonValue;
        expiresAt: Date;
        generatedAt: Date;
        weatherData: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    getUserRoutines(userId: string, status?: PredictiveRoutineStatus, includeExpired?: boolean): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        routine: import("@prisma/client/runtime/library").JsonValue;
        feedback: string;
        expiresAt: Date;
        generatedAt: Date;
        weatherData: import("@prisma/client/runtime/library").JsonValue;
        actionedAt: Date;
    }[]>;
    updateRoutineStatus(userId: string, routineId: string, updateDto: UpdateRoutineStatusDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        actionedAt: Date;
        message: string;
    }>;
    private getStatusMessage;
    markAsViewed(userId: string, routineId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        actionedAt: Date;
        message: string;
    }>;
    acceptRoutine(userId: string, routineId: string, implement?: boolean): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        actionedAt: Date;
        message: string;
    }>;
    dismissRoutine(userId: string, routineId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        actionedAt: Date;
        message: string;
    }>;
    expireOldRoutines(): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
export {};
