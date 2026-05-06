export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    globalDelay: number;
}
export declare class RateLimiterService {
    private readonly logger;
    private requestQueue;
    private processing;
    private lastRequestTime;
    private requestCounts;
    private readonly config;
    queueRequest<T>(key: string, requestFn: () => Promise<T>, priority?: 'high' | 'normal' | 'low'): Promise<T>;
    private processQueue;
    private canMakeRequest;
    private recordRequest;
    getRateLimitStatus(): {
        queueSize: number;
        lastRequestTime: number;
        processing: boolean;
    };
    cleanup(): void;
    private sleep;
}
