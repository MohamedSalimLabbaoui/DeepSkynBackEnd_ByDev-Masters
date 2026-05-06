import { RoutineService, RoutineStep } from './routine.service';
import { CreateRoutineDto, UpdateRoutineDto, GenerateRoutineDto, RoutineType, AdviseRoutineDto, RecommendProductDto, ProductRecommendation, ShareRoutineDto } from './dto';
import { Routine } from '@prisma/client';
export declare class RoutineController {
    private readonly routineService;
    constructor(routineService: RoutineService);
    create(userId: string, createRoutineDto: CreateRoutineDto): Promise<Routine>;
    generateWithAI(userId: string, generateRoutineDto: GenerateRoutineDto): Promise<Routine>;
    findAll(userId: string, type?: RoutineType, isActive?: string, isAIGenerated?: string): Promise<Routine[]>;
    getStatistics(userId: string): Promise<{
        total: number;
        active: number;
        aiGenerated: number;
        byType: {
            AM: number;
            PM: number;
            weekly: number;
        };
    }>;
    recommendProduct(userId: string, dto: RecommendProductDto): Promise<ProductRecommendation>;
    getActiveByType(userId: string, type: RoutineType): Promise<Routine[]>;
    findOne(id: string, userId: string): Promise<Routine>;
    update(id: string, userId: string, updateRoutineDto: UpdateRoutineDto): Promise<Routine>;
    toggleActive(id: string, userId: string): Promise<Routine>;
    completeStep(id: string, stepOrder: string, userId: string, isCompleted: boolean): Promise<Routine>;
    resetSteps(id: string, userId: string): Promise<Routine>;
    addStep(id: string, userId: string, step: RoutineStep): Promise<Routine>;
    removeStep(id: string, stepOrder: string, userId: string): Promise<Routine>;
    reorderSteps(id: string, userId: string, newOrder: number[]): Promise<Routine>;
    adviseOnChange(id: string, userId: string, adviseDto: AdviseRoutineDto): Promise<{
        advice: string;
        rating: string;
        emoji: string;
    }>;
    duplicate(id: string, userId: string, newName?: string): Promise<Routine>;
    shareRoutine(id: string, userId: string, shareDto: ShareRoutineDto): Promise<any>;
    findByUser(userId: string): Promise<Routine[]>;
    remove(id: string, userId: string): Promise<void>;
}
