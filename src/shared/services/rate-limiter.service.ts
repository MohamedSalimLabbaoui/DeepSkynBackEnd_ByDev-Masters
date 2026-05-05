import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  globalDelay: number; // Minimum delay between any requests
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    key: string;
    requestFn: () => Promise<any>;
  }> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestCounts = new Map<
    string,
    { count: number; windowStart: number }
  >();

  private readonly config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute window
    maxRequests: 15, // Conservative limit for Gemini free tier
    globalDelay: 4000, // 4 seconds between requests
  };

  /**
   * Queue a request to respect rate limits globally
   */
  async queueRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request = { resolve, reject, key, requestFn };

      // Insert based on priority
      if (priority === 'high') {
        this.requestQueue.unshift(request);
      } else if (priority === 'low') {
        this.requestQueue.push(request);
      } else {
        // Insert in middle for normal priority
        const midPoint = Math.floor(this.requestQueue.length / 2);
        this.requestQueue.splice(midPoint, 0, request);
      }

      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) break;

      try {
        // Check rate limit for this key
        if (!this.canMakeRequest(request.key)) {
          this.logger.warn(
            `Rate limit exceeded for ${request.key}, queueing...`,
          );
          // Re-queue at end
          this.requestQueue.push(request);
          await this.sleep(this.config.globalDelay);
          continue;
        }

        // Ensure global delay between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.config.globalDelay) {
          const delayNeeded = this.config.globalDelay - timeSinceLastRequest;
          this.logger.debug(`Global rate limit: waiting ${delayNeeded}ms`);
          await this.sleep(delayNeeded);
        }

        // Make the request
        this.recordRequest(request.key);
        this.lastRequestTime = Date.now();

        const result = await request.requestFn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between processing requests
      await this.sleep(100);
    }

    this.processing = false;
  }

  /**
   * Check if a request can be made for the given key
   */
  private canMakeRequest(key: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now - record.windowStart >= this.config.windowMs) {
      // New window or first request
      return true;
    }

    return record.count < this.config.maxRequests;
  }

  /**
   * Record a request for rate limiting
   */
  private recordRequest(key: string) {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now - record.windowStart >= this.config.windowMs) {
      // New window
      this.requestCounts.set(key, { count: 1, windowStart: now });
    } else {
      // Increment in current window
      record.count++;
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    queueSize: number;
    lastRequestTime: number;
    processing: boolean;
  } {
    return {
      queueSize: this.requestQueue.length,
      lastRequestTime: this.lastRequestTime,
      processing: this.processing,
    };
  }

  /**
   * Clear old rate limit records (cleanup)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now - record.windowStart >= this.config.windowMs * 2) {
        this.requestCounts.delete(key);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
