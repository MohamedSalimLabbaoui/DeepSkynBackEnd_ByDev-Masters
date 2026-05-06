import { PrismaService } from '../prisma/prisma.service';
type DailyPoint = {
    date: string;
    analyses: number;
    chats: number;
    posts: number;
    signups: number;
};
export declare class AdminBiService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboardData(): Promise<{
        generatedAt: string;
        kpis: {
            totalUsers: number;
            newUsersLast30: number;
            userGrowthRate: number;
            activeUsersLast30: number;
            payingUsers: number;
            conversionRate: number;
            mrr: number;
            arpu: number;
            totalRevenueAllTime: number;
            revenue30: number;
            revenueGrowthRate: number;
        };
        funnel: {
            registered: number;
            onboarded: number;
            analyzed: number;
            subscribed: number;
            retained30d: number;
        };
        engagement: {
            activitySeries: DailyPoint[];
            avgAnalysisProcessingTimeMs: number;
            analysesLast30: number;
        };
        churn: {
            avgRiskScore: number;
            riskDistribution: {
                name: string;
                value: number;
            }[];
        };
        support: {
            skinAlertsLast30: number;
            unreadAlerts: number;
        };
        insights: {
            topConcerns: {
                name: string;
                value: number;
            }[];
        };
    }>;
    private getAvgRiskScore;
    private getTopConcerns;
    private getRiskDistribution;
    private buildDailySeries;
    private safeRate;
    private subDays;
    private addDays;
    private startOfDay;
    private dateKey;
}
export {};
