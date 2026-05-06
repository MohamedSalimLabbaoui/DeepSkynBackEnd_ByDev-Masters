export interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export declare class CacheService {
    private readonly logger;
    private cache;
    private cleanupInterval;
    constructor();
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
    getStats(): {
        size: number;
        keys: string[];
    };
    private cleanup;
    onModuleDestroy(): void;
}
