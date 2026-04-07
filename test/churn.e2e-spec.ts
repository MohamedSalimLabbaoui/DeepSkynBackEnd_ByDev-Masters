import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ChurnController } from '../src/churn/churn.controller';
import { ChurnService } from '../src/churn/churn.service';
import { KeycloakAuthGuard } from '../src/auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('ChurnController (e2e)', () => {
  let app: INestApplication;

  const churnServiceMock = {
    getChurnStats: jest.fn(),
    analyzeAllUsers: jest.fn(),
    getAtRiskUsers: jest.fn(),
    predictSingleUser: jest.fn(),
    sendReEngagementEmails: jest.fn(),
  };

  const authGuardMock = {
    canActivate: jest.fn(() => true),
  };

  const rolesGuardMock = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const testingModule = Test.createTestingModule({
      controllers: [ChurnController],
      providers: [
        { provide: ChurnService, useValue: churnServiceMock },
      ],
    })
      .overrideGuard(KeycloakAuthGuard)
      .useValue(authGuardMock)
      .overrideGuard(RolesGuard)
      .useValue(rolesGuardMock);

    const moduleRef = await testingModule.compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authGuardMock.canActivate.mockReturnValue(true);
    rolesGuardMock.canActivate.mockReturnValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /churn/stats should return 403 when auth guard denies', async () => {
    authGuardMock.canActivate.mockReturnValue(false);

    await request(app.getHttpServer()).get('/churn/stats').expect(403);
  });

  it('GET /churn/stats should return stats for admin', async () => {
    churnServiceMock.getChurnStats.mockResolvedValue({ totalUsers: 10, modelReady: true });

    const res = await request(app.getHttpServer()).get('/churn/stats').expect(200);

    expect(res.body).toMatchObject({ totalUsers: 10, modelReady: true });
  });

  it('POST /churn/analyze should return summary payload', async () => {
    churnServiceMock.analyzeAllUsers.mockResolvedValue({
      totalUsers: 12,
      atRiskCount: 4,
      criticalCount: 1,
    });

    const res = await request(app.getHttpServer()).post('/churn/analyze').expect(200);

    expect(res.body).toMatchObject({
      totalUsers: 12,
      atRiskCount: 4,
      criticalCount: 1,
    });
  });

  it('GET /churn/at-risk should pass limit and return list', async () => {
    churnServiceMock.getAtRiskUsers.mockResolvedValue([{ id: 'u1' }]);

    const res = await request(app.getHttpServer())
      .get('/churn/at-risk')
      .query({ limit: 5 })
      .expect(200);

    expect(churnServiceMock.getAtRiskUsers).toHaveBeenCalledWith(5);
    expect(res.body).toEqual([{ id: 'u1' }]);
  });

  it('GET /churn/user/:id should return 200 + prediction', async () => {
    churnServiceMock.predictSingleUser.mockResolvedValue({ id: 'u1', riskLevel: 'high' });

    const res = await request(app.getHttpServer()).get('/churn/user/u1').expect(200);

    expect(res.body).toMatchObject({ id: 'u1', riskLevel: 'high' });
  });

  it('POST /churn/send-emails should return send summary', async () => {
    churnServiceMock.sendReEngagementEmails.mockResolvedValue({ sent: 2, skipped: 1, failed: 0 });

    const res = await request(app.getHttpServer()).post('/churn/send-emails').expect(200);

    expect(res.body).toMatchObject({ sent: 2, skipped: 1, failed: 0 });
  });
});
