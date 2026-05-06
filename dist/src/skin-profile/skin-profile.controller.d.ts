import { SkinProfileService, SkinProfileStats } from './skin-profile.service';
import { CreateSkinProfileDto } from './dto/create-skin-profile.dto';
import { UpdateSkinProfileDto } from './dto/update-skin-profile.dto';
import { SkinProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class SkinProfileController {
    private readonly skinProfileService;
    private readonly prisma;
    constructor(skinProfileService: SkinProfileService, prisma: PrismaService);
    private getPrismaUserId;
    create(email: string, createSkinProfileDto: CreateSkinProfileDto): Promise<SkinProfile>;
    upsert(email: string, createSkinProfileDto: CreateSkinProfileDto): Promise<SkinProfile>;
    findAll(page: number, limit: number): Promise<{
        profiles: SkinProfile[];
        total: number;
    }>;
    getStatistics(): Promise<SkinProfileStats>;
    findBySkinType(skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive'): Promise<SkinProfile[]>;
    findByConcern(concern: string): Promise<SkinProfile[]>;
    findByFitzpatrickType(type: number): Promise<SkinProfile[]>;
    getMyProfile(email: string): Promise<SkinProfile | null>;
    hasProfile(email: string): Promise<{
        exists: boolean;
    }>;
    getOnboardingStatus(email: string): Promise<{
        onboardingComplete: boolean;
        hasProfile: boolean;
    }>;
    findById(id: string): Promise<SkinProfile>;
    updateMyProfile(email: string, updateSkinProfileDto: UpdateSkinProfileDto): Promise<SkinProfile>;
    updateConcerns(email: string, concerns: string[]): Promise<SkinProfile>;
    addConcern(email: string, concern: string): Promise<SkinProfile>;
    removeConcern(email: string, concern: string): Promise<SkinProfile>;
    updateSensitivities(email: string, sensitivities: string[]): Promise<SkinProfile>;
    addSensitivity(email: string, sensitivity: string): Promise<SkinProfile>;
    removeSensitivity(email: string, sensitivity: string): Promise<SkinProfile>;
    updateHealthScore(email: string, healthScore: number): Promise<SkinProfile>;
    updateSkinAge(email: string, skinAge: number): Promise<SkinProfile>;
    updateLastAnalysis(email: string): Promise<SkinProfile>;
    deleteMyProfile(email: string): Promise<void>;
}
