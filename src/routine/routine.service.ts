import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { NotificationService } from '../notification/notification.service';
import { CrawlingService } from '../crawling/crawling.service';
import { PostsService } from '../posts/posts.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  CreateRoutineDto,
  UpdateRoutineDto,
  GenerateRoutineDto,
  RoutineType,
  AdviseRoutineDto,
  RecommendProductDto,
  ProductRecommendation,
  ShareRoutineDto,
} from './dto';
import { Routine } from '@prisma/client';
import * as QRCode from 'qrcode';
import {
  abbrevSkinType,
  abbrevConcerns,
  compressWhitespace,
  buildCompactSkinContext,
} from './prompt-compression.util';

export interface RoutineStep {
  order: number;
  name: string;
  productName?: string;
  productBrand?: string;
  productImage?: string;
  description?: string;
  duration?: number;
  category?: string;
  isCompleted?: boolean;
}

export interface AIGeneratedRoutine {
  name: string;
  type: string;
  steps: RoutineStep[];
  notes?: string;
  reasoning?: string;
}

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  private readonly freeMonthlyAiRoutineLimit = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly skinProfileService: SkinProfileService,
    private readonly notificationService: NotificationService,
    private readonly crawlingService: CrawlingService,
    private readonly postsService: PostsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private async enforceAiRoutineAccess(userId: string): Promise<void> {
    const isPremium = await this.subscriptionService.isPremium(userId);
    if (isPremium) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

    const thisMonthCount = await this.prisma.routine.count({
      where: {
        userId,
        isAIGenerated: true,
        createdAt: { gte: startOfMonth },
      },
    });

    if (thisMonthCount >= this.freeMonthlyAiRoutineLimit) {
      throw new ForbiddenException(
        `Limite de ${this.freeMonthlyAiRoutineLimit} routines IA/mois atteinte. Réinitialisation: ${startOfNextMonth.toISOString()}. Passez à Premium pour des routines illimitées.`,
      );
    }
  }

  /**
   * Create a manual routine
   */
  async create(
    userId: string,
    createRoutineDto: CreateRoutineDto,
  ): Promise<Routine> {
    const routine = await this.prisma.routine.create({
      data: {
        userId,
        name: createRoutineDto.name,
        type: createRoutineDto.type,
        steps: createRoutineDto.steps as any,
        notes: createRoutineDto.notes,
        isActive: createRoutineDto.isActive ?? true,
        isAIGenerated: false,
      },
    });

    this.logger.log(`Manual routine created: ${routine.id} for user ${userId}`);

    return routine;
  }

  /**
   * Generate AI-powered routine based on user's skin profile
   */
  async generateWithAI(
    userId: string,
    generateDto: GenerateRoutineDto,
  ): Promise<Routine> {
    await this.enforceAiRoutineAccess(userId);

    // Get user's skin profile if available
    let skinProfile = null;
    try {
      skinProfile = await this.skinProfileService.findByUserId(userId);
    } catch (error) {
      this.logger.warn(`No skin profile found for user ${userId}`);
    }

    // Build context for AI
    const context = {
      routineType: generateDto.type,
      skinType: generateDto.skinType || skinProfile?.skinType || 'normal',
      concerns: generateDto.concerns || skinProfile?.concerns || [],
      sensitivities:
        generateDto.sensitivities || skinProfile?.sensitivities || [],
      budget: generateDto.budget || 'medium',
      preferredBrands: generateDto.preferredBrands,
      additionalNotes: generateDto.additionalNotes,
      fitzpatrickType: skinProfile?.fitzpatrickType,
    };

    // Generate routine with Gemini
    const aiRoutine = await this.generateRoutineWithGemini(context);

    // Save the routine
    const routine = await this.prisma.routine.create({
      data: {
        userId,
        name: aiRoutine.name,
        type: generateDto.type,
        steps: aiRoutine.steps as any,
        notes: aiRoutine.notes || aiRoutine.reasoning,
        isActive: true,
        isAIGenerated: true,
      },
    });

    // Send notification
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

  /**
   * Generate routine using Gemini AI
   */
  private async generateRoutineWithGemini(
    context: any,
  ): Promise<AIGeneratedRoutine> {
    const prompt = this.buildRoutinePrompt(context);

    try {
      const result = await this.geminiService.getSkincareAdvice(
        [context.skinType],
        [...(context.concerns || []), `Generate a skincare routine: ${prompt}`],
      );

      // Parse AI response into structured routine
      return this.parseAIResponse(result, context);
    } catch (error) {
      this.logger.error('Failed to generate routine with AI', error.message);
      // Fallback to default routine
      return this.getDefaultRoutine(context);
    }
  }

  /**
   * Build compressed prompt for routine generation
   * Reduces tokens by ~50% using abbreviations and compact format
   */
  private buildRoutinePrompt(context: any): string {
    const typeMap: Record<string, string> = { 'AM': 'matin', 'PM': 'soir', 'weekly': 'hebdo' };
    const type = typeMap[context.routineType] || context.routineType;
    const st = abbrevSkinType(context.skinType);
    const c = abbrevConcerns(context.concerns);
    const s = context.sensitivities?.length || 0;
    const b = context.budget?.charAt(0)?.toUpperCase() || 'M';
    const f = context.fitzpatrickType || '-';

    return compressWhitespace(`
Dermato expert. Routine ${type}.
Ctx:ty:${context.routineType}|st:${st}|c:${c}|s:${s}|b:${b}|f:${f}${context.preferredBrands ? `|m:${context.preferredBrands}` : ''}${context.additionalNotes ? `|n:${context.additionalNotes}` : ''}
Rép JSON:{name,type,steps:[{order,name,category,description,duration}],notes}
4-7 étapes. Durée sec.`);
  }

  /**
   * Parse AI response into structured routine
   */
  private parseAIResponse(aiResponse: any, context: any): AIGeneratedRoutine {
    const routineType = context.routineType;
    const routineName =
      routineType === 'AM'
        ? 'Routine Matin'
        : routineType === 'PM'
          ? 'Routine Soir'
          : 'Soin Hebdomadaire';

    // Try to extract steps from AI response
    const advice = aiResponse?.advice || aiResponse?.toString() || '';

    // Default steps based on routine type
    const steps = this.extractStepsFromAdvice(advice, routineType);

    return {
      name: `${routineName} - ${context.skinType}`,
      type: routineType,
      steps,
      notes: advice.substring(0, 500),
      reasoning: `Routine personnalisée pour peau ${context.skinType} avec préoccupations: ${context.concerns?.join(', ') || 'générales'}`,
    };
  }

  /**
   * Extract steps from AI advice
   */
  private extractStepsFromAdvice(
    advice: string,
    routineType: string,
  ): RoutineStep[] {
    // Default routine structure based on type
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
    } else if (routineType === 'PM') {
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
    } else {
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

  /**
   * Get default routine as fallback
   */
  private getDefaultRoutine(context: any): AIGeneratedRoutine {
    const steps = this.extractStepsFromAdvice('', context.routineType);
    const routineName =
      context.routineType === 'AM'
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

  /**
   * Get all routines for a user
   */
  async findAllByUser(
    userId: string,
    options?: {
      type?: RoutineType;
      isActive?: boolean;
      isAIGenerated?: boolean;
    },
  ): Promise<Routine[]> {
    const where: any = { userId };

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

  /**
   * Get a specific routine
   */
  async findOne(id: string, userId: string): Promise<Routine> {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
    });

    if (!routine) {
      throw new NotFoundException(`Routine ${id} not found`);
    }

    return routine;
  }

  /**
   * Update a routine
   */
  async update(
    id: string,
    userId: string,
    updateRoutineDto: UpdateRoutineDto,
  ): Promise<Routine> {
    await this.findOne(id, userId);

    return this.prisma.routine.update({
      where: { id },
      data: {
        name: updateRoutineDto.name,
        type: updateRoutineDto.type,
        steps: updateRoutineDto.steps as any,
        notes: updateRoutineDto.notes,
        isActive: updateRoutineDto.isActive,
      },
    });
  }

  /**
   * Toggle routine active status
   */
  async toggleActive(id: string, userId: string): Promise<Routine> {
    const routine = await this.findOne(id, userId);

    return this.prisma.routine.update({
      where: { id },
      data: { isActive: !routine.isActive },
    });
  }

  /**
   * Update step completion status
   */
  async updateStepCompletion(
    id: string,
    userId: string,
    stepOrder: number,
    isCompleted: boolean,
  ): Promise<Routine> {
    const routine = await this.findOne(id, userId);
    const steps = routine.steps as unknown as RoutineStep[];

    const stepIndex = steps.findIndex((s) => s.order === stepOrder);
    if (stepIndex === -1) {
      throw new BadRequestException(`Step ${stepOrder} not found in routine`);
    }

    steps[stepIndex].isCompleted = isCompleted;

    return this.prisma.routine.update({
      where: { id },
      data: { steps: steps as any },
    });
  }

  /**
   * Reset all steps completion for a routine
   */
  /**
   * Reset all steps completion for a routine
   */
  async resetStepsCompletion(id: string, userId: string): Promise<Routine> {
    const routine = await this.findOne(id, userId);
    const steps = (routine.steps as unknown as RoutineStep[]).map((step) => ({
      ...step,
      isCompleted: false,
    }));

    return this.prisma.routine.update({
      where: { id },
      data: { steps: steps as any },
    });
  }

  /**
   * Duplicate a routine
   */
  async duplicate(
    id: string,
    userId: string,
    newName?: string,
  ): Promise<Routine> {
    const original = await this.findOne(id, userId);

    return this.prisma.routine.create({
      data: {
        userId,
        name: newName || `${original.name} (copie)`,
        type: original.type,
        steps: original.steps as any,
        notes: original.notes,
        isActive: true,
        isAIGenerated: false,
      },
    });
  }

  /**
   * Delete a routine
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);

    await this.prisma.routine.delete({
      where: { id },
    });

    this.logger.log(`Routine ${id} deleted`);
  }

  /**
   * Get routine statistics for a user
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    active: number;
    aiGenerated: number;
    byType: { AM: number; PM: number; weekly: number };
  }> {
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

  /**
   * Get routine type display name
   */
  private getRoutineTypeName(type: string): string {
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

  /**
   * Add a step to existing routine
   */
  async addStep(
    id: string,
    userId: string,
    step: RoutineStep,
  ): Promise<Routine> {
    const routine = await this.findOne(id, userId);
    const steps = routine.steps as unknown as RoutineStep[];

    // Auto-assign order if not provided
    if (!step.order) {
      step.order = steps.length + 1;
    }

    steps.push(step);

    // Reorder steps
    steps.sort((a, b) => a.order - b.order);

    return this.prisma.routine.update({
      where: { id },
      data: { steps: steps as any },
    });
  }

  /**
   * Remove a step from routine
   */
  async removeStep(
    id: string,
    userId: string,
    stepOrder: number,
  ): Promise<Routine> {
    const routine = await this.findOne(id, userId);
    let steps = routine.steps as unknown as RoutineStep[];

    steps = steps.filter((s) => s.order !== stepOrder);

    // Reorder remaining steps
    steps = steps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));

    return this.prisma.routine.update({
      where: { id },
      data: { steps: steps as any },
    });
  }

  /**
   * Reorder steps in routine
   */
  async reorderSteps(
    id: string,
    userId: string,
    newOrder: number[],
  ): Promise<Routine> {
    const routine = await this.findOne(id, userId);
    const steps = routine.steps as unknown as RoutineStep[];

    if (newOrder.length !== steps.length) {
      throw new BadRequestException('New order must contain all step orders');
    }

    const reorderedSteps = newOrder.map((oldOrder, newIndex) => {
      const step = steps.find((s) => s.order === oldOrder);
      if (!step) {
        throw new BadRequestException(`Step ${oldOrder} not found`);
      }
      return { ...step, order: newIndex + 1 };
    });

    return this.prisma.routine.update({
      where: { id },
      data: { steps: reorderedSteps as any },
    });
  }

  /**
   * Get AI advice on a routine change (compressed prompt)
   */
  async adviseOnChange(
    userId: string,
    routineId: string,
    adviseDto: AdviseRoutineDto,
  ): Promise<{ advice: string; rating: string; emoji: string }> {
    let skinProfile = null;
    try {
      skinProfile = await this.skinProfileService.findByUserId(userId);
    } catch {
      this.logger.warn(`No skin profile found for user ${userId}`);
    }

    // Compressed prompt - ~60% token reduction
    const skinCtx = skinProfile
      ? buildCompactSkinContext({
          skinType: skinProfile.skinType,
          concerns: skinProfile.concerns as string[],
          sensitivities: skinProfile.sensitivities as string[],
        })
      : '-';
    const stepsStr = adviseDto.currentSteps.map((s, i) => `${i + 1}.${s}`).join(',');

    const prompt = compressWhitespace(`
Dermato expert. Conseil modif routine.
Profil:${skinCtx}
Modif:${adviseDto.changeType}${adviseDto.changeDescription ? ` (${adviseDto.changeDescription})` : ''}${adviseDto.addedStepName ? ` +${adviseDto.addedStepName}` : ''}
Étapes:[${stepsStr}]
Rép JSON:{advice,rating:good|neutral|caution,emoji}
2-3 phrases, français.`);

    try {
      const result = await this.geminiService.getSkincareAdvice(
        [skinProfile?.skinType || 'normal'],
        [prompt],
      );

      const adviceText = typeof result === 'object' ? (result as any)?.advice || JSON.stringify(result) : String(result || '');

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
      } catch {
        // If JSON parsing fails, return raw advice
      }

      return {
        advice:
          adviceText.substring(0, 300) ||
          'Modification enregistrée. Continuez à prendre soin de votre peau !',
        rating: 'neutral',
        emoji: '✨',
      };
    } catch (error) {
      this.logger.error('Failed to get AI advice', error.message);

      const fallbacks = {
        reorder:
          "Réorganisation notée ! L'ordre d'application est important — du plus léger au plus épais est généralement recommandé. 👍",
        add_step:
          "Nouvel ajout intéressant ! Assurez-vous qu'il n'y a pas d'incompatibilité avec vos autres produits. ✨",
        remove_step:
          'Étape retirée. Parfois, simplifier sa routine est la meilleure approche ! 🌿',
      };

      return {
        advice:
          fallbacks[adviseDto.changeType] ||
          'Modification enregistrée avec succès.',
        rating: 'neutral',
        emoji: '✨',
      };
    }
  }

  /**
   * Recommend a product for a routine step using AI + crawled articles (compressed prompt)
   */
  async recommendProductForStep(
    userId: string,
    dto: RecommendProductDto,
  ): Promise<ProductRecommendation> {
    let skinProfile = null;
    try {
      skinProfile = await this.skinProfileService.findByUserId(userId);
    } catch {
      this.logger.warn(`No skin profile for user ${userId}`);
    }

    const skinType = dto.skinType || skinProfile?.skinType || 'normal';
    const concerns = dto.concerns
      ? dto.concerns.split(',')
      : skinProfile?.concerns || [];

    // Search crawled articles for relevant product info
    const searchQuery = `${dto.stepCategory} ${dto.stepName} ${skinType}`;
    let relevantArticles: { title: string; summary: string; source: string; url: string }[] = [];
    try {
      relevantArticles = await this.crawlingService.getRelevantArticles(searchQuery, 3);
    } catch {
      this.logger.warn('Failed to fetch relevant articles for recommendation');
    }

    // Compressed articles context (max 150 chars)
    const articlesCtx = relevantArticles.length > 0
      ? relevantArticles.slice(0, 2).map(a => a.title.substring(0, 50)).join(';')
      : '-';

    // Compressed prompt - ~65% token reduction
    const st = abbrevSkinType(skinType);
    const c = abbrevConcerns(concerns as string[]);
    
    const prompt = compressWhitespace(`
Dermato. Recommande 1 produit.
Étape:${dto.stepName}(${dto.stepCategory})${dto.stepDescription ? ` ${dto.stepDescription.substring(0, 50)}` : ''}
Peau:${st}|c:${c}
Réf:${articlesCtx}
Rép JSON:{productName,brand,description,keyIngredients:[],whyRecommended,estimatedPrice,purchaseUrl,rating:excellent|good|alternative}
Français.`);

    let productData: any;
    try {
      const result = await this.geminiService.getSkincareAdvice(
        [skinType],
        [prompt],
      );

      const adviceText = typeof result === 'object'
        ? (result as any)?.advice || JSON.stringify(result)
        : String(result || '');

      const jsonMatch = adviceText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productData = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error('AI product recommendation failed', error.message);
    }

    if (!productData) {
      productData = this.getFallbackProduct(dto.stepCategory, skinType);
    }

    const purchaseUrl = productData.purchaseUrl || `https://www.sephora.fr/search?q=${encodeURIComponent(productData.productName || dto.stepName)}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(purchaseUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#0EA5E9', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch {
      this.logger.warn('QR code generation failed');
    }

    return {
      productName: productData.productName || `${dto.stepName} recommandé`,
      brand: productData.brand || 'Marque recommandée',
      description: productData.description || `Produit idéal pour l'étape ${dto.stepName}`,
      keyIngredients: productData.keyIngredients || [],
      whyRecommended: productData.whyRecommended || `Ce produit est adapté à votre type de peau ${skinType}.`,
      estimatedPrice: productData.estimatedPrice || '15-30€',
      purchaseUrl,
      qrCodeDataUrl,
      rating: productData.rating || 'good',
      sourceArticles: relevantArticles.map((a) => ({ title: a.title, url: a.url })),
    };
  }

  /**
   * Fallback product recommendation if AI fails
   */
  private getFallbackProduct(category: string, skinType: string): any {
    const fallbacks: Record<string, any> = {
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
        productName: 'Paula\'s Choice Skin Perfecting 2% BHA',
        brand: 'Paula\'s Choice',
        description: 'Exfoliant liquide à l\'acide salicylique pour désobstruer les pores.',
        keyIngredients: ['Acide Salicylique 2%', 'Thé vert', 'Glycérine'],
        whyRecommended: `Adapté aux peaux ${skinType}. Affine le grain de peau et prévient les imperfections.`,
        estimatedPrice: '15-35€',
        purchaseUrl: 'https://www.amazon.fr/s?k=Paulas+Choice+BHA',
        rating: 'good',
      },
    };

    return fallbacks[category] || {
      productName: `Produit ${category} recommandé`,
      brand: 'CeraVe',
      description: `Produit adapté pour l'étape ${category} de votre routine skincare.`,
      keyIngredients: ['Céramides', 'Acide Hyaluronique'],
      whyRecommended: `Ce produit est recommandé pour les peaux ${skinType}.`,
      estimatedPrice: '10-25€',
      purchaseUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(category)}+skincare`,
      rating: 'good',
    };
  }

  /**
   * Share a routine as a social post
   */
  async shareAsPost(
    routineId: string,
    userId: string,
    shareDto: ShareRoutineDto,
  ): Promise<any> {
    // Verify routine exists and belongs to user
    const routine = await this.findOne(routineId, userId);

    // Format routine as an attractive post message
    const postMessage = this.formatRoutineAsPost(routine, shareDto.customMessage);

    // Create the post with the formatted routine
    const post = await this.postsService.create(userId, {
      message: postMessage,
      media: shareDto.coverImage,
    });

    this.logger.log(
      `Routine ${routineId} shared as post ${post.id} by user ${userId}`,
    );

    return {
      post,
      routine,
      message: 'Routine partagée avec succès!',
    };
  }

  /**
   * Format routine as an attractive post message
   */
  private formatRoutineAsPost(
    routine: Routine,
    customMessage?: string,
  ): string {
    const steps = (routine.steps as unknown as RoutineStep[]) || [];
    
    const typeEmoji = {
      AM: '🌅',
      PM: '🌙',
      weekly: '⭐',
    };

    const emoji = typeEmoji[routine.type as keyof typeof typeEmoji] || '✨';

    // Format the routine title with better structure
    let message = `${emoji} ${routine.name}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `${routine.type} • ${steps.length} étapes\n\n`;

    // Add custom message if provided with emphasis
    if (customMessage) {
      message += `💬 "${customMessage}"\n`;
      message += `\n`;
    }

    // Add steps summary with better formatting
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

    // Add routine notes if available
    if (routine.notes) {
      message += `\n📝 ${routine.notes.substring(0, 120)}\n`;
    }

    // Add hashtags for better discoverability with separator
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `#SkincareRoutine #DeepSkyn #BeautyCare #RoutineBeauté #SkinCare`;

    // Ensure message doesn't exceed post limit
    if (message.length > 1900) {
      message = message.substring(0, 1890) + '...';
    }

    return message;
  }
}
