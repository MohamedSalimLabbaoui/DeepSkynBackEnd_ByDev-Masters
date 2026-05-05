import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  providers: [RateLimiterService, CacheService],
  exports: [RateLimiterService, CacheService],
})
export class SharedModule {}
