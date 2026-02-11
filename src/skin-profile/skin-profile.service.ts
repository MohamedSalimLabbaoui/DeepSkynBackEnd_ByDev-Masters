import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkinProfileDto } from './dto/create-skin-profile.dto';
import { UpdateSkinProfileDto } from './dto/update-skin-profile.dto';
import { SkinProfile } from '@prisma/client';

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';

export interface SkinProfileStats {
  totalProfiles: number;
  skinTypeDistribution: Record<string, number>;
  averageHealthScore: number;
  averageSkinAge: number;
  topConcerns: { concern: string; count: number }[];
  topSensitivities: { sensitivity: string; count: number }[];
}

@Injectable()
export class SkinProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new skin profile for a user
   */
  async create(userId: string, createSkinProfileDto: CreateSkinProfileDto): Promise<SkinProfile> {
    // Check if user already has a profile
    const existingProfile = await this.prisma.skinProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('User already has a skin profile. Use update instead.');
    }

    return this.prisma.skinProfile.create({
      data: {
        userId,
        skinType: createSkinProfileDto.skinType,
        fitzpatrickType: createSkinProfileDto.fitzpatrickType,
        concerns: createSkinProfileDto.concerns || [],
        sensitivities: createSkinProfileDto.sensitivities || [],
        skinAge: createSkinProfileDto.skinAge,
        healthScore: createSkinProfileDto.healthScore,
        lastAnalysisAt: createSkinProfileDto.lastAnalysisAt,
      },
    });
  }

  /**
   * Create or update a skin profile (upsert)
   */
  async upsert(userId: string, data: CreateSkinProfileDto): Promise<SkinProfile> {
    return this.prisma.skinProfile.upsert({
      where: { userId },
      create: {
        userId,
        skinType: data.skinType,
        fitzpatrickType: data.fitzpatrickType,
        concerns: data.concerns || [],
        sensitivities: data.sensitivities || [],
        skinAge: data.skinAge,
        healthScore: data.healthScore,
        lastAnalysisAt: data.lastAnalysisAt,
      },
      update: {
        skinType: data.skinType,
        fitzpatrickType: data.fitzpatrickType,
        concerns: data.concerns || [],
        sensitivities: data.sensitivities || [],
        skinAge: data.skinAge,
        healthScore: data.healthScore,
        lastAnalysisAt: data.lastAnalysisAt,
      },
    });
  }

  /**
   * Get all skin profiles with pagination (Admin)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ profiles: SkinProfile[]; total: number }> {
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.prisma.skinProfile.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.skinProfile.count(),
    ]);

    return { profiles, total };
  }

  /**
   * Get skin profile by user ID
   */
  async findByUserId(userId: string): Promise<SkinProfile> {
    const profile = await this.prisma.skinProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Skin profile not found for this user');
    }

    return profile;
  }

  /**
   * Get skin profile by ID
   */
  async findById(id: string): Promise<SkinProfile> {
    const profile = await this.prisma.skinProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Skin profile with ID ${id} not found`);
    }

    return profile;
  }

  /**
   * Update skin profile
   */
  async update(userId: string, updateSkinProfileDto: UpdateSkinProfileDto): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: {
        ...updateSkinProfileDto,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update specific concerns
   */
  async updateConcerns(userId: string, concerns: string[]): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: { concerns },
    });
  }

  /**
   * Add a concern
   */
  async addConcern(userId: string, concern: string): Promise<SkinProfile> {
    const profile = await this.findByUserId(userId);
    
    if (profile.concerns.includes(concern)) {
      return profile;
    }

    return this.prisma.skinProfile.update({
      where: { userId },
      data: {
        concerns: [...profile.concerns, concern],
      },
    });
  }

  /**
   * Remove a concern
   */
  async removeConcern(userId: string, concern: string): Promise<SkinProfile> {
    const profile = await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: {
        concerns: profile.concerns.filter((c) => c !== concern),
      },
    });
  }

  /**
   * Update sensitivities
   */
  async updateSensitivities(userId: string, sensitivities: string[]): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: { sensitivities },
    });
  }

  /**
   * Add a sensitivity
   */
  async addSensitivity(userId: string, sensitivity: string): Promise<SkinProfile> {
    const profile = await this.findByUserId(userId);
    
    if (profile.sensitivities.includes(sensitivity)) {
      return profile;
    }

    return this.prisma.skinProfile.update({
      where: { userId },
      data: {
        sensitivities: [...profile.sensitivities, sensitivity],
      },
    });
  }

  /**
   * Remove a sensitivity
   */
  async removeSensitivity(userId: string, sensitivity: string): Promise<SkinProfile> {
    const profile = await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: {
        sensitivities: profile.sensitivities.filter((s) => s !== sensitivity),
      },
    });
  }

  /**
   * Update health score
   */
  async updateHealthScore(userId: string, healthScore: number): Promise<SkinProfile> {
    await this.findByUserId(userId);

    if (healthScore < 0 || healthScore > 100) {
      throw new Error('Health score must be between 0 and 100');
    }

    return this.prisma.skinProfile.update({
      where: { userId },
      data: { healthScore },
    });
  }

  /**
   * Update skin age
   */
  async updateSkinAge(userId: string, skinAge: number): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: { skinAge },
    });
  }

  /**
   * Update last analysis timestamp
   */
  async updateLastAnalysis(userId: string): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.update({
      where: { userId },
      data: { lastAnalysisAt: new Date() },
    });
  }

  /**
   * Delete skin profile
   */
  async remove(userId: string): Promise<SkinProfile> {
    await this.findByUserId(userId);

    return this.prisma.skinProfile.delete({
      where: { userId },
    });
  }

  /**
   * Check if user has a skin profile
   */
  async hasProfile(userId: string): Promise<boolean> {
    const profile = await this.prisma.skinProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return !!profile;
  }

  /**
   * Get skin profile statistics (Admin)
   */
  async getStatistics(): Promise<SkinProfileStats> {
    const profiles = await this.prisma.skinProfile.findMany();
    const totalProfiles = profiles.length;

    // Skin type distribution
    const skinTypeDistribution: Record<string, number> = {};
    profiles.forEach((p) => {
      if (p.skinType) {
        skinTypeDistribution[p.skinType] = (skinTypeDistribution[p.skinType] || 0) + 1;
      }
    });

    // Average health score
    const healthScores = profiles.filter((p) => p.healthScore !== null).map((p) => p.healthScore);
    const averageHealthScore =
      healthScores.length > 0
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : 0;

    // Average skin age
    const skinAges = profiles.filter((p) => p.skinAge !== null).map((p) => p.skinAge);
    const averageSkinAge =
      skinAges.length > 0
        ? Math.round(skinAges.reduce((a, b) => a + b, 0) / skinAges.length)
        : 0;

    // Top concerns
    const concernCount: Record<string, number> = {};
    profiles.forEach((p) => {
      p.concerns.forEach((concern) => {
        concernCount[concern] = (concernCount[concern] || 0) + 1;
      });
    });
    const topConcerns = Object.entries(concernCount)
      .map(([concern, count]) => ({ concern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top sensitivities
    const sensitivityCount: Record<string, number> = {};
    profiles.forEach((p) => {
      p.sensitivities.forEach((sensitivity) => {
        sensitivityCount[sensitivity] = (sensitivityCount[sensitivity] || 0) + 1;
      });
    });
    const topSensitivities = Object.entries(sensitivityCount)
      .map(([sensitivity, count]) => ({ sensitivity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalProfiles,
      skinTypeDistribution,
      averageHealthScore,
      averageSkinAge,
      topConcerns,
      topSensitivities,
    };
  }

  /**
   * Get profiles by skin type
   */
  async findBySkinType(skinType: SkinType): Promise<SkinProfile[]> {
    return this.prisma.skinProfile.findMany({
      where: { skinType },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get profiles by concern
   */
  async findByConcern(concern: string): Promise<SkinProfile[]> {
    return this.prisma.skinProfile.findMany({
      where: {
        concerns: { has: concern },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get profiles by Fitzpatrick type
   */
  async findByFitzpatrickType(fitzpatrickType: number): Promise<SkinProfile[]> {
    return this.prisma.skinProfile.findMany({
      where: { fitzpatrickType },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
