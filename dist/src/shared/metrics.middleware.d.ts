import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
export declare class MetricsMiddleware implements NestMiddleware {
    private readonly metricsService;
    constructor(metricsService: MetricsService);
    use(req: Request, res: Response, next: NextFunction): void;
}
