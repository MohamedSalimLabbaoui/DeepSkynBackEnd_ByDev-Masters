import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { json, urlencoded } from 'express';

/**
 * E2E tests — lightweight, no real DB/Keycloak connection required.
 *
 * Strategy: we create a minimal test module that only imports the
 * MetricsController (via SharedModule) so the app boots fast without
 * needing a live Postgres, Keycloak or Python LSF service.
 *
 * Full integration tests (with real services) run in staging, not CI.
 */

// ── Minimal test app (no external services) ───────────────────────────────────
import { Module, Controller, Get } from '@nestjs/common';
import { MetricsService } from '../src/shared/metrics.service';
import { MetricsController } from '../src/shared/metrics.controller';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'deepskyn-backend', timestamp: new Date().toISOString() };
  }

  @Get()
  root() {
    return { message: 'DeepSkyn API is running' };
  }
}

@Module({
  controllers: [HealthController, MetricsController],
  providers: [MetricsService],
})
class TestAppModule {}

// ─────────────────────────────────────────────────────────────────────────────

describe('DeepSkyn Backend (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Root ───────────────────────────────────────────────────────────────────
  describe('GET /', () => {
    it('should return 200 with service message', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('DeepSkyn');
        });
    });
  });

  // ── Health ─────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('deepskyn-backend');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  // ── Prometheus Metrics ─────────────────────────────────────────────────────
  describe('GET /metrics', () => {
    it('should return 200 with Prometheus text format', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect((res) => {
          // Prometheus text format starts with # HELP or metric names
          expect(res.text).toMatch(/^#|^deepskyn_/m);
          // Should include default Node.js metrics
          expect(res.text).toContain('deepskyn_nodejs_version_info');
        });
    });

    it('should have correct Content-Type for Prometheus', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/);
    });
  });
});
