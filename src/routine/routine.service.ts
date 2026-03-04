import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../analysis/services/gemini.service';
import { SkinProfileService } from '../skin-profile/skin-profile.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateRoutineDto,
  UpdateRoutineDto,
  GenerateRoutineDto,
  RoutineType,
} from './dto';
import { Routine } from '@prisma/client';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly skinProfileService: SkinProfileService,
    private readonly notificationService: NotificationService,
  ) {}

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
   * Build prompt for routine generation
   */
  private buildRoutinePrompt(context: any): string {
    const typeDesc =
      context.routineType === 'AM'
        ? 'morning (AM)'
        : context.routineType === 'PM'
          ? 'evening (PM)'
          : 'weekly treatment';

    return `
Create a personalized ${typeDesc} skincare routine with the following parameters:
- Skin Type: ${context.skinType}
- Concerns: ${context.concerns?.join(', ') || 'none specified'}
- Sensitivities: ${context.sensitivities?.join(', ') || 'none'}
- Budget: ${context.budget}
- Fitzpatrick Type: ${context.fitzpatrickType || 'not specified'}
${context.preferredBrands ? `- Preferred Brands: ${context.preferredBrands}` : ''}
${context.additionalNotes ? `- Additional Notes: ${context.additionalNotes}` : ''}

Please provide a routine with 4-7 steps, including product categories and application order.
Format each step with: order, name, category, description, duration (in seconds).
    `.trim();
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
}
