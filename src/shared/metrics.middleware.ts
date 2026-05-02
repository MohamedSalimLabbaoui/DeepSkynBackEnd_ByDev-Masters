import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

/**
 * HTTP middleware that records request count and duration for every route.
 * Registered globally in AppModule (or main.ts) via app.use().
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const durationSec = (Date.now() - start) / 1000;
      const route = (req.route?.path as string) || req.path || 'unknown';
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };

      this.metricsService.httpRequestsTotal.inc(labels);
      this.metricsService.httpRequestDuration.observe(labels, durationSec);
    });

    next();
  }
}
