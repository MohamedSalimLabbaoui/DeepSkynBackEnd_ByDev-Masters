import { PredictiveRoutineService } from './predictive-routine.service';
import { UpdateRoutineStatusDto, GetUserRoutinesQueryDto } from './dto/routine-status.dto';
declare class AnalysisResultDto {
    condition: string;
    detectedIssues: string[];
    skinType: string;
}
declare class GenerateRoutineDto {
    analysisId: string;
    analysisResult: AnalysisResultDto;
    latitude: number;
    longitude: number;
}
export declare class PredictiveRoutineController {
    private readonly service;
    constructor(service: PredictiveRoutineService);
    generateRoutine(userId: string, dto: GenerateRoutineDto): Promise<{
        id: string;
        routine: import("./predictive-routine.service").GeneratedRoutine;
        generatedAt: Date;
        expiresAt: Date;
        twinEnhanced: boolean;
        confidence: number;
    }>;
    validateRoutine(userId: string, routineId: string): Promise<{
        success: boolean;
        routineId: string;
        message: string;
    }>;
    getPendingRoutines(userId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        routine: import("@prisma/client/runtime/library").JsonValue;
        expiresAt: Date;
        generatedAt: Date;
        weatherData: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    getUserRoutines(userId: string, query: GetUserRoutinesQueryDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        routine: import("@prisma/client/runtime/library").JsonValue;
        feedback: string;
        expiresAt: Date;
        generatedAt: Date;
        weatherData: import("@prisma/client/runtime/library").JsonValue;
        actionedAt: Date;
    }[]>;
    updateRoutineStatus(userId: string, routineId: string, dto: UpdateRoutineStatusDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PredictiveRoutineStatus;
        actionedAt: Date;
        message: string;
    }>;
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
}
export {};
