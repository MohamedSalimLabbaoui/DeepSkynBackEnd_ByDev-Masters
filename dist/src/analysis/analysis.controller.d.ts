import { AnalysisService, AnalysisStats } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RealTimeScanDto, RealTimeScanResult } from './dto/real-time-scan.dto';
import { Analysis } from '@prisma/client';
export declare class AnalysisController {
    private readonly analysisService;
    constructor(analysisService: AnalysisService);
    createWithUpload(userId: string, files: Express.Multer.File[], questionnaire?: string, preocupent?: string, saveAnalysis?: string): Promise<Analysis>;
    create(userId: string, createAnalysisDto: CreateAnalysisDto): Promise<Analysis>;
    realTimeScan(userId: string, realTimeScanDto: RealTimeScanDto): Promise<RealTimeScanResult>;
    findAll(userId: string, page: number, limit: number): Promise<{
        analyses: Analysis[];
        total: number;
    }>;
    getUserStats(userId: string): Promise<{
        totalAnalyses: number;
        averageHealthScore: number;
        healthScoreHistory: {
            date: Date;
            score: number;
        }[];
        commonConditions: string[];
    }>;
    getAdvice(userId: string): Promise<{
        advice: string;
    }>;
    getLatest(userId: string): Promise<Analysis | null>;
    getStatistics(): Promise<AnalysisStats>;
    getAllForAdmin(page: number, limit: number, fromDate?: string, toDate?: string, skinType?: string, minScore?: string, maxScore?: string, status?: string): Promise<{
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
            questionnaire: import("@prisma/client/runtime/library").JsonValue | null;
            results: import("@prisma/client/runtime/library").JsonValue | null;
            conditions: string[];
            preocupent: string[];
            recommendations: import("@prisma/client/runtime/library").JsonValue | null;
            status: string;
            processingTime: number | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
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
    findOne(id: string, userId: string): Promise<Analysis>;
    retryAnalysis(id: string, userId: string): Promise<Analysis>;
    retryAnalysisForAdmin(id: string): Promise<Analysis>;
    remove(id: string, userId: string): Promise<void>;
    hairRecommendation(userId: string, image: string, mimeType: string): Promise<{
        title: string;
        description: string;
        imageUrl: string;
    }>;
}
