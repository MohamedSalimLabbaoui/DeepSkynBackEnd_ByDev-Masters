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
    topConcerns: {
        concern: string;
        count: number;
    }[];
    topSensitivities: {
        sensitivity: string;
        count: number;
    }[];
}
export declare class SkinProfileService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createSkinProfileDto: CreateSkinProfileDto): Promise<SkinProfile>;
    upsert(userId: string, data: CreateSkinProfileDto): Promise<SkinProfile>;
    findAll(page?: number, limit?: number): Promise<{
        profiles: SkinProfile[];
        total: number;
    }>;
    findByUserId(userId: string): Promise<SkinProfile>;
    findByUserIdOrNull(userId: string): Promise<SkinProfile | null>;
    findById(id: string): Promise<SkinProfile>;
    update(userId: string, updateSkinProfileDto: UpdateSkinProfileDto): Promise<SkinProfile>;
    updateConcerns(userId: string, concerns: string[]): Promise<SkinProfile>;
    addConcern(userId: string, concern: string): Promise<SkinProfile>;
    removeConcern(userId: string, concern: string): Promise<SkinProfile>;
    updateSensitivities(userId: string, sensitivities: string[]): Promise<SkinProfile>;
    addSensitivity(userId: string, sensitivity: string): Promise<SkinProfile>;
    removeSensitivity(userId: string, sensitivity: string): Promise<SkinProfile>;
    updateHealthScore(userId: string, healthScore: number): Promise<SkinProfile>;
    updateSkinAge(userId: string, skinAge: number): Promise<SkinProfile>;
    updateLastAnalysis(userId: string): Promise<SkinProfile>;
    remove(userId: string): Promise<SkinProfile>;
    hasProfile(userId: string): Promise<boolean>;
    getStatistics(): Promise<SkinProfileStats>;
    findBySkinType(skinType: SkinType): Promise<SkinProfile[]>;
    findByConcern(concern: string): Promise<SkinProfile[]>;
    findByFitzpatrickType(fitzpatrickType: number): Promise<SkinProfile[]>;
}
