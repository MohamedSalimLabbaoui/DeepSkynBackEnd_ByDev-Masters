import { PrismaService } from '../prisma/prisma.service';
import { GeminiService, GeminiAnalysisResult } from './services/gemini.service';
import { SupabaseService } from './services/supabase.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { NotificationService } from '../notification/notification.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { DigitalTwinService } from '../digital-twin/digital-twin.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RealTimeScanDto, RealTimeScanResult } from './dto/real-time-scan.dto';
import { Analysis } from '@prisma/client';
import { Prisma } from '@prisma/client';
export interface AnalysisWithResults extends Analysis {
    geminiResults?: GeminiAnalysisResult;
}
export interface AnalysisStats {
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    averageHealthScore: number;
    averageProcessingTime: number;
    topConditions: {
        condition: string;
        count: number;
    }[];
}
export declare class AnalysisService {
    private readonly prisma;
    private readonly geminiService;
    private readonly supabaseService;
    private readonly skinProfileService;
    private readonly notificationService;
    private readonly subscriptionService;
    private readonly digitalTwinService;
    private readonly logger;
    private readonly freeMonthlyAnalysisLimit;
    constructor(prisma: PrismaService, geminiService: GeminiService, supabaseService: SupabaseService, skinProfileService: SkinProfileService, notificationService: NotificationService, subscriptionService: SubscriptionService, digitalTwinService: DigitalTwinService);
    private toSafeInt;
    private sanitizePreocupent;
    private buildRealtimeFallbackAnalysis;
    private buildEvolutionRemark;
    private enforceAnalysisAccess;
    createWithImages(userId: string, files: Express.Multer.File[], questionnaire?: Record<string, any>, preocupent?: string[], saveAnalysis?: boolean): Promise<Analysis>;
    private createUploadAnalysisPreview;
    create(userId: string, createAnalysisDto: CreateAnalysisDto): Promise<Analysis>;
    processRealTimeScan(userId: string, realTimeScanDto: RealTimeScanDto): Promise<RealTimeScanResult>;
    private buildCapturedScanImage;
    private normalizeRealTimeScanInput;
    private processAnalysis;
    private updateSkinProfile;
    private captureDigitalTwinSnapshot;
    findAllByUser(userId: string, page?: number, limit?: number): Promise<{
        analyses: Analysis[];
        total: number;
    }>;
    findAllForAdmin(options: {
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
        skinType?: string;
        minScore?: number;
        maxScore?: number;
        status?: string;
    }): Promise<{
        analyses: ({
            user: {
                id: string;
                email: string;
                name: string;
                skinProfile: {
                    skinType: string;
                    healthScore: number;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            skinAge: number | null;
            healthScore: number | null;
            userId: string;
            images: string[];
            questionnaire: Prisma.JsonValue | null;
            results: Prisma.JsonValue | null;
            conditions: string[];
            preocupent: string[];
            recommendations: Prisma.JsonValue | null;
            status: string;
            processingTime: number | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string, userId: string): Promise<Analysis>;
    findLatest(userId: string): Promise<Analysis | null>;
    retryAnalysis(id: string, userId: string): Promise<Analysis>;
    retryAnalysisForAdmin(id: string): Promise<Analysis>;
    remove(id: string, userId: string): Promise<Analysis>;
    getUserStats(userId: string): Promise<{
        totalAnalyses: number;
        averageHealthScore: number;
        healthScoreHistory: {
            date: Date;
            score: number;
        }[];
        commonConditions: string[];
    }>;
    getStatistics(): Promise<AnalysisStats>;
    getAdvice(userId: string): Promise<string>;
    compareAnalyses(userId: string, analysisId1: string, analysisId2: string): Promise<{
        analysis1: Analysis;
        analysis2: Analysis;
        comparison: {
            healthScoreChange: number;
            skinAgeChange: number;
            newConditions: string[];
            resolvedConditions: string[];
        };
    }>;
    recommendHair(userId: string, image: string, mimeType?: string): Promise<{
        title: string;
        description: string;
        imageUrl: string;
    }>;
}
