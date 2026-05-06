import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { NotificationService } from '../notification/notification.service';
import { CrawlingService } from '../crawling/crawling.service';
import { PostsService } from '../posts/posts.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateRoutineDto, UpdateRoutineDto, GenerateRoutineDto, RoutineType, AdviseRoutineDto, RecommendProductDto, ProductRecommendation, ShareRoutineDto } from './dto';
import { Routine } from '@prisma/client';
export interface RoutineStep {
    order: number;
    name: string;
    productName?: string;
    productBrand?: string;
    productImage?: string;
    description?: string;
    duration?: number;
    category?: string;
    isCompleted?: boolean;
}
export interface AIGeneratedRoutine {
    name: string;
    type: string;
    steps: RoutineStep[];
    notes?: string;
    reasoning?: string;
}
export declare class RoutineService {
    private readonly prisma;
    private readonly geminiService;
    private readonly skinProfileService;
    private readonly notificationService;
    private readonly crawlingService;
    private readonly postsService;
    private readonly subscriptionService;
    private readonly logger;
    private readonly freeMonthlyAiRoutineLimit;
    constructor(prisma: PrismaService, geminiService: GeminiService, skinProfileService: SkinProfileService, notificationService: NotificationService, crawlingService: CrawlingService, postsService: PostsService, subscriptionService: SubscriptionService);
    private enforceAiRoutineAccess;
    create(userId: string, createRoutineDto: CreateRoutineDto): Promise<Routine>;
    generateWithAI(userId: string, generateDto: GenerateRoutineDto): Promise<Routine>;
    private generateRoutineWithGemini;
    private buildRoutinePrompt;
    private parseAIResponse;
    private extractStepsFromAdvice;
    private getDefaultRoutine;
    findAllByUser(userId: string, options?: {
        type?: RoutineType;
        isActive?: boolean;
        isAIGenerated?: boolean;
    }): Promise<Routine[]>;
    findOne(id: string, userId: string): Promise<Routine>;
    update(id: string, userId: string, updateRoutineDto: UpdateRoutineDto): Promise<Routine>;
    toggleActive(id: string, userId: string): Promise<Routine>;
    updateStepCompletion(id: string, userId: string, stepOrder: number, isCompleted: boolean): Promise<Routine>;
    resetStepsCompletion(id: string, userId: string): Promise<Routine>;
    duplicate(id: string, userId: string, newName?: string): Promise<Routine>;
    remove(id: string, userId: string): Promise<void>;
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
    private getRoutineTypeName;
    addStep(id: string, userId: string, step: RoutineStep): Promise<Routine>;
    removeStep(id: string, userId: string, stepOrder: number): Promise<Routine>;
    reorderSteps(id: string, userId: string, newOrder: number[]): Promise<Routine>;
    adviseOnChange(userId: string, routineId: string, adviseDto: AdviseRoutineDto): Promise<{
        advice: string;
        rating: string;
        emoji: string;
    }>;
    recommendProductForStep(userId: string, dto: RecommendProductDto): Promise<ProductRecommendation>;
    private getFallbackProduct;
    shareAsPost(routineId: string, userId: string, shareDto: ShareRoutineDto): Promise<any>;
    private formatRoutineAsPost;
}
