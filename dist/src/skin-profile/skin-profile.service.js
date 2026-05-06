"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkinProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SkinProfileService = class SkinProfileService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createSkinProfileDto) {
        const existingProfile = await this.prisma.skinProfile.findUnique({
            where: { userId },
        });
        if (existingProfile) {
            throw new common_1.ConflictException('User already has a skin profile. Use update instead.');
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
    async upsert(userId, data) {
        const profile = await this.prisma.skinProfile.upsert({
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
        await this.prisma.user.update({
            where: { id: userId },
            data: { onboardingComplete: true },
        });
        return profile;
    }
    async findAll(page = 1, limit = 20) {
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
    async findByUserId(userId) {
        const profile = await this.prisma.skinProfile.findUnique({
            where: { userId },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Skin profile not found for this user');
        }
        return profile;
    }
    async findByUserIdOrNull(userId) {
        return this.prisma.skinProfile.findUnique({
            where: { userId },
        });
    }
    async findById(id) {
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
            throw new common_1.NotFoundException(`Skin profile with ID ${id} not found`);
        }
        return profile;
    }
    async update(userId, updateSkinProfileDto) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: {
                ...updateSkinProfileDto,
                updatedAt: new Date(),
            },
        });
    }
    async updateConcerns(userId, concerns) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: { concerns },
        });
    }
    async addConcern(userId, concern) {
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
    async removeConcern(userId, concern) {
        const profile = await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: {
                concerns: profile.concerns.filter((c) => c !== concern),
            },
        });
    }
    async updateSensitivities(userId, sensitivities) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: { sensitivities },
        });
    }
    async addSensitivity(userId, sensitivity) {
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
    async removeSensitivity(userId, sensitivity) {
        const profile = await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: {
                sensitivities: profile.sensitivities.filter((s) => s !== sensitivity),
            },
        });
    }
    async updateHealthScore(userId, healthScore) {
        await this.findByUserId(userId);
        if (healthScore < 0 || healthScore > 100) {
            throw new Error('Health score must be between 0 and 100');
        }
        return this.prisma.skinProfile.update({
            where: { userId },
            data: { healthScore },
        });
    }
    async updateSkinAge(userId, skinAge) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: { skinAge },
        });
    }
    async updateLastAnalysis(userId) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.update({
            where: { userId },
            data: { lastAnalysisAt: new Date() },
        });
    }
    async remove(userId) {
        await this.findByUserId(userId);
        return this.prisma.skinProfile.delete({
            where: { userId },
        });
    }
    async hasProfile(userId) {
        const profile = await this.prisma.skinProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        return !!profile;
    }
    async getStatistics() {
        const profiles = await this.prisma.skinProfile.findMany();
        const totalProfiles = profiles.length;
        const skinTypeDistribution = {};
        profiles.forEach((p) => {
            if (p.skinType) {
                skinTypeDistribution[p.skinType] =
                    (skinTypeDistribution[p.skinType] || 0) + 1;
            }
        });
        const healthScores = profiles
            .filter((p) => p.healthScore !== null)
            .map((p) => p.healthScore);
        const averageHealthScore = healthScores.length > 0
            ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
            : 0;
        const skinAges = profiles
            .filter((p) => p.skinAge !== null)
            .map((p) => p.skinAge);
        const averageSkinAge = skinAges.length > 0
            ? Math.round(skinAges.reduce((a, b) => a + b, 0) / skinAges.length)
            : 0;
        const concernCount = {};
        profiles.forEach((p) => {
            p.concerns.forEach((concern) => {
                concernCount[concern] = (concernCount[concern] || 0) + 1;
            });
        });
        const topConcerns = Object.entries(concernCount)
            .map(([concern, count]) => ({ concern, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const sensitivityCount = {};
        profiles.forEach((p) => {
            p.sensitivities.forEach((sensitivity) => {
                sensitivityCount[sensitivity] =
                    (sensitivityCount[sensitivity] || 0) + 1;
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
    async findBySkinType(skinType) {
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
    async findByConcern(concern) {
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
    async findByFitzpatrickType(fitzpatrickType) {
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
};
exports.SkinProfileService = SkinProfileService;
exports.SkinProfileService = SkinProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SkinProfileService);
//# sourceMappingURL=skin-profile.service.js.map