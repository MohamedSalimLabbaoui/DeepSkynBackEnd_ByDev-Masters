"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QuotaTracker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaTracker = void 0;
const common_1 = require("@nestjs/common");
let QuotaTracker = QuotaTracker_1 = class QuotaTracker {
    constructor() {
        this.logger = new common_1.Logger(QuotaTracker_1.name);
        this.quotaStates = new Map();
    }
    parseGeminiQuotaError(error) {
        try {
            const errorData = error.response?.data?.error;
            if (!errorData || errorData.code !== 429) {
                return null;
            }
            const quotaFailures = errorData.details?.find((detail) => detail['@type']?.includes('QuotaFailure'));
            const retryInfo = errorData.details?.find((detail) => detail['@type']?.includes('RetryInfo'));
            if (quotaFailures?.violations?.[0]) {
                const violation = quotaFailures.violations[0];
                const retryDelay = retryInfo?.retryDelay;
                let retryAfterSeconds;
                if (retryDelay) {
                    const match = retryDelay.match(/(\d+)s?/);
                    if (match) {
                        retryAfterSeconds = parseInt(match[1], 10);
                    }
                }
                const quotaInfo = {
                    isExhausted: true,
                    quotaMetric: violation.quotaMetric,
                    dailyLimit: violation.quotaValue
                        ? parseInt(violation.quotaValue, 10)
                        : undefined,
                    retryAfterSeconds,
                    resetTime: retryAfterSeconds
                        ? new Date(Date.now() + retryAfterSeconds * 1000)
                        : undefined,
                };
                this.logger.warn(`Quota exhausted: ${quotaInfo.quotaMetric}, limit: ${quotaInfo.dailyLimit}, retry in: ${retryAfterSeconds}s`);
                return quotaInfo;
            }
        }
        catch (parseError) {
            this.logger.error('Failed to parse quota error', parseError);
        }
        return null;
    }
    recordQuotaExhaustion(serviceKey, quotaInfo) {
        this.quotaStates.set(serviceKey, quotaInfo);
        if (quotaInfo.resetTime) {
            const timeUntilReset = quotaInfo.resetTime.getTime() - Date.now();
            if (timeUntilReset > 0) {
                setTimeout(() => {
                    this.quotaStates.delete(serviceKey);
                    this.logger.log(`Quota reset for ${serviceKey}`);
                }, timeUntilReset);
            }
        }
    }
    isQuotaExhausted(serviceKey) {
        const state = this.quotaStates.get(serviceKey);
        if (!state || !state.isExhausted) {
            return false;
        }
        if (state.resetTime && Date.now() > state.resetTime.getTime()) {
            this.quotaStates.delete(serviceKey);
            this.logger.log(`Quota auto-reset for ${serviceKey}`);
            return false;
        }
        return true;
    }
    getQuotaInfo(serviceKey) {
        return this.quotaStates.get(serviceKey) || null;
    }
    getTimeUntilReset(serviceKey) {
        const state = this.quotaStates.get(serviceKey);
        if (!state?.resetTime) {
            return 0;
        }
        return Math.max(0, state.resetTime.getTime() - Date.now());
    }
    clearQuotaState(serviceKey) {
        this.quotaStates.delete(serviceKey);
        this.logger.log(`Manually cleared quota state for ${serviceKey}`);
    }
};
exports.QuotaTracker = QuotaTracker;
exports.QuotaTracker = QuotaTracker = QuotaTracker_1 = __decorate([
    (0, common_1.Injectable)()
], QuotaTracker);
//# sourceMappingURL=quota-tracker.service.js.map