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
var RoutineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const gemini_service_1 = require("../analysis/services/gemini.service");
const skin_profile_service_1 = require("../skin-profile/skin-profile.service");
const notification_service_1 = require("../notification/notification.service");
const crawling_service_1 = require("../crawling/crawling.service");
const posts_service_1 = require("../posts/posts.service");
const subscription_service_1 = require("../subscription/subscription.service");
const QRCode = require("qrcode");
const prompt_compression_util_1 = require("./prompt-compression.util");
let RoutineService = RoutineService_1 = class RoutineService {
    constructor(prisma, geminiService, skinProfileService, notificationService, crawlingService, postsService, subscriptionService) {
        this.prisma = prisma;
        this.geminiService = geminiService;
        this.skinProfileService = skinProfileService;
        this.notificationService = notificationService;
        this.crawlingService = crawlingService;
        this.postsService = postsService;
        this.subscriptionService = subscriptionService;
        this.logger = new common_1.Logger(RoutineService_1.name);
        this.freeMonthlyAiRoutineLimit = 3;
    }
    async enforceAiRoutineAccess(userId) {
        const isPremium = await this.subscriptionService.isPremium(userId);
        if (isPremium)
            return;
        const { periodStart, resetsAt } = await this.subscriptionService.getFreeMonthlyQuotaWindow(userId);
        const thisMonthCount = await this.prisma.routine.count({
            where: {
                userId,
                isAIGenerated: true,
                createdAt: { gte: periodStart, lt: resetsAt },
            },
        });
        if (thisMonthCount >= this.freeMonthlyAiRoutineLimit) {
            throw new common_1.ForbiddenException(`Limite de ${this.freeMonthlyAiRoutineLimit} routines IA/mois atteinte. Réinitialisation: ${resetsAt.toISOString()}. Passez à Premium pour des routines illimitées.`);
        }
    }
    async create(userId, createRoutineDto) {
        const routine = await this.prisma.routine.create({
            data: {
                userId,
                name: createRoutineDto.name,
                type: createRoutineDto.type,
                steps: createRoutineDto.steps,
                notes: createRoutineDto.notes,
                isActive: createRoutineDto.isActive ?? true,
                isAIGenerated: false,
            },
        });
        this.logger.log(`Manual routine created: ${routine.id} for user ${userId}`);
        return routine;
    }
    async generateWithAI(userId, generateDto) {
        await this.enforceAiRoutineAccess(userId);
        let skinProfile = null;
        try {
            skinProfile = await this.skinProfileService.findByUserId(userId);
        }
        catch {
            this.logger.warn(`No skin profile found for user ${userId}`);
        }
        const context = {
            routineType: generateDto.type,
            skinType: generateDto.skinType || skinProfile?.skinType || 'normal',
            concerns: generateDto.concerns || skinProfile?.concerns || [],
            sensitivities: generateDto.sensitivities || skinProfile?.sensitivities || [],
            budget: generateDto.budget || 'medium',
            preferredBrands: generateDto.preferredBrands,
            additionalNotes: generateDto.additionalNotes,
            fitzpatrickType: skinProfile?.fitzpatrickType,
        };
        const aiRoutine = await this.generateRoutineWithGemini(context);
        const routine = await this.prisma.routine.create({
            data: {
                userId,
                name: aiRoutine.name,
                type: generateDto.type,
                steps: aiRoutine.steps,
                notes: aiRoutine.notes || aiRoutine.reasoning,
                isActive: true,
                isAIGenerated: true,
            },
        });
        await this.notificationService.create({
            userId,
            title: 'Nouvelle routine créée',
            message: `Votre routine ${this.getRoutineTypeName(generateDto.type)} "${aiRoutine.name}" a été générée avec succès.`,
            type: 'info',
            actionUrl: `/routines/${routine.id}`,
        });
        this.logger.log(`AI routine generated: ${routine.id} for user ${userId}`);
        return routine;
    }
    async generateRoutineWithGemini(context) {
        const prompt = this.buildRoutinePrompt(context);
        try {
            const result = await this.geminiService.getSkincareAdvice([context.skinType], [...(context.concerns || []), `Generate a skincare routine: ${prompt}`]);
            return this.parseAIResponse(result, context);
        }
        catch (error) {
            this.logger.error('Failed to generate routine with AI', error.message);
            return this.getDefaultRoutine(context);
        }
    }
    buildRoutinePrompt(context) {
        const typeMap = {
            AM: 'matin',
            PM: 'soir',
            weekly: 'hebdo',
        };
        const type = typeMap[context.routineType] || context.routineType;
        const st = (0, prompt_compression_util_1.abbrevSkinType)(context.skinType);
        const c = (0, prompt_compression_util_1.abbrevConcerns)(context.concerns);
        const s = context.sensitivities?.length || 0;
        const b = context.budget?.charAt(0)?.toUpperCase() || 'M';
        const f = context.fitzpatrickType || '-';
        return (0, prompt_compression_util_1.compressWhitespace)(`
Dermato expert. Routine ${type}.
Ctx:ty:${context.routineType}|st:${st}|c:${c}|s:${s}|b:${b}|f:${f}${context.preferredBrands ? `|m:${context.preferredBrands}` : ''}${context.additionalNotes ? `|n:${context.additionalNotes}` : ''}
Rép JSON:{name,type,steps:[{order,name,category,description,duration}],notes}
4-7 étapes. Durée sec.`);
    }
    parseAIResponse(aiResponse, context) {
        const routineType = context.routineType;
        const routineName = routineType === 'AM'
            ? 'Routine Matin'
            : routineType === 'PM'
                ? 'Routine Soir'
                : 'Soin Hebdomadaire';
        const advice = aiResponse?.advice || aiResponse?.toString() || '';
        const steps = this.extractStepsFromAdvice(advice, routineType);
        return {
            name: `${routineName} - ${context.skinType}`,
            type: routineType,
            steps,
            notes: advice.substring(0, 500),
            reasoning: `Routine personnalisée pour peau ${context.skinType} avec préoccupations: ${context.concerns?.join(', ') || 'générales'}`,
        };
    }
    extractStepsFromAdvice(advice, routineType) {
        if (routineType === 'AM') {
            return [
                {
                    order: 1,
                    name: 'Nettoyage',
                    category: 'cleanser',
                    description: 'Nettoyant doux pour commencer la journée',
                    duration: 60,
                },
                {
                    order: 2,
                    name: 'Tonique',
                    category: 'toner',
                    description: 'Équilibrer le pH de la peau',
                    duration: 30,
                },
                {
                    order: 3,
                    name: 'Sérum',
                    category: 'serum',
                    description: 'Sérum antioxydant (Vitamine C)',
                    duration: 30,
                },
                {
                    order: 4,
                    name: 'Contour des yeux',
                    category: 'eye_cream',
                    description: 'Hydrater la zone délicate des yeux',
                    duration: 20,
                },
                {
                    order: 5,
                    name: 'Hydratant',
                    category: 'moisturizer',
                    description: 'Crème hydratante légère',
                    duration: 30,
                },
                {
                    order: 6,
                    name: 'Protection solaire',
                    category: 'sunscreen',
                    description: 'SPF 30+ indispensable',
                    duration: 30,
                },
            ];
        }
        else if (routineType === 'PM') {
            return [
                {
                    order: 1,
                    name: 'Démaquillage',
                    category: 'makeup_remover',
                    description: 'Huile ou baume démaquillant',
                    duration: 60,
                },
                {
                    order: 2,
                    name: 'Nettoyage',
                    category: 'cleanser',
                    description: 'Second nettoyage en profondeur',
                    duration: 60,
                },
                {
                    order: 3,
                    name: 'Exfoliation',
                    category: 'exfoliant',
                    description: 'Exfoliant chimique doux (2-3x/semaine)',
                    duration: 30,
                },
                {
                    order: 4,
                    name: 'Tonique',
                    category: 'toner',
                    description: 'Tonique hydratant',
                    duration: 30,
                },
                {
                    order: 5,
                    name: 'Sérum',
                    category: 'serum',
                    description: 'Sérum réparateur (Rétinol ou Niacinamide)',
                    duration: 30,
                },
                {
                    order: 6,
                    name: 'Contour des yeux',
                    category: 'eye_cream',
                    description: 'Soin contour des yeux nourrissant',
                    duration: 20,
                },
                {
                    order: 7,
                    name: 'Hydratant nuit',
                    category: 'night_cream',
                    description: 'Crème de nuit réparatrice',
                    duration: 30,
                },
            ];
        }
        else {
            return [
                {
                    order: 1,
                    name: 'Nettoyage profond',
                    category: 'deep_cleanser',
                    description: 'Préparer la peau au soin',
                    duration: 120,
                },
                {
                    order: 2,
                    name: 'Masque',
                    category: 'mask',
                    description: 'Masque adapté aux besoins de la peau',
                    duration: 900,
                },
                {
                    order: 3,
                    name: 'Sérum intensif',
                    category: 'serum',
                    description: 'Traitement concentré',
                    duration: 60,
                },
                {
                    order: 4,
                    name: 'Hydratation',
                    category: 'moisturizer',
                    description: 'Sceller les actifs',
                    duration: 60,
                },
            ];
        }
    }
    getDefaultRoutine(context) {
        const steps = this.extractStepsFromAdvice('', context.routineType);
        const routineName = context.routineType === 'AM'
            ? 'Routine Matin Basique'
            : context.routineType === 'PM'
                ? 'Routine Soir Basique'
                : 'Soin Hebdomadaire Basique';
        return {
            name: routineName,
            type: context.routineType,
            steps,
            notes: 'Routine de base recommandée. Personnalisez-la selon vos besoins.',
        };
    }
    async findAllByUser(userId, options) {
        const where = { userId };
        if (options?.type) {
            where.type = options.type;
        }
        if (options?.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        if (options?.isAIGenerated !== undefined) {
            where.isAIGenerated = options.isAIGenerated;
        }
        return this.prisma.routine.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const routine = await this.prisma.routine.findFirst({
            where: { id, userId },
        });
        if (!routine) {
            throw new common_1.NotFoundException(`Routine ${id} not found`);
        }
        return routine;
    }
    async update(id, userId, updateRoutineDto) {
        await this.findOne(id, userId);
        return this.prisma.routine.update({
            where: { id },
            data: {
                name: updateRoutineDto.name,
                type: updateRoutineDto.type,
                steps: updateRoutineDto.steps,
                notes: updateRoutineDto.notes,
                isActive: updateRoutineDto.isActive,
            },
        });
    }
    async toggleActive(id, userId) {
        const routine = await this.findOne(id, userId);
        return this.prisma.routine.update({
            where: { id },
            data: { isActive: !routine.isActive },
        });
    }
    async updateStepCompletion(id, userId, stepOrder, isCompleted) {
        const routine = await this.findOne(id, userId);
        const steps = routine.steps;
        const stepIndex = steps.findIndex((s) => s.order === stepOrder);
        if (stepIndex === -1) {
            throw new common_1.BadRequestException(`Step ${stepOrder} not found in routine`);
        }
        steps[stepIndex].isCompleted = isCompleted;
        return this.prisma.routine.update({
            where: { id },
            data: { steps: steps },
        });
    }
    async resetStepsCompletion(id, userId) {
        const routine = await this.findOne(id, userId);
        const steps = routine.steps.map((step) => ({
            ...step,
            isCompleted: false,
        }));
        return this.prisma.routine.update({
            where: { id },
            data: { steps: steps },
        });
    }
    async duplicate(id, userId, newName) {
        const original = await this.findOne(id, userId);
        return this.prisma.routine.create({
            data: {
                userId,
                name: newName || `${original.name} (copie)`,
                type: original.type,
                steps: original.steps,
                notes: original.notes,
                isActive: true,
                isAIGenerated: false,
            },
        });
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        await this.prisma.routine.delete({
            where: { id },
        });
        this.logger.log(`Routine ${id} deleted`);
    }
    async getStatistics(userId) {
        const routines = await this.prisma.routine.findMany({
            where: { userId },
        });
        return {
            total: routines.length,
            active: routines.filter((r) => r.isActive).length,
            aiGenerated: routines.filter((r) => r.isAIGenerated).length,
            byType: {
                AM: routines.filter((r) => r.type === 'AM').length,
                PM: routines.filter((r) => r.type === 'PM').length,
                weekly: routines.filter((r) => r.type === 'weekly').length,
            },
        };
    }
    getRoutineTypeName(type) {
        switch (type) {
            case 'AM':
                return 'du matin';
            case 'PM':
                return 'du soir';
            case 'weekly':
                return 'hebdomadaire';
            default:
                return type;
        }
    }
    async addStep(id, userId, step) {
        const routine = await this.findOne(id, userId);
        const steps = routine.steps;
        if (!step.order) {
            step.order = steps.length + 1;
        }
        steps.push(step);
        steps.sort((a, b) => a.order - b.order);
        return this.prisma.routine.update({
            where: { id },
            data: { steps: steps },
        });
    }
    async removeStep(id, userId, stepOrder) {
        const routine = await this.findOne(id, userId);
        let steps = routine.steps;
        steps = steps.filter((s) => s.order !== stepOrder);
        steps = steps.map((step, index) => ({
            ...step,
            order: index + 1,
        }));
        return this.prisma.routine.update({
            where: { id },
            data: { steps: steps },
        });
    }
    async reorderSteps(id, userId, newOrder) {
        const routine = await this.findOne(id, userId);
        const steps = routine.steps;
        if (newOrder.length !== steps.length) {
            throw new common_1.BadRequestException('New order must contain all step orders');
        }
        const reorderedSteps = newOrder.map((oldOrder, newIndex) => {
            const step = steps.find((s) => s.order === oldOrder);
            if (!step) {
                throw new common_1.BadRequestException(`Step ${oldOrder} not found`);
            }
            return { ...step, order: newIndex + 1 };
        });
        return this.prisma.routine.update({
            where: { id },
            data: { steps: reorderedSteps },
        });
    }
    async adviseOnChange(userId, routineId, adviseDto) {
        let skinProfile = null;
        try {
            skinProfile = await this.skinProfileService.findByUserId(userId);
        }
        catch {
            this.logger.warn(`No skin profile found for user ${userId}`);
        }
        const skinCtx = skinProfile
            ? (0, prompt_compression_util_1.buildCompactSkinContext)({
                skinType: skinProfile.skinType,
                concerns: skinProfile.concerns,
                sensitivities: skinProfile.sensitivities,
            })
            : '-';
        const stepsStr = adviseDto.currentSteps
            .map((s, i) => `${i + 1}.${s}`)
            .join(',');
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermato expert. Conseil modif routine.
Profil:${skinCtx}
Modif:${adviseDto.changeType}${adviseDto.changeDescription ? ` (${adviseDto.changeDescription})` : ''}${adviseDto.addedStepName ? ` +${adviseDto.addedStepName}` : ''}
Étapes:[${stepsStr}]
Rép JSON:{advice,rating:good|neutral|caution,emoji}
2-3 phrases, français.`);
        try {
            const result = await this.geminiService.getSkincareAdvice([skinProfile?.skinType || 'normal'], [prompt]);
            const adviceText = typeof result === 'object'
                ? result?.advice || JSON.stringify(result)
                : String(result || '');
            try {
                const jsonMatch = adviceText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        advice: parsed.advice || 'Modification enregistrée avec succès.',
                        rating: parsed.rating || 'neutral',
                        emoji: parsed.emoji || '✨',
                    };
                }
            }
            catch {
            }
            return {
                advice: adviceText.substring(0, 300) ||
                    'Modification enregistrée. Continuez à prendre soin de votre peau !',
                rating: 'neutral',
                emoji: '✨',
            };
        }
        catch (error) {
            this.logger.error('Failed to get AI advice', error.message);
            const fallbacks = {
                reorder: "Réorganisation notée ! L'ordre d'application est important — du plus léger au plus épais est généralement recommandé. 👍",
                add_step: "Nouvel ajout intéressant ! Assurez-vous qu'il n'y a pas d'incompatibilité avec vos autres produits. ✨",
                remove_step: 'Étape retirée. Parfois, simplifier sa routine est la meilleure approche ! 🌿',
            };
            return {
                advice: fallbacks[adviseDto.changeType] ||
                    'Modification enregistrée avec succès.',
                rating: 'neutral',
                emoji: '✨',
            };
        }
    }
    async recommendProductForStep(userId, dto) {
        let skinProfile = null;
        try {
            skinProfile = await this.skinProfileService.findByUserId(userId);
        }
        catch {
            this.logger.warn(`No skin profile for user ${userId}`);
        }
        const skinType = dto.skinType || skinProfile?.skinType || 'normal';
        const concerns = dto.concerns
            ? dto.concerns.split(',')
            : skinProfile?.concerns || [];
        const searchQuery = `${dto.stepCategory} ${dto.stepName} ${skinType}`;
        let relevantArticles = [];
        try {
            relevantArticles = await this.crawlingService.getRelevantArticles(searchQuery, 3);
        }
        catch {
            this.logger.warn('Failed to fetch relevant articles for recommendation');
        }
        const articlesCtx = relevantArticles.length > 0
            ? relevantArticles
                .slice(0, 2)
                .map((a) => a.title.substring(0, 50))
                .join(';')
            : '-';
        const st = (0, prompt_compression_util_1.abbrevSkinType)(skinType);
        const c = (0, prompt_compression_util_1.abbrevConcerns)(concerns);
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermato. Recommande 1 produit.
Étape:${dto.stepName}(${dto.stepCategory})${dto.stepDescription ? ` ${dto.stepDescription.substring(0, 50)}` : ''}
Peau:${st}|c:${c}
Réf:${articlesCtx}
Rép JSON:{productName,brand,description,keyIngredients:[],whyRecommended,estimatedPrice,purchaseUrl,rating:excellent|good|alternative}
Français.`);
        let productData;
        try {
            const result = await this.geminiService.getSkincareAdvice([skinType], [prompt]);
            const adviceText = typeof result === 'object'
                ? result?.advice || JSON.stringify(result)
                : String(result || '');
            const jsonMatch = adviceText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                productData = JSON.parse(jsonMatch[0]);
            }
        }
        catch (error) {
            this.logger.error('AI product recommendation failed', error.message);
        }
        if (!productData) {
            productData = this.getFallbackProduct(dto.stepCategory, skinType);
        }
        const purchaseUrl = productData.purchaseUrl ||
            `https://www.sephora.fr/search?q=${encodeURIComponent(productData.productName || dto.stepName)}`;
        let qrCodeDataUrl = '';
        try {
            qrCodeDataUrl = await QRCode.toDataURL(purchaseUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#0EA5E9', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });
        }
        catch {
            this.logger.warn('QR code generation failed');
        }
        return {
            productName: productData.productName || `${dto.stepName} recommandé`,
            brand: productData.brand || 'Marque recommandée',
            description: productData.description || `Produit idéal pour l'étape ${dto.stepName}`,
            keyIngredients: productData.keyIngredients || [],
            whyRecommended: productData.whyRecommended ||
                `Ce produit est adapté à votre type de peau ${skinType}.`,
            estimatedPrice: productData.estimatedPrice || '15-30€',
            purchaseUrl,
            qrCodeDataUrl,
            rating: productData.rating || 'good',
            sourceArticles: relevantArticles.map((a) => ({
                title: a.title,
                url: a.url,
            })),
        };
    }
    getFallbackProduct(category, skinType) {
        const fallbacks = {
            cleanser: {
                productName: 'CeraVe Hydrating Cleanser',
                brand: 'CeraVe',
                description: 'Nettoyant hydratant doux pour le visage avec céramides et acide hyaluronique.',
                keyIngredients: ['Céramides', 'Acide Hyaluronique', 'MVE Technology'],
                whyRecommended: `Parfait pour les peaux ${skinType}. Nettoie sans déshydrater et respecte la barrière cutanée.`,
                estimatedPrice: '10-15€',
                purchaseUrl: 'https://www.amazon.fr/s?k=CeraVe+Hydrating+Cleanser',
                rating: 'excellent',
            },
            serum: {
                productName: 'The Ordinary Niacinamide 10% + Zinc 1%',
                brand: 'The Ordinary',
                description: 'Sérum concentré en niacinamide pour réduire les imperfections et affiner le grain de peau.',
                keyIngredients: ['Niacinamide 10%', 'Zinc PCA 1%'],
                whyRecommended: `Idéal pour les peaux ${skinType}. Régule le sébum et améliore la texture de la peau.`,
                estimatedPrice: '6-10€',
                purchaseUrl: 'https://www.amazon.fr/s?k=The+Ordinary+Niacinamide',
                rating: 'excellent',
            },
            moisturizer: {
                productName: 'La Roche-Posay Toleriane Double Repair',
                brand: 'La Roche-Posay',
                description: 'Crème hydratante réparatrice qui restaure la barrière cutanée.',
                keyIngredients: ['Céramide-3', 'Niacinamide', 'Glycérine'],
                whyRecommended: `Excellent choix pour les peaux ${skinType}. Hydrate en profondeur sans laisser de film gras.`,
                estimatedPrice: '15-20€',
                purchaseUrl: 'https://www.amazon.fr/s?k=La+Roche-Posay+Toleriane',
                rating: 'excellent',
            },
            sunscreen: {
                productName: 'La Roche-Posay Anthelios UVMune 400 SPF50+',
                brand: 'La Roche-Posay',
                description: 'Protection solaire très haute à large spectre, fluide invisible.',
                keyIngredients: ['Mexoryl 400', 'Filtres UVA/UVB', 'Eau thermale'],
                whyRecommended: `Indispensable pour toutes les peaux. Protection maximale avec une texture ultra-légère.`,
                estimatedPrice: '15-22€',
                purchaseUrl: 'https://www.amazon.fr/s?k=La+Roche-Posay+Anthelios+SPF50',
                rating: 'excellent',
            },
            toner: {
                productName: "Paula's Choice Skin Perfecting 2% BHA",
                brand: "Paula's Choice",
                description: "Exfoliant liquide à l'acide salicylique pour désobstruer les pores.",
                keyIngredients: ['Acide Salicylique 2%', 'Thé vert', 'Glycérine'],
                whyRecommended: `Adapté aux peaux ${skinType}. Affine le grain de peau et prévient les imperfections.`,
                estimatedPrice: '15-35€',
                purchaseUrl: 'https://www.amazon.fr/s?k=Paulas+Choice+BHA',
                rating: 'good',
            },
        };
        return (fallbacks[category] || {
            productName: `Produit ${category} recommandé`,
            brand: 'CeraVe',
            description: `Produit adapté pour l'étape ${category} de votre routine skincare.`,
            keyIngredients: ['Céramides', 'Acide Hyaluronique'],
            whyRecommended: `Ce produit est recommandé pour les peaux ${skinType}.`,
            estimatedPrice: '10-25€',
            purchaseUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(category)}+skincare`,
            rating: 'good',
        });
    }
    async shareAsPost(routineId, userId, shareDto) {
        const routine = await this.findOne(routineId, userId);
        const postMessage = this.formatRoutineAsPost(routine, shareDto.customMessage);
        const post = await this.postsService.create(userId, {
            message: postMessage,
            media: shareDto.coverImage,
        });
        this.logger.log(`Routine ${routineId} shared as post ${post.id} by user ${userId}`);
        return {
            post,
            routine,
            message: 'Routine partagée avec succès!',
        };
    }
    formatRoutineAsPost(routine, customMessage) {
        const steps = routine.steps || [];
        const typeEmoji = {
            AM: '🌅',
            PM: '🌙',
            weekly: '⭐',
        };
        const emoji = typeEmoji[routine.type] || '✨';
        let message = `${emoji} ${routine.name}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `${routine.type} • ${steps.length} étapes\n\n`;
        if (customMessage) {
            message += `💬 "${customMessage}"\n`;
            message += `\n`;
        }
        message += '📋 Étapes de la routine:\n';
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        steps.slice(0, 5).forEach((step, index) => {
            const stepNum = index + 1;
            message += `${stepNum}️⃣ ${step.name}`;
            if (step.productName) {
                message += ` ✨ ${step.productName}`;
            }
            if (step.duration) {
                const minutes = Math.round(step.duration / 60);
                message += ` ⏱️ ${minutes}m`;
            }
            message += '\n';
        });
        if (steps.length > 5) {
            message += `\n... et ${steps.length - 5} étape(s) supplémentaire(s)\n`;
        }
        if (routine.notes) {
            message += `\n📝 ${routine.notes.substring(0, 120)}\n`;
        }
        message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `#SkincareRoutine #DeepSkyn #BeautyCare #RoutineBeauté #SkinCare`;
        if (message.length > 1900) {
            message = message.substring(0, 1890) + '...';
        }
        return message;
    }
};
exports.RoutineService = RoutineService;
exports.RoutineService = RoutineService = RoutineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService,
        skin_profile_service_1.SkinProfileService,
        notification_service_1.NotificationService,
        crawling_service_1.CrawlingService,
        posts_service_1.PostsService,
        subscription_service_1.SubscriptionService])
], RoutineService);
//# sourceMappingURL=routine.service.js.map