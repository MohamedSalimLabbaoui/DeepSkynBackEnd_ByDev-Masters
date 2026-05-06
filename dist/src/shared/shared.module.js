"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const rate_limiter_service_1 = require("./services/rate-limiter.service");
const cache_service_1 = require("./services/cache.service");
const metrics_service_1 = require("./metrics.service");
const metrics_controller_1 = require("./metrics.controller");
const metrics_middleware_1 = require("./metrics.middleware");
let SharedModule = class SharedModule {
    configure(consumer) {
        consumer.apply(metrics_middleware_1.MetricsMiddleware).exclude('metrics').forRoutes('*');
    }
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [metrics_controller_1.MetricsController],
        providers: [rate_limiter_service_1.RateLimiterService, cache_service_1.CacheService, metrics_service_1.MetricsService],
        exports: [rate_limiter_service_1.RateLimiterService, cache_service_1.CacheService, metrics_service_1.MetricsService],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map