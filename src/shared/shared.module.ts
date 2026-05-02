import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { CacheService } from './services/cache.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [RateLimiterService, CacheService, MetricsService],
  exports: [RateLimiterService, CacheService, MetricsService],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP metrics middleware to all routes except /metrics itself
    consumer
      .apply(MetricsMiddleware)
      .exclude('metrics')
      .forRoutes('*');
  }
}