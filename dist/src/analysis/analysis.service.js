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
var AnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const gemini_service_1 = require("./services/gemini.service");
const supabase_service_1 = require("./services/supabase.service");
const skin_profile_service_1 = require("../skin-profile/skin-profile.service");
const notification_service_1 = require("../notification/notification.service");
const subscription_service_1 = require("../subscription/subscription.service");
const digital_twin_service_1 = require("../digital-twin/digital-twin.service");
let AnalysisService = AnalysisService_1 = class AnalysisService {
    constructor(prisma, geminiService, supabaseService, skinProfileService, notificationService, subscriptionService, digitalTwinService) {
        this.prisma = prisma;
        this.geminiService = geminiService;
        this.supabaseService = supabaseService;
        this.skinProfileService = skinProfileService;
        this.notificationService = notificationService;
        this.subscriptionService = subscriptionService;
        this.digitalTwinService = digitalTwinService;
        this.logger = new common_1.Logger(AnalysisService_1.name);
        this.freeMonthlyAnalysisLimit = 3;
    }
    toSafeInt(value, fallback, options) {
        let num;
        if (typeof value === 'number' && Number.isFinite(value)) {
            num = value;
        }
        else if (typeof value === 'string') {
            const parsed = Number(value.trim().replace(',', '.'));
            num = Number.isFinite(parsed) ? parsed : fallback;
        }
        else {
            num = fallback;
        }
        if (options?.treat0to10AsPercent && num <= 10) {
            num *= 10;
        }
        num = Math.round(num);
        if (options?.min !== undefined) {
            num = Math.max(options.min, num);
        }
        if (options?.max !== undefined) {
            num = Math.min(options.max, num);
        }
        return num;
    }
    sanitizePreocupent(preocupent) {
        if (!Array.isArray(preocupent))
            return [];
        return [
            ...new Set(preocupent
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter((item) => item.length > 0)),
        ];
    }
    buildRealtimeFallbackAnalysis(previousAnalysis) {
        const previousResults = previousAnalysis?.results && typeof previousAnalysis.results === 'object'
            ? previousAnalysis.results
            : null;
        const previousHealthScore = typeof previousAnalysis?.healthScore === 'number'
            ? previousAnalysis.healthScore
            : typeof previousResults?.healthScore === 'number'
                ? previousResults.healthScore
                : 72;
        const previousSkinAge = typeof previousAnalysis?.skinAge === 'number'
            ? previousAnalysis.skinAge
            : typeof previousResults?.skinAge === 'number'
                ? previousResults.skinAge
                : 29;
        const previousSkinType = typeof previousResults?.skinType === 'string'
            ? previousResults.skinType
            : 'normal';
        const previousConditions = Array.isArray(previousAnalysis?.conditions)
            ? previousAnalysis.conditions
            : [];
        return {
            skinType: previousSkinType,
            skinAge: previousSkinAge,
            healthScore: previousHealthScore,
            conditions: previousConditions,
            concerns: Array.isArray(previousResults?.concerns)
                ? previousResults.concerns
                : previousConditions,
            recommendations: {
                products: Array.isArray(previousResults?.recommendations?.products)
                    ? previousResults.recommendations.products
                    : ['Nettoyant doux', 'Hydratant quotidien', 'SPF 50+'],
                ingredients: Array.isArray(previousResults?.recommendations?.ingredients)
                    ? previousResults.recommendations.ingredients
                    : ['Niacinamide', 'Acide hyaluronique'],
                lifestyle: Array.isArray(previousResults?.recommendations?.lifestyle)
                    ? previousResults.recommendations.lifestyle
                    : [
                        'Hydratez-vous régulièrement',
                        'Dormez au moins 7h',
                        'Protection solaire quotidienne',
                    ],
                warnings: [
                    'Analyse effectuee en mode resilient: les services IA externes sont temporairement indisponibles.',
                ],
            },
            detailedAnalysis: {
                hydration: {
                    score: 70,
                    description: 'Hydratation globalement correcte',
                },
                texture: { score: 70, description: 'Texture relativement homogene' },
                pores: { score: 68, description: 'Pores moderes' },
                pigmentation: {
                    score: 69,
                    description: 'Pigmentation globalement stable',
                },
                wrinkles: { score: 72, description: 'Signes legers de rides' },
                acne: { score: 71, description: 'Imperfections legeres a moderees' },
                redness: { score: 70, description: 'Rougeurs limitees' },
                elasticity: { score: 70, description: 'Elasticite satisfaisante' },
            },
            fitzpatrickType: typeof previousResults?.fitzpatrickType === 'number'
                ? Math.max(1, Math.min(6, Math.round(previousResults.fitzpatrickType)))
                : 3,
            summary: 'Analyse retournee en mode de secours. Les fournisseurs IA externes sont momentanement indisponibles; reessayez plus tard pour une lecture complete.',
        };
    }
    buildEvolutionRemark(params) {
        const { previous, current } = params;
        if (!previous ||
            previous.healthScore === null ||
            previous.skinAge === null) {
            return {
                hasHistory: false,
                trend: 'stable',
                healthScoreChange: 0,
                skinAgeChange: 0,
                newConditions: [],
                resolvedConditions: [],
                remark: "C'est votre première analyse enregistrée. Continuez avec des scans réguliers pour suivre l'évolution.",
            };
        }
        const healthScoreChange = (current.healthScore ?? 0) - (previous.healthScore ?? 0);
        const skinAgeChange = (current.skinAge ?? 0) - (previous.skinAge ?? 0);
        const previousConditions = new Set(previous.conditions || []);
        const currentConditions = new Set(current.conditions || []);
        const newConditions = [...currentConditions].filter((c) => !previousConditions.has(c));
        const resolvedConditions = [...previousConditions].filter((c) => !currentConditions.has(c));
        const trend = healthScoreChange >= 3 || skinAgeChange <= -1
            ? 'improved'
            : healthScoreChange <= -3 || skinAgeChange >= 1
                ? 'declined'
                : 'stable';
        const scoreText = healthScoreChange > 0
            ? `votre score santé a augmenté de +${healthScoreChange}`
            : healthScoreChange < 0
                ? `votre score santé a baissé de ${healthScoreChange}`
                : 'votre score santé est stable';
        const ageText = skinAgeChange < 0
            ? `votre âge cutané s'est amélioré de ${Math.abs(skinAgeChange)} an(s)`
            : skinAgeChange > 0
                ? `votre âge cutané a augmenté de ${skinAgeChange} an(s)`
                : 'votre âge cutané est stable';
        const conditionText = newConditions.length || resolvedConditions.length
            ? `Nouvelles conditions: ${newConditions.length ? newConditions.join(', ') : 'aucune'}. Conditions améliorées/disparues: ${resolvedConditions.length ? resolvedConditions.join(', ') : 'aucune'}.`
            : 'Aucun changement majeur sur les conditions détectées.';
        return {
            hasHistory: true,
            trend,
            healthScoreChange,
            skinAgeChange,
            newConditions,
            resolvedConditions,
            remark: `${scoreText}; ${ageText}. ${conditionText}`,
        };
    }
    async enforceAnalysisAccess(userId) {
        const isPremium = await this.subscriptionService.isPremium(userId);
        if (isPremium)
            return;
        const { periodStart, resetsAt } = await this.subscriptionService.getFreeMonthlyQuotaWindow(userId);
        const thisMonthCount = await this.prisma.analysis.count({
            where: {
                userId,
                createdAt: { gte: periodStart, lt: resetsAt },
            },
        });
        if (thisMonthCount >= this.freeMonthlyAnalysisLimit) {
            throw new common_1.ForbiddenException(`Monthly analysis limit reached (${this.freeMonthlyAnalysisLimit}). Resets at ${resetsAt.toISOString()}. Upgrade to premium for unlimited analyses.`);
        }
    }
    async createWithImages(userId, files, questionnaire, preocupent, saveAnalysis = true) {
        if (!saveAnalysis) {
            return this.createUploadAnalysisPreview(userId, files, questionnaire, preocupent);
        }
        const startTime = Date.now();
        const normalizedPreocupent = this.sanitizePreocupent(preocupent);
        await this.enforceAnalysisAccess(userId);
        let uploadedImages = [];
        try {
            uploadedImages = await this.supabaseService.uploadMultipleImages(files, userId, 'analyses');
        }
        catch (error) {
            this.logger.error('Failed to upload images', error);
            throw new common_1.BadRequestException('Failed to upload images');
        }
        const imageUrls = uploadedImages.map((img) => img.url);
        const analysis = await this.prisma.analysis.create({
            data: {
                userId,
                images: imageUrls,
                questionnaire: questionnaire || null,
                preocupent: normalizedPreocupent,
                status: 'processing',
                conditions: [],
            },
        });
        this.processAnalysis(analysis.id, userId, imageUrls, questionnaire, startTime);
        return analysis;
    }
    async createUploadAnalysisPreview(userId, files, questionnaire, preocupent) {
        const normalizedPreocupent = this.sanitizePreocupent(preocupent);
        const previousAnalysis = await this.prisma.analysis.findFirst({
            where: { userId, status: 'completed' },
            orderBy: { createdAt: 'desc' },
        });
        let result;
        try {
            result = await this.geminiService.analyzeSkinImageBuffers(files.map((file) => ({
                buffer: file.buffer,
                mimeType: file.mimetype || 'image/jpeg',
            })), questionnaire);
        }
        catch (analysisError) {
            const reason = analysisError instanceof Error
                ? analysisError.message
                : 'unknown provider error';
            this.logger.warn(`Upload analysis switched to resilient fallback analysis: ${reason}`);
            result = this.buildRealtimeFallbackAnalysis(previousAnalysis);
        }
        const normalizedHealthScore = this.toSafeInt(result.healthScore, 70, {
            min: 0,
            max: 100,
            treat0to10AsPercent: true,
        });
        const normalizedSkinAge = this.toSafeInt(result.skinAge, 25, {
            min: 10,
            max: 100,
        });
        const normalizedResult = {
            ...result,
            healthScore: normalizedHealthScore,
            skinAge: normalizedSkinAge,
        };
        const now = new Date();
        return {
            id: `preview-${Date.now()}`,
            userId,
            images: [],
            questionnaire: questionnaire || null,
            preocupent: normalizedPreocupent,
            results: normalizedResult,
            healthScore: normalizedHealthScore,
            skinAge: normalizedSkinAge,
            conditions: normalizedResult.conditions,
            recommendations: normalizedResult.recommendations,
            status: 'completed',
            processingTime: null,
            createdAt: now,
            updatedAt: now,
        };
    }
    async create(userId, createAnalysisDto) {
        const startTime = Date.now();
        await this.enforceAnalysisAccess(userId);
        const analysis = await this.prisma.analysis.create({
            data: {
                userId,
                images: createAnalysisDto.images,
                questionnaire: createAnalysisDto.questionnaire || null,
                preocupent: this.sanitizePreocupent(createAnalysisDto.preocupent),
                status: 'processing',
                conditions: [],
            },
        });
        this.processAnalysis(analysis.id, userId, createAnalysisDto.images, createAnalysisDto.questionnaire, startTime);
        return analysis;
    }
    async processRealTimeScan(userId, realTimeScanDto) {
        const startTime = Date.now();
        const normalizedPreocupent = this.sanitizePreocupent(realTimeScanDto.preocupent);
        const normalizedScanInput = this.normalizeRealTimeScanInput(realTimeScanDto);
        if (realTimeScanDto.saveAnalysis) {
            await this.enforceAnalysisAccess(userId);
        }
        try {
            const previousAnalysis = await this.prisma.analysis.findFirst({
                where: { userId, status: 'completed' },
                orderBy: { createdAt: 'desc' },
            });
            const imageUrlsByAngle = {};
            if (realTimeScanDto.saveImage) {
                for (const [angle, data] of Object.entries(normalizedScanInput)) {
                    const uploadResult = await this.supabaseService.uploadBase64Image(data.image, userId, data.mimeType, `scans/${angle}`);
                    imageUrlsByAngle[angle] = uploadResult.url;
                }
            }
            let result;
            if (realTimeScanDto.cachedAnalysis) {
                result = realTimeScanDto.cachedAnalysis;
            }
            else {
                try {
                    result = await this.geminiService.analyzeRealTimeMultiAngleScan(Object.entries(normalizedScanInput).map(([, data]) => data));
                }
                catch (analysisError) {
                    const reason = analysisError instanceof Error
                        ? analysisError.message
                        : 'unknown provider error';
                    this.logger.warn(`Real-time scan switched to resilient fallback analysis: ${reason}`);
                    result = this.buildRealtimeFallbackAnalysis(previousAnalysis);
                }
            }
            const processingTime = Date.now() - startTime;
            const normalizedHealthScore = this.toSafeInt(result.healthScore, 70, {
                min: 0,
                max: 100,
                treat0to10AsPercent: true,
            });
            const normalizedSkinAge = this.toSafeInt(result.skinAge, 25, {
                min: 10,
                max: 100,
            });
            const normalizedResult = {
                ...result,
                healthScore: normalizedHealthScore,
                skinAge: normalizedSkinAge,
            };
            const evolution = this.buildEvolutionRemark({
                previous: previousAnalysis,
                current: normalizedResult,
            });
            if (realTimeScanDto.saveAnalysis) {
                const savedImageUrls = Object.values(imageUrlsByAngle).filter(Boolean);
                await this.prisma.analysis.create({
                    data: {
                        userId,
                        images: savedImageUrls,
                        preocupent: normalizedPreocupent,
                        results: result,
                        healthScore: normalizedHealthScore,
                        skinAge: normalizedSkinAge,
                        conditions: result.conditions,
                        recommendations: result.recommendations,
                        status: 'completed',
                        processingTime,
                    },
                });
                await this.updateSkinProfile(userId, result);
                try {
                    await this.captureDigitalTwinSnapshot(userId, result, imageUrlsByAngle.front ?? null);
                }
                catch (error) {
                    this.logger.warn(`Failed to capture Digital Twin snapshot: ${error.message}`);
                }
            }
            return {
                analysis: normalizedResult,
                capturedImages: {
                    front: this.buildCapturedScanImage('front', normalizedScanInput.front.image, normalizedScanInput.front.mimeType, imageUrlsByAngle.front ?? null),
                    left: this.buildCapturedScanImage('left', normalizedScanInput.left.image, normalizedScanInput.left.mimeType, imageUrlsByAngle.left ?? null),
                    right: this.buildCapturedScanImage('right', normalizedScanInput.right.image, normalizedScanInput.right.mimeType, imageUrlsByAngle.right ?? null),
                },
                evolution,
            };
        }
        catch (error) {
            this.logger.error('Real-time scan failed', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new common_1.BadRequestException(`Failed to process scan: ${errorMessage}`);
        }
    }
    buildCapturedScanImage(angle, imageBase64, mimeType, imageUrl) {
        return {
            angle,
            imageBase64,
            mimeType,
            imageUrl,
        };
    }
    normalizeRealTimeScanInput(realTimeScanDto) {
        const normalizeImage = (value) => {
            if (typeof value !== 'string')
                return null;
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            return trimmed.replace(/^data:image\/\w+;base64,/, '');
        };
        const legacyImage = normalizeImage(realTimeScanDto.image);
        const frontImage = normalizeImage(realTimeScanDto.frontImage);
        const leftImage = normalizeImage(realTimeScanDto.leftImage);
        const rightImage = normalizeImage(realTimeScanDto.rightImage);
        const mimeType = realTimeScanDto.mimeType || 'image/jpeg';
        if (frontImage && leftImage && rightImage) {
            return {
                front: { image: frontImage, mimeType },
                left: { image: leftImage, mimeType },
                right: { image: rightImage, mimeType },
            };
        }
        if (legacyImage) {
            return {
                front: { image: legacyImage, mimeType },
                left: { image: legacyImage, mimeType },
                right: { image: legacyImage, mimeType },
            };
        }
        throw new common_1.BadRequestException('Invalid scan payload: provide frontImage, leftImage, rightImage (or legacy image).');
    }
    async processAnalysis(analysisId, userId, imageUrls, questionnaire, startTime) {
        try {
            const result = await this.geminiService.analyzeSkinImages(imageUrls, questionnaire);
            const processingTime = Date.now() - startTime;
            const normalizedHealthScore = this.toSafeInt(result.healthScore, 70, {
                min: 0,
                max: 100,
                treat0to10AsPercent: true,
            });
            const normalizedSkinAge = this.toSafeInt(result.skinAge, 25, {
                min: 10,
                max: 100,
            });
            await this.prisma.analysis.update({
                where: { id: analysisId },
                data: {
                    results: result,
                    healthScore: normalizedHealthScore,
                    skinAge: normalizedSkinAge,
                    conditions: result.conditions,
                    recommendations: result.recommendations,
                    status: 'completed',
                    processingTime,
                },
            });
            await this.updateSkinProfile(userId, result);
            try {
                const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
                await this.captureDigitalTwinSnapshot(userId, result, imageUrl);
            }
            catch (error) {
                this.logger.warn(`Failed to capture Digital Twin snapshot: ${error.message}`);
            }
            await this.notificationService.create({
                userId,
                title: 'Analyse terminée',
                message: `Votre analyse de peau est prête. Score de santé: ${result.healthScore}/100`,
                type: 'success',
                actionUrl: `/analyses/${analysisId}`,
            });
            this.logger.log(`Analysis ${analysisId} completed in ${processingTime}ms`);
        }
        catch (error) {
            this.logger.error(`Analysis ${analysisId} failed`, error);
            await this.prisma.analysis.update({
                where: { id: analysisId },
                data: {
                    status: 'failed',
                    processingTime: Date.now() - startTime,
                },
            });
            await this.notificationService.create({
                userId,
                title: 'Analyse échouée',
                message: "Une erreur s'est produite lors de l'analyse. Veuillez réessayer.",
                type: 'error',
                actionUrl: `/analyses/${analysisId}`,
            });
        }
    }
    async updateSkinProfile(userId, result) {
        try {
            const hasProfile = await this.skinProfileService.hasProfile(userId);
            const profileData = {
                skinType: result.skinType,
                fitzpatrickType: result.fitzpatrickType,
                concerns: result.concerns,
                skinAge: result.skinAge,
                healthScore: result.healthScore,
                lastAnalysisAt: new Date().toISOString(),
            };
            if (hasProfile) {
                await this.skinProfileService.update(userId, profileData);
            }
            else {
                await this.skinProfileService.create(userId, profileData);
            }
        }
        catch (error) {
            this.logger.error('Failed to update skin profile', error);
        }
    }
    async captureDigitalTwinSnapshot(userId, result, imageUrl) {
        try {
            const conditions = {};
            Object.entries(result.detailedAnalysis || {}).forEach(([key, value]) => {
                if (value && typeof value === 'object' && 'score' in value) {
                    const severity = value.score >= 70 ? 'low' : value.score >= 40 ? 'medium' : 'high';
                    conditions[key] = { severity, score: value.score };
                }
            });
            const metrics = {
                hydration: result.detailedAnalysis?.hydration?.score || 50,
                texture: result.detailedAnalysis?.texture?.score || 50,
                pores: result.detailedAnalysis?.pores?.score || 50,
                pigmentation: result.detailedAnalysis?.pigmentation?.score || 50,
            };
            await this.digitalTwinService.captureSnapshot(userId, {
                imageUrl,
                healthScore: result.healthScore,
                skinAge: result.skinAge,
                conditions,
                metrics,
                notes: `Auto-captured from analysis`,
            });
            this.logger.log(`Digital Twin snapshot captured for user ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to capture Digital Twin snapshot: ${error.message}`, error);
            throw error;
        }
    }
    async findAllByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [analyses, total] = await Promise.all([
            this.prisma.analysis.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.analysis.count({ where: { userId } }),
        ]);
        return { analyses, total };
    }
    async findAllForAdmin(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            ...(options.status ? { status: options.status } : {}),
            ...(options.minScore !== undefined || options.maxScore !== undefined
                ? {
                    healthScore: {
                        ...(options.minScore !== undefined
                            ? { gte: options.minScore }
                            : {}),
                        ...(options.maxScore !== undefined
                            ? { lte: options.maxScore }
                            : {}),
                    },
                }
                : {}),
            ...(options.fromDate || options.toDate
                ? {
                    createdAt: {
                        ...(options.fromDate ? { gte: new Date(options.fromDate) } : {}),
                        ...(options.toDate ? { lte: new Date(options.toDate) } : {}),
                    },
                }
                : {}),
            ...(options.skinType
                ? { user: { skinProfile: { is: { skinType: options.skinType } } } }
                : {}),
        };
        const [analyses, total] = await Promise.all([
            this.prisma.analysis.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            skinProfile: {
                                select: {
                                    skinType: true,
                                    healthScore: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.analysis.count({ where }),
        ]);
        return { analyses, total, page, limit };
    }
    async findById(id, userId) {
        const analysis = await this.prisma.analysis.findFirst({
            where: { id, userId },
        });
        if (!analysis) {
            throw new common_1.NotFoundException(`Analysis with ID ${id} not found`);
        }
        return analysis;
    }
    async findLatest(userId) {
        return this.prisma.analysis.findFirst({
            where: { userId, status: 'completed' },
            orderBy: { createdAt: 'desc' },
        });
    }
    async retryAnalysis(id, userId) {
        const analysis = await this.findById(id, userId);
        if (analysis.status !== 'failed') {
            throw new common_1.BadRequestException('Only failed analyses can be retried');
        }
        await this.prisma.analysis.update({
            where: { id },
            data: { status: 'processing' },
        });
        const startTime = Date.now();
        this.processAnalysis(id, userId, analysis.images, analysis.questionnaire, startTime);
        return this.findById(id, userId);
    }
    async retryAnalysisForAdmin(id) {
        const analysis = await this.prisma.analysis.findUnique({ where: { id } });
        if (!analysis) {
            throw new common_1.NotFoundException(`Analysis with ID ${id} not found`);
        }
        if (analysis.status !== 'failed') {
            throw new common_1.BadRequestException('Only failed analyses can be retried');
        }
        await this.prisma.analysis.update({
            where: { id },
            data: { status: 'processing' },
        });
        const startTime = Date.now();
        this.processAnalysis(id, analysis.userId, analysis.images, analysis.questionnaire, startTime);
        return this.prisma.analysis.findUnique({
            where: { id },
        });
    }
    async remove(id, userId) {
        const analysis = await this.findById(id, userId);
        const imagePaths = analysis.images
            .map((url) => this.supabaseService.extractPathFromUrl(url))
            .filter((path) => path !== null);
        await this.supabaseService.deleteMultipleImages(imagePaths);
        return this.prisma.analysis.delete({
            where: { id },
        });
    }
    async getUserStats(userId) {
        const analyses = await this.prisma.analysis.findMany({
            where: { userId, status: 'completed' },
            orderBy: { createdAt: 'asc' },
            select: {
                healthScore: true,
                conditions: true,
                createdAt: true,
            },
        });
        const healthScores = analyses
            .filter((a) => a.healthScore !== null)
            .map((a) => a.healthScore);
        const averageHealthScore = healthScores.length > 0
            ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
            : 0;
        const conditionCount = {};
        analyses.forEach((a) => {
            a.conditions.forEach((c) => {
                conditionCount[c] = (conditionCount[c] || 0) + 1;
            });
        });
        const commonConditions = Object.entries(conditionCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([condition]) => condition);
        const healthScoreHistory = analyses
            .filter((a) => a.healthScore !== null)
            .map((a) => ({
            date: a.createdAt,
            score: a.healthScore,
        }));
        return {
            totalAnalyses: analyses.length,
            averageHealthScore,
            healthScoreHistory,
            commonConditions,
        };
    }
    async getStatistics() {
        const analyses = await this.prisma.analysis.findMany();
        const completed = analyses.filter((a) => a.status === 'completed');
        const failed = analyses.filter((a) => a.status === 'failed');
        const healthScores = completed
            .filter((a) => a.healthScore !== null)
            .map((a) => a.healthScore);
        const processingTimes = completed
            .filter((a) => a.processingTime !== null)
            .map((a) => a.processingTime);
        const conditionCount = {};
        completed.forEach((a) => {
            a.conditions.forEach((c) => {
                conditionCount[c] = (conditionCount[c] || 0) + 1;
            });
        });
        const topConditions = Object.entries(conditionCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([condition, count]) => ({ condition, count }));
        return {
            totalAnalyses: analyses.length,
            completedAnalyses: completed.length,
            failedAnalyses: failed.length,
            averageHealthScore: healthScores.length > 0
                ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
                : 0,
            averageProcessingTime: processingTimes.length > 0
                ? Math.round(processingTimes.reduce((a, b) => a + b, 0) /
                    processingTimes.length)
                : 0,
            topConditions,
        };
    }
    async getAdvice(userId) {
        const latestAnalysis = await this.findLatest(userId);
        if (!latestAnalysis) {
            return 'Effectuez une analyse de peau pour recevoir des conseils personnalisés.';
        }
        const results = latestAnalysis.results;
        if (!results) {
            return 'Effectuez une nouvelle analyse pour recevoir des conseils personnalisés.';
        }
        return this.geminiService.getSkincareAdvice(latestAnalysis.conditions, results.concerns || []);
    }
    async compareAnalyses(userId, analysisId1, analysisId2) {
        const [analysis1, analysis2] = await Promise.all([
            this.findById(analysisId1, userId),
            this.findById(analysisId2, userId),
        ]);
        const healthScoreChange = (analysis2.healthScore || 0) - (analysis1.healthScore || 0);
        const skinAgeChange = (analysis2.skinAge || 0) - (analysis1.skinAge || 0);
        const conditions1 = new Set(analysis1.conditions);
        const conditions2 = new Set(analysis2.conditions);
        const newConditions = [...conditions2].filter((c) => !conditions1.has(c));
        const resolvedConditions = [...conditions1].filter((c) => !conditions2.has(c));
        return {
            analysis1,
            analysis2,
            comparison: {
                healthScoreChange,
                skinAgeChange,
                newConditions,
                resolvedConditions,
            },
        };
    }
    async recommendHair(userId, image, mimeType = 'image/jpeg') {
        return this.geminiService.analyzeHairAndRecommend(image, mimeType);
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = AnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService,
        supabase_service_1.SupabaseService,
        skin_profile_service_1.SkinProfileService,
        notification_service_1.NotificationService,
        subscription_service_1.SubscriptionService,
        digital_twin_service_1.DigitalTwinService])
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map