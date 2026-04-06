import { Injectable, Logger } from '@nestjs/common';

export interface QuotaInfo {
  isExhausted: boolean;
  retryAfterSeconds?: number;
  quotaMetric?: string;
  dailyLimit?: number;
  resetTime?: Date;
}

@Injectable()
export class QuotaTracker {
  private readonly logger = new Logger(QuotaTracker.name);
  private quotaStates = new Map<string, QuotaInfo>();

  /**
   * Parse Gemini API error response for quota information
   */
  parseGeminiQuotaError(error: any): QuotaInfo | null {
    try {
      const errorData = error.response?.data?.error;
      if (!errorData || errorData.code !== 429) {
        return null;
      }

      const quotaFailures = errorData.details?.find(
        (detail: any) => detail['@type']?.includes('QuotaFailure')
      );

      const retryInfo = errorData.details?.find(
        (detail: any) => detail['@type']?.includes('RetryInfo')
      );

      if (quotaFailures?.violations?.[0]) {
        const violation = quotaFailures.violations[0];
        const retryDelay = retryInfo?.retryDelay;
        
        // Parse retry delay (e.g., "50s" -> 50 seconds)
        let retryAfterSeconds: number | undefined;
        if (retryDelay) {
          const match = retryDelay.match(/(\d+)s?/);
          if (match) {
            retryAfterSeconds = parseInt(match[1], 10);
          }
        }

        const quotaInfo: QuotaInfo = {
          isExhausted: true,
          quotaMetric: violation.quotaMetric,
          dailyLimit: violation.quotaValue ? parseInt(violation.quotaValue, 10) : undefined,
          retryAfterSeconds,
          resetTime: retryAfterSeconds ? new Date(Date.now() + retryAfterSeconds * 1000) : undefined,
        };

        this.logger.warn(
          `Quota exhausted: ${quotaInfo.quotaMetric}, limit: ${quotaInfo.dailyLimit}, retry in: ${retryAfterSeconds}s`
        );

        return quotaInfo;
      }
    } catch (parseError) {
      this.logger.error('Failed to parse quota error', parseError);
    }

    return null;
  }

  /**
   * Record quota exhaustion for a service
   */
  recordQuotaExhaustion(serviceKey: string, quotaInfo: QuotaInfo): void {
    this.quotaStates.set(serviceKey, quotaInfo);
    
    // Auto-clear after reset time
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

  /**
   * Check if quota is currently exhausted for a service
   */
  isQuotaExhausted(serviceKey: string): boolean {
    const state = this.quotaStates.get(serviceKey);
    if (!state || !state.isExhausted) {
      return false;
    }

    // Check if quota should have reset by now
    if (state.resetTime && Date.now() > state.resetTime.getTime()) {
      this.quotaStates.delete(serviceKey);
      this.logger.log(`Quota auto-reset for ${serviceKey}`);
      return false;
    }

    return true;
  }

  /**
   * Get quota information for a service
   */
  getQuotaInfo(serviceKey: string): QuotaInfo | null {
    return this.quotaStates.get(serviceKey) || null;
  }

  /**
   * Get time until quota reset
   */
  getTimeUntilReset(serviceKey: string): number {
    const state = this.quotaStates.get(serviceKey);
    if (!state?.resetTime) {
      return 0;
    }

    return Math.max(0, state.resetTime.getTime() - Date.now());
  }

  /**
   * Clear quota state (for manual reset)
   */
  clearQuotaState(serviceKey: string): void {
    this.quotaStates.delete(serviceKey);
    this.logger.log(`Manually cleared quota state for ${serviceKey}`);
  }
}