import { ChurnService } from './churn.service';
export declare class ChurnController {
    private readonly churnService;
    constructor(churnService: ChurnService);
    getStats(): Promise<{
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
    analyzeAll(): Promise<{
        message: string;
        totalUsers: number;
        atRiskCount: number;
        criticalCount: number;
    }>;
    getAtRiskUsers(limit?: string): Promise<{
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
    predictUser(userId: string): Promise<{
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
    } | {
        error: string;
    }>;
    sendEmails(): Promise<{
        sent: number;
        skipped: number;
        failed: number;
        message: string;
    }>;
}
