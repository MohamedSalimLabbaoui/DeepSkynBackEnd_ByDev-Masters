import { PrismaService } from '../prisma/prisma.service';
import { DigitalTwinService } from '../digital-twin/digital-twin.service';
import { PredictiveRoutineService } from '../predictive-routine/predictive-routine.service';
export declare class UserJourneyController {
    private readonly prisma;
    private readonly digitalTwinService;
    private readonly predictiveRoutineService;
    constructor(prisma: PrismaService, digitalTwinService: DigitalTwinService, predictiveRoutineService: PredictiveRoutineService);
    getSkinJourney(req: any): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            avatar: string;
            memberSince: Date;
        };
        latestAnalysis: {
            id: string;
            healthScore: number;
            skinAge: number;
            conditions: string[];
            createdAt: Date;
        };
        digitalTwin: {
            enabled: boolean;
            snapshotCount: number;
            confidence: number;
            predictionsUnlocked: boolean;
            currentState: import("@prisma/client/runtime/library").JsonValue;
            trendAnalysis: import("@prisma/client/runtime/library").JsonValue;
            seasonalPatterns: import("@prisma/client/runtime/library").JsonValue;
            improvementRate: number;
            lastUpdated: Date;
            insights: string[];
        };
        predictiveRoutine: {
            id: string;
            status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
            routine: import("@prisma/client/runtime/library").JsonValue;
            generatedAt: Date;
            expiresAt: Date;
            twinEnhanced: boolean;
            confidence: number;
        };
        activeRoutine: {
            id: string;
            name: string;
            type: string;
            steps: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            createdAt: Date;
            currentDay: number;
            totalDays: number;
        };
        systemState: string;
        insights: string[];
        recommendations: {
            nextScan: any;
            actionItems: any[];
        };
    }>;
    private calculateSystemState;
    private generateInsights;
    private getDigitalTwinInsights;
    private getRecommendations;
    private calculateCurrentDay;
}
