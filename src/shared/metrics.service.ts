import { Injectable } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: Registry;

  // ── HTTP Metrics ─────────────────────────────────────────
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDuration: Histogram<string>;

  // ── Business Metrics ─────────────────────────────────────
  readonly activeUsers: Gauge<string>;
  readonly skinAnalysisTotal: Counter<string>;
  readonly signTranslationTotal: Counter<string>;
  readonly keycloakAuthTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics (event loop lag, heap, GC, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'deepskyn_' });

    // ── HTTP ─────────────────────────────────────────────
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // ── Business ─────────────────────────────────────────
    this.activeUsers = new Gauge({
      name: 'deepskyn_active_users_total',
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.skinAnalysisTotal = new Counter({
      name: 'deepskyn_skin_analysis_total',
      help: 'Total number of skin analyses performed',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.signTranslationTotal = new Counter({
      name: 'deepskyn_sign_translation_total',
      help: 'Total number of sign-language translation requests',
      labelNames: ['language', 'status'],
      registers: [this.registry],
    });

    this.keycloakAuthTotal = new Counter({
      name: 'deepskyn_keycloak_auth_total',
      help: 'Total number of Keycloak authentication attempts',
      labelNames: ['action', 'status'], // action: login|register|refresh
      registers: [this.registry],
    });
  }

  /** Expose all metrics in Prometheus text format */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
