export declare class ChurnPredictionDto {
    id: string;
    churnProbability: number;
    riskLevel: string;
    isChurned: boolean;
}
export declare class ChurnReportDto {
    totalUsers: number;
    atRiskCount: number;
    criticalCount: number;
    predictions: ChurnPredictionDto[];
}
export declare class ChurnStatsDto {
    totalUsers: number;
    analyzedUsers: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    criticalRisk: number;
    emailsSentToday: number;
    lastAnalysis: string;
}
