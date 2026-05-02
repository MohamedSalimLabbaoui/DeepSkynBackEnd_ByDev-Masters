import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SkinProfileService } from './skin-profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkinProfileDto } from './dto/create-skin-profile.dto';

describe('SkinProfileService', () => {
  let service: SkinProfileService;
  let prismaService: jest.Mocked<PrismaService>;

  const userId = 'user-uuid-001';

  const mockProfile = {
    id: 'profile-uuid-001',
    userId,
    skinType: 'oily',
    fitzpatrickType: 3,
    concerns: ['acne', 'oiliness'],
    sensitivities: ['fragrance'],
    skinAge: 28,
    healthScore: 72,
    lastAnalysisAt: new Date('2026-01-15'),  // Prisma returns Date
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createDto: CreateSkinProfileDto = {
    skinType: 'oily',
    fitzpatrickType: 3,
    concerns: ['acne', 'oiliness'],
    sensitivities: ['fragrance'],
    skinAge: 28,
    healthScore: 72,
    lastAnalysisAt: '2026-01-15T00:00:00.000Z',  // DTO expects ISO string
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkinProfileService,
        {
          provide: PrismaService,
          useValue: {
            skinProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              upsert: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            user: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SkinProfileService>(SkinProfileService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    it('should throw ConflictException if profile already exists', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and return a new profile', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (prismaService.skinProfile.create as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      const result = await service.create(userId, createDto);
      expect(result).toEqual(mockProfile);
      expect(prismaService.skinProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, skinType: 'oily' }),
      });
    });
  });

  // ─────────────────────────────────────────────
  // upsert
  // ─────────────────────────────────────────────
  describe('upsert', () => {
    it('should upsert and mark onboarding complete', async () => {
      (prismaService.skinProfile.upsert as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValueOnce({});

      const result = await service.upsert(userId, createDto);
      expect(result).toEqual(mockProfile);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { onboardingComplete: true },
      });
    });
  });

  // ─────────────────────────────────────────────
  // findByUserId
  // ─────────────────────────────────────────────
  describe('findByUserId', () => {
    it('should return profile when it exists', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      const result = await service.findByUserId(userId);
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(service.findByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────
  // findByUserIdOrNull
  // ─────────────────────────────────────────────
  describe('findByUserIdOrNull', () => {
    it('should return null when profile does not exist', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await service.findByUserIdOrNull(userId);
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // hasProfile
  // ─────────────────────────────────────────────
  describe('hasProfile', () => {
    it('should return true when user has a profile', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        { id: 'profile-id' },
      );
      expect(await service.hasProfile(userId)).toBe(true);
    });

    it('should return false when user has no profile', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );
      expect(await service.hasProfile(userId)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // addConcern
  // ─────────────────────────────────────────────
  describe('addConcern', () => {
    it('should add a new concern to the profile', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );
      const updatedProfile = {
        ...mockProfile,
        concerns: [...mockProfile.concerns, 'wrinkles'],
      };
      (prismaService.skinProfile.update as jest.Mock).mockResolvedValueOnce(
        updatedProfile,
      );

      const result = await service.addConcern(userId, 'wrinkles');
      expect(result.concerns).toContain('wrinkles');
    });

    it('should not duplicate an existing concern', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      // concern 'acne' already in the list → should return profile unchanged
      const result = await service.addConcern(userId, 'acne');
      expect(result).toEqual(mockProfile);
      expect(prismaService.skinProfile.update).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // removeConcern
  // ─────────────────────────────────────────────
  describe('removeConcern', () => {
    it('should remove the specified concern', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );
      const updatedProfile = {
        ...mockProfile,
        concerns: ['oiliness'],
      };
      (prismaService.skinProfile.update as jest.Mock).mockResolvedValueOnce(
        updatedProfile,
      );

      const result = await service.removeConcern(userId, 'acne');
      expect(result.concerns).not.toContain('acne');
    });
  });

  // ─────────────────────────────────────────────
  // updateHealthScore
  // ─────────────────────────────────────────────
  describe('updateHealthScore', () => {
    it('should throw if score is below 0', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      await expect(service.updateHealthScore(userId, -1)).rejects.toThrow(
        'Health score must be between 0 and 100',
      );
    });

    it('should throw if score is above 100', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      await expect(service.updateHealthScore(userId, 101)).rejects.toThrow(
        'Health score must be between 0 and 100',
      );
    });

    it('should update a valid health score', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );
      (prismaService.skinProfile.update as jest.Mock).mockResolvedValueOnce({
        ...mockProfile,
        healthScore: 85,
      });

      const result = await service.updateHealthScore(userId, 85);
      expect(result.healthScore).toBe(85);
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should delete the profile and return it', async () => {
      (prismaService.skinProfile.findUnique as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );
      (prismaService.skinProfile.delete as jest.Mock).mockResolvedValueOnce(
        mockProfile,
      );

      const result = await service.remove(userId);
      expect(result).toEqual(mockProfile);
      expect(prismaService.skinProfile.delete).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  // ─────────────────────────────────────────────
  // getStatistics
  // ─────────────────────────────────────────────
  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      const profiles = [
        { ...mockProfile, skinType: 'oily', healthScore: 70, skinAge: 25, concerns: ['acne'], sensitivities: ['fragrance'] },
        { ...mockProfile, id: 'p2', skinType: 'dry', healthScore: 80, skinAge: 35, concerns: ['dryness'], sensitivities: [] },
      ];
      (prismaService.skinProfile.findMany as jest.Mock).mockResolvedValueOnce(profiles);

      const stats = await service.getStatistics();
      expect(stats.totalProfiles).toBe(2);
      expect(stats.skinTypeDistribution['oily']).toBe(1);
      expect(stats.skinTypeDistribution['dry']).toBe(1);
      expect(stats.averageHealthScore).toBe(75);
      expect(stats.averageSkinAge).toBe(30);
    });
  });
});
