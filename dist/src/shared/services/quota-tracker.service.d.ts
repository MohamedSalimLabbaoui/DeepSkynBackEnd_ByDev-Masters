export interface QuotaInfo {
    isExhausted: boolean;
    retryAfterSeconds?: number;
    quotaMetric?: string;
    dailyLimit?: number;
    resetTime?: Date;
}
export declare class QuotaTracker {
    private readonly logger;
    private quotaStates;
    parseGeminiQuotaError(error: any): QuotaInfo | null;
    recordQuotaExhaustion(serviceKey: string, quotaInfo: QuotaInfo): void;
    isQuotaExhausted(serviceKey: string): boolean;
    getQuotaInfo(serviceKey: string): QuotaInfo | null;
    getTimeUntilReset(serviceKey: string): number;
    clearQuotaState(serviceKey: string): void;
}
