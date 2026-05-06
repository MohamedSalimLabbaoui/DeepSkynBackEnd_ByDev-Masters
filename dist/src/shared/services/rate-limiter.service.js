"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RateLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterService = void 0;
const common_1 = require("@nestjs/common");
let RateLimiterService = RateLimiterService_1 = class RateLimiterService {
    constructor() {
        this.logger = new common_1.Logger(RateLimiterService_1.name);
        this.requestQueue = [];
        this.processing = false;
        this.lastRequestTime = 0;
        this.requestCounts = new Map();
        this.config = {
            windowMs: 60 * 1000,
            maxRequests: 15,
            globalDelay: 4000,
        };
    }
    async queueRequest(key, requestFn, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const request = { resolve, reject, key, requestFn };
            if (priority === 'high') {
                this.requestQueue.unshift(request);
            }
            else if (priority === 'low') {
                this.requestQueue.push(request);
            }
            else {
                const midPoint = Math.floor(this.requestQueue.length / 2);
                this.requestQueue.splice(midPoint, 0, request);
            }
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.processing) {
            return;
        }
        this.processing = true;
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (!request)
                break;
            try {
                if (!this.canMakeRequest(request.key)) {
                    this.logger.warn(`Rate limit exceeded for ${request.key}, queueing...`);
                    this.requestQueue.push(request);
                    await this.sleep(this.config.globalDelay);
                    continue;
                }
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                if (timeSinceLastRequest < this.config.globalDelay) {
                    const delayNeeded = this.config.globalDelay - timeSinceLastRequest;
                    this.logger.debug(`Global rate limit: waiting ${delayNeeded}ms`);
                    await this.sleep(delayNeeded);
                }
                this.recordRequest(request.key);
                this.lastRequestTime = Date.now();
                const result = await request.requestFn();
                request.resolve(result);
            }
            catch (error) {
                request.reject(error);
            }
            await this.sleep(100);
        }
        this.processing = false;
    }
    canMakeRequest(key) {
        const now = Date.now();
        const record = this.requestCounts.get(key);
        if (!record || now - record.windowStart >= this.config.windowMs) {
            return true;
        }
        return record.count < this.config.maxRequests;
    }
    recordRequest(key) {
        const now = Date.now();
        const record = this.requestCounts.get(key);
        if (!record || now - record.windowStart >= this.config.windowMs) {
            this.requestCounts.set(key, { count: 1, windowStart: now });
        }
        else {
            record.count++;
        }
    }
    getRateLimitStatus() {
        return {
            queueSize: this.requestQueue.length,
            lastRequestTime: this.lastRequestTime,
            processing: this.processing,
        };
    }
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.requestCounts.entries()) {
            if (now - record.windowStart >= this.config.windowMs * 2) {
                this.requestCounts.delete(key);
            }
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.RateLimiterService = RateLimiterService;
exports.RateLimiterService = RateLimiterService = RateLimiterService_1 = __decorate([
    (0, common_1.Injectable)()
], RateLimiterService);
//# sourceMappingURL=rate-limiter.service.js.map