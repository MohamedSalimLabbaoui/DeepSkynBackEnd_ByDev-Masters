"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    constructor() {
        this.registry = new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry, prefix: 'deepskyn_' });
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status'],
            registers: [this.registry],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });
        this.activeUsers = new prom_client_1.Gauge({
            name: 'deepskyn_active_users_total',
            help: 'Number of currently active users',
            registers: [this.registry],
        });
        this.skinAnalysisTotal = new prom_client_1.Counter({
            name: 'deepskyn_skin_analysis_total',
            help: 'Total number of skin analyses performed',
            labelNames: ['status'],
            registers: [this.registry],
        });
        this.signTranslationTotal = new prom_client_1.Counter({
            name: 'deepskyn_sign_translation_total',
            help: 'Total number of sign-language translation requests',
            labelNames: ['language', 'status'],
            registers: [this.registry],
        });
        this.keycloakAuthTotal = new prom_client_1.Counter({
            name: 'deepskyn_keycloak_auth_total',
            help: 'Total number of Keycloak authentication attempts',
            labelNames: ['action', 'status'],
            registers: [this.registry],
        });
    }
    async getMetrics() {
        return this.registry.metrics();
    }
    getContentType() {
        return this.registry.contentType;
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map