import { ChurnService } from './churn.service';

describe('ChurnService', () => {
  let service: ChurnService;

  const mockPrisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockMailService = {
    sendReEngagementEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('python'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChurnService(
      mockPrisma as any,
      mockMailService as any,
      mockConfigService as any,
    );
    (service as any).modelReady = false;
  });

  it('should fallback-score users into risk buckets', () => {
    const users = [
      {
        id: 'u-low',
        email: 'low@test.com',
        name: 'Low',
        interactionCount: 120,
        daysSinceLastActivity: 1,
        sessionCount: 80,
        accountAgeDays: 180,
      },
      {
        id: 'u-risk',
        email: 'risk@test.com',
        name: 'Risk',
        interactionCount: 1,
        daysSinceLastActivity: 95,
        sessionCount: 1,
        accountAgeDays: 180,
      },
    ];

    const predictions = (service as any).predictWithFallback(users);

    expect(predictions).toHaveLength(2);
    expect(predictions[0].riskLevel).toBe('low');
    expect(['high', 'critical']).toContain(predictions[1].riskLevel);
    expect(predictions[1].churnProbability).toBeGreaterThanOrEqual(0.75);
  });

  it('should analyze all users and persist churn score fields', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'u1@test.com',
        name: 'U1',
        interactionCount: 2,
        lastActivity: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
        sessionCount: 2,
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'u2',
        email: 'u2@test.com',
        name: 'U2',
        interactionCount: 40,
        lastActivity: new Date(),
        sessionCount: 20,
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      },
    ]);

    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.analyzeAllUsers();

    expect(result.totalUsers).toBe(2);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);

    const firstUpdateArg = mockPrisma.user.update.mock.calls[0][0];
    expect(firstUpdateArg.data).toHaveProperty('churnRiskScore');
    expect(firstUpdateArg.data).toHaveProperty('churnRiskLevel');
    expect(firstUpdateArg.data).toHaveProperty('lastChurnAnalysis');
  });

  it('should return normalized churn stats payload', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(35)
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(7);

    mockPrisma.user.findFirst.mockResolvedValue({
      lastChurnAnalysis: new Date('2026-04-01T10:00:00.000Z'),
    });

    const stats = await service.getChurnStats();

    expect(stats).toMatchObject({
      totalUsers: 100,
      analyzedUsers: 80,
      lowRisk: 20,
      mediumRisk: 30,
      highRisk: 35,
      criticalRisk: 15,
      emailsSentToday: 7,
      modelReady: false,
    });
    expect(stats.lastAnalysis).toBe('2026-04-01T10:00:00.000Z');
  });

  it('should fetch at-risk users ordered by score', async () => {
    const rows = [{ id: 'u1' }, { id: 'u2' }];
    mockPrisma.user.findMany.mockResolvedValue(rows);

    const data = await service.getAtRiskUsers(5);

    expect(data).toBe(rows);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          churnRiskLevel: { in: ['high', 'critical'] },
        }),
        orderBy: { churnRiskScore: 'desc' },
        take: 5,
      }),
    );
  });

  it('should predict one user and persist result', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u1@test.com',
      name: 'U1',
      interactionCount: 3,
      lastActivity: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      sessionCount: 2,
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      churnRiskScore: null,
      churnRiskLevel: null,
      lastChurnAnalysis: null,
    });

    mockPrisma.user.update.mockResolvedValue({});

    const prediction = await service.predictSingleUser('u1');

    expect(prediction).toBeTruthy();
    expect(prediction).toHaveProperty('churnProbability');
    expect(prediction).toHaveProperty('riskLevel');
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });
});
