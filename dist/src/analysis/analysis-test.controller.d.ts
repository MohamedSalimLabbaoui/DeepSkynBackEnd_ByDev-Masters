import { OnModuleInit } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { GeminiService, GeminiAnalysisResult } from './services/gemini.service';
import { SupabaseService, UploadResult } from './services/supabase.service';
import { RealTimeScanDto, RealTimeScanResult } from './dto/real-time-scan.dto';
import { Analysis } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AnalysisTestController implements OnModuleInit {
    private readonly analysisService;
    private readonly geminiService;
    private readonly supabaseService;
    private readonly prisma;
    private testUserId;
    constructor(analysisService: AnalysisService, geminiService: GeminiService, supabaseService: SupabaseService, prisma: PrismaService);
    onModuleInit(): Promise<void>;
    testUploadImage(file: Express.Multer.File): Promise<UploadResult>;
    testUploadImages(files: Express.Multer.File[]): Promise<UploadResult[]>;
    testAnalyze(files: Express.Multer.File[], questionnaire?: string): Promise<Analysis>;
    testGeminiAnalysis(imageUrls: string[], questionnaire?: Record<string, any>): Promise<GeminiAnalysisResult>;
    testRealTimeScan(realTimeScanDto: RealTimeScanDto): Promise<RealTimeScanResult>;
    testGeminiPing(): Promise<{
        status: string;
        message: string;
    }>;
}
