import { AdminBiService } from './admin-bi.service';
export declare class AdminBiController {
    private readonly adminBiService;
    constructor(adminBiService: AdminBiService);
    getDashboard(): Promise<{
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
            activitySeries: {
                date: string;
                analyses: number;
                chats: number;
                posts: number;
                signups: number;
            }[];
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
}
