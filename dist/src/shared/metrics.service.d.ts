import { Registry, Counter, Histogram, Gauge } from 'prom-client';
export declare class MetricsService {
    readonly registry: Registry;
    readonly httpRequestsTotal: Counter<string>;
    readonly httpRequestDuration: Histogram<string>;
    readonly activeUsers: Gauge<string>;
    readonly skinAnalysisTotal: Counter<string>;
    readonly signTranslationTotal: Counter<string>;
    readonly keycloakAuthTotal: Counter<string>;
    constructor();
    getMetrics(): Promise<string>;
    getContentType(): string;
}
