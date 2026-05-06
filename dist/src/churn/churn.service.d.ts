import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
interface PredictionResult {
    id: string;
    churnProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    isChurned: boolean;
}
interface PredictionOutput {
    predictions: PredictionResult[];
    totalUsers: number;
    atRiskCount: number;
    criticalCount: number;
}
export declare class ChurnService implements OnModuleInit {
    private readonly prisma;
    private readonly mailService;
    private readonly configService;
    private readonly logger;
    private readonly mlDir;
    private pythonPath;
    private modelReady;
    private readonly FALLBACK_THRESHOLDS;
    constructor(prisma: PrismaService, mailService: MailService, configService: ConfigService);
    onModuleInit(): Promise<void>;
    scheduledChurnAnalysis(): Promise<void>;
    analyzeAllUsers(): Promise<PredictionOutput>;
    private predictWithMLModel;
    private predictWithFallback;
    sendReEngagementEmails(): Promise<{
        sent: number;
        skipped: number;
        failed: number;
    }>;
    getChurnStats(): Promise<{
        totalUsers: number;
        analyzedUsers: number;
        lowRisk: number;
        mediumRisk: number;
        highRisk: number;
        criticalRisk: number;
        emailsSentToday: number;
        lastAnalysis: string;
        modelReady: boolean;
    }>;
    predictSingleUser(userId: string): Promise<{
        email: string;
        name: string;
        interactionCount: number;
        sessionCount: number;
        daysSinceLastActivity: number;
        accountAgeDays: number;
        id: string;
        churnProbability: number;
        riskLevel: "low" | "medium" | "high" | "critical";
        isChurned: boolean;
    }>;
    getAtRiskUsers(limit?: number): Promise<{
        id: string;
        email: string;
        name: string;
        lastActivity: Date;
        interactionCount: number;
        sessionCount: number;
        churnRiskScore: number;
        churnRiskLevel: string;
        lastChurnAnalysis: Date;
        reEngagementSentAt: Date;
        createdAt: Date;
    }[]>;
}
export {};
