import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreatePlanDto,
  CreateSubscriptionDto,
  UpdatePlanDto,
  UpdateSubscriptionDto,
  UpgradeSubscriptionDto,
  SubscriptionStatus,
} from './dto';
import { Subscription } from '@prisma/client';

export interface PlanDetails {
  name: string;
  price: number;
  currency: string;
  duration: number; // en jours
  features: string[];
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  private static readonly FREE_PLAN_CODE = 'free';
  private static readonly PREMIUM_MONTHLY_PLAN_CODE = 'premium';
  private static readonly PREMIUM_YEARLY_PLAN_CODE = 'premium_yearly';

  private readonly freeMonthlyAnalysisLimit = 3;
  private readonly freeMonthlyAiRoutineLimit = 3;
  private readonly freeDailyChatMessageLimit = 10;

  // Configuration des plans
  private readonly planDetailsFallback: Record<string, PlanDetails> = {
    [SubscriptionService.FREE_PLAN_CODE]: {
      name: 'Free',
      price: 0,
      currency: 'TND',
      duration: -1, // illimité
      features: [
        '3 analyses per month',
        '3 AI routines per month',
        'Unlimited manual routines',
        'AI chat limited to 10 messages/day',
        'General guidance',
      ],
    },
    [SubscriptionService.PREMIUM_MONTHLY_PLAN_CODE]: {
      name: 'Premium Monthly',
      price: 19.99,
      currency: 'TND',
      duration: 30,
      features: [
        'Unlimited analyses',
        'AI personalized routines',
        'Unlimited AI chat',
        'Advanced tracking',
        'Product recommendations',
        'Priority support',
      ],
    },
    [SubscriptionService.PREMIUM_YEARLY_PLAN_CODE]: {
      name: 'Premium Yearly',
      price: 199.99,
      currency: 'TND',
      duration: 365,
      features: [
        'All Premium features',
        '2 months free',
        'Early access to new features',
      ],
    },
  };

  private normalizePlanCode(planCode: string | undefined | null): string {
    const normalized = String(planCode || '').trim().toLowerCase();
    return normalized || SubscriptionService.FREE_PLAN_CODE;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private daysInMonth(year: number, monthIndex0: number): number {
    return new Date(year, monthIndex0 + 1, 0).getDate();
  }

  private buildMonthlyResetDate(
    year: number,
    monthIndex0: number,
    anchorDay: number,
  ): Date {
    const day = Math.min(anchorDay, this.daysInMonth(year, monthIndex0));
    const d = new Date(year, monthIndex0, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private computeMonthlyWindow(anchorDate: Date, now: Date): {
    periodStart: Date;
    nextReset: Date;
  } {
    const anchorDay = this.startOfDay(anchorDate).getDate();
    const today = this.startOfDay(now);

    const thisMonthReset = this.buildMonthlyResetDate(
      today.getFullYear(),
      today.getMonth(),
      anchorDay,
    );

    if (today >= thisMonthReset) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        periodStart: thisMonthReset,
        nextReset: this.buildMonthlyResetDate(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          anchorDay,
        ),
      };
    }

    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    return {
      periodStart: this.buildMonthlyResetDate(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        anchorDay,
      ),
      nextReset: thisMonthReset,
    };
  }

  /**
   * For free-tier monthly quotas: compute window based on subscription start day.
   * Example: started on 15th => resets every 15th.
   */
  async getFreeMonthlyQuotaWindow(userId: string): Promise<{
    periodStart: Date;
    resetsAt: Date;
  }> {
    const subscription = await this.findOrCreateByUserId(userId);
    const anchor = subscription.startDate || subscription.createdAt;
    const { periodStart, nextReset } = this.computeMonthlyWindow(anchor, new Date());
    return { periodStart, resetsAt: nextReset };
  }

  private planRowToDetails(row: {
    name: string;
    price: number;
    currency: string;
    durationDays: number;
    features: any;
  }): PlanDetails {
    const features = Array.isArray(row.features)
      ? (row.features as string[])
      : [];

    return {
      name: row.name,
      price: row.price,
      currency: row.currency,
      duration: row.durationDays,
      features,
    };
  }

  private async getPlanFromDb(planCode: string): Promise<{
    id: string;
    code: string;
    name: string;
    price: number;
    currency: string;
    durationDays: number;
    features: any;
    stripePriceId: string | null;
    isActive: boolean;
  } | null> {
    return this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });
  }

  private async getPlanDetails(planCodeInput: string): Promise<{
    planCode: string;
    details: PlanDetails;
    subscriptionPlanId?: string;
    stripePriceId?: string | null;
  }> {
    const planCode = this.normalizePlanCode(planCodeInput);

    const planRow = await this.getPlanFromDb(planCode);
    if (planRow && planRow.isActive) {
      return {
        planCode,
        details: this.planRowToDetails(planRow),
        subscriptionPlanId: planRow.id,
        stripePriceId: planRow.stripePriceId,
      };
    }

    const fallback =
      this.planDetailsFallback[planCode] ||
      this.planDetailsFallback[SubscriptionService.FREE_PLAN_CODE];

    return { planCode, details: fallback };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async adminListPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
    });
  }

  async adminCreatePlan(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        code: this.normalizePlanCode(dto.code),
        name: dto.name,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'TND',
        durationDays: dto.durationDays ?? -1,
        features: dto.features ?? [],
        stripePriceId: dto.stripePriceId ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async adminUpdatePlan(id: string, dto: UpdatePlanDto) {
    const data: any = {};
    if (dto.code !== undefined) data.code = this.normalizePlanCode(dto.code);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;
    if (dto.features !== undefined) data.features = dto.features;
    if (dto.stripePriceId !== undefined) data.stripePriceId = dto.stripePriceId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
  }

  async adminDeletePlan(id: string) {
    // Soft-delete to avoid breaking existing subscriptions
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUsageSummary(userId: string): Promise<{
    isPremium: boolean;
    subscription: Subscription;
    quotas: {
      analyses: {
        used: number;
        limit: number | null;
        remaining: number | null;
        resetsAt: Date | null;
      };
      aiRoutines: {
        used: number;
        limit: number | null;
        remaining: number | null;
        resetsAt: Date | null;
      };
      chatMessages: {
        used: number;
        limit: number | null;
        remaining: number | null;
        resetsAt: Date | null;
      };
    };
  }> {
    const subscription = await this.findOrCreateByUserId(userId);
    const isPremium = await this.isPremium(userId);

    if (isPremium) {
      return {
        isPremium,
        subscription,
        quotas: {
          analyses: { used: 0, limit: null, remaining: null, resetsAt: null },
          aiRoutines: { used: 0, limit: null, remaining: null, resetsAt: null },
          chatMessages: { used: 0, limit: null, remaining: null, resetsAt: null },
        },
      };
    }

    const now = new Date();

    const { periodStart, resetsAt } = await this.getFreeMonthlyQuotaWindow(userId);

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [analysesUsed, aiRoutinesUsed] = await Promise.all([
      this.prisma.analysis.count({
        where: { userId, createdAt: { gte: periodStart, lt: resetsAt } },
      }),
      this.prisma.routine.count({
        where: {
          userId,
          isAIGenerated: true,
          createdAt: { gte: periodStart, lt: resetsAt },
        },
      }),
    ]);

    const chats = await this.prisma.chatHistory.findMany({
      where: {
        userId,
        updatedAt: { gte: startOfToday },
      },
    });

    let chatMessagesUsed = 0;
    for (const chat of chats) {
      const messages = chat.messages as unknown as Array<{
        role?: string;
        timestamp?: string;
      }>;
      if (!Array.isArray(messages)) continue;
      chatMessagesUsed += messages.filter((m) => {
        const role = (m.role || '').toLowerCase();
        const ts = m.timestamp ? new Date(m.timestamp) : null;
        return role === 'user' && !!ts && ts >= startOfToday;
      }).length;
    }

    const analysisRemaining = Math.max(
      0,
      this.freeMonthlyAnalysisLimit - analysesUsed,
    );
    const aiRoutineRemaining = Math.max(
      0,
      this.freeMonthlyAiRoutineLimit - aiRoutinesUsed,
    );
    const chatRemaining = Math.max(
      0,
      this.freeDailyChatMessageLimit - chatMessagesUsed,
    );

    return {
      isPremium,
      subscription,
      quotas: {
        analyses: {
          used: analysesUsed,
          limit: this.freeMonthlyAnalysisLimit,
          remaining: analysisRemaining,
          resetsAt,
        },
        aiRoutines: {
          used: aiRoutinesUsed,
          limit: this.freeMonthlyAiRoutineLimit,
          remaining: aiRoutineRemaining,
          resetsAt,
        },
        chatMessages: {
          used: chatMessagesUsed,
          limit: this.freeDailyChatMessageLimit,
          remaining: chatRemaining,
          resetsAt: startOfTomorrow,
        },
      },
    };
  }

  /**
   * Créer un abonnement pour un utilisateur
   */
  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    // Vérifier si l'utilisateur a déjà un abonnement
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has a subscription');
    }

    const planCode = this.normalizePlanCode(
      createSubscriptionDto.plan || createSubscriptionDto.planCode,
    );
    const { details: planInfo, subscriptionPlanId } =
      await this.getPlanDetails(planCode);

    const startDate = createSubscriptionDto.startDate
      ? new Date(createSubscriptionDto.startDate)
      : new Date();

    let endDate: Date | null = null;
    if (planInfo.duration > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + planInfo.duration);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        plan: planCode,
        lastPaidPlan:
          planCode !== SubscriptionService.FREE_PLAN_CODE ? planCode : null,
        subscriptionPlanId,
        status: createSubscriptionDto.status || SubscriptionStatus.ACTIVE,
        amount: createSubscriptionDto.amount ?? planInfo.price,
        currency: createSubscriptionDto.currency || planInfo.currency,
        startDate,
        endDate,
      },
    });

    this.logger.log(`Subscription created for user ${userId}: ${planCode}`);

    return subscription;
  }

  /**
   * Obtenir l'abonnement d'un utilisateur
   */
  async findByUserId(userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Obtenir ou créer l'abonnement d'un utilisateur (avec plan gratuit par défaut)
   */
  async findOrCreateByUserId(userId: string): Promise<Subscription> {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await this.create(userId, {
        planCode: SubscriptionService.FREE_PLAN_CODE,
        status: SubscriptionStatus.ACTIVE,
      });
    }

    return subscription;
  }

  /**
   * Mettre à jour un abonnement
   */
  async update(
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    const updateData: any = {};

    const incomingPlan = updateSubscriptionDto.plan || updateSubscriptionDto.planCode;
    if (incomingPlan) {
      const planCode = this.normalizePlanCode(incomingPlan);
      const { subscriptionPlanId } = await this.getPlanDetails(planCode);
      updateData.plan = planCode;
      if (planCode !== SubscriptionService.FREE_PLAN_CODE) {
        updateData.lastPaidPlan = planCode;
      }
      updateData.subscriptionPlanId = subscriptionPlanId ?? null;
    }
    if (updateSubscriptionDto.status) {
      updateData.status = updateSubscriptionDto.status;
    }
    if (updateSubscriptionDto.amount !== undefined) {
      updateData.amount = updateSubscriptionDto.amount;
    }
    if (updateSubscriptionDto.currency) {
      updateData.currency = updateSubscriptionDto.currency;
    }
    if (updateSubscriptionDto.endDate) {
      updateData.endDate = new Date(updateSubscriptionDto.endDate);
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
  }

  /**
   * Mettre à niveau l'abonnement
   */
  async upgrade(
    userId: string,
    upgradeDto: UpgradeSubscriptionDto,
  ): Promise<Subscription> {
    const currentSub = await this.findOrCreateByUserId(userId);
    const newPlanCode = this.normalizePlanCode(upgradeDto.plan || upgradeDto.planCode);

    // Bloquer le changement de plan si un abonnement premium est encore actif et non expiré
    if (
      currentSub.plan !== SubscriptionService.FREE_PLAN_CODE &&
      currentSub.status === SubscriptionStatus.ACTIVE &&
      (!currentSub.endDate || new Date() <= new Date(currentSub.endDate))
    ) {
      throw new BadRequestException(
        'Subscription is still active. You cannot change plan until it expires or is cancelled.',
      );
    }

    // Vérifier que c'est bien une mise à niveau
    if (currentSub.plan === newPlanCode) {
      throw new BadRequestException('Already on this plan');
    }

    if (
      currentSub.plan === SubscriptionService.PREMIUM_YEARLY_PLAN_CODE &&
      newPlanCode === SubscriptionService.PREMIUM_MONTHLY_PLAN_CODE
    ) {
      throw new BadRequestException('Cannot downgrade from yearly to monthly');
    }

    const { details: planInfo, subscriptionPlanId } =
      await this.getPlanDetails(newPlanCode);

    const startDate = new Date();
    let endDate: Date | null = null;

    if (planInfo.duration > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + planInfo.duration);
    }

    // TODO: Intégrer le paiement ici
    // Pour l'instant, on simule un paiement réussi

    const subscription = await this.prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        plan: newPlanCode,
        lastPaidPlan: newPlanCode,
        subscriptionPlanId: subscriptionPlanId ?? null,
        status: SubscriptionStatus.ACTIVE,
        amount: planInfo.price,
        currency: planInfo.currency,
        startDate,
        endDate,
        cancelledAt: null,
      },
    });

    // Envoyer une notification
    await this.notificationService.create({
      userId,
      title: 'Abonnement mis à niveau',
      message: `Félicitations ! Vous êtes maintenant abonné au plan ${planInfo.name}.`,
      type: 'success',
      actionUrl: '/subscription',
    });

    this.logger.log(`Subscription upgraded for user ${userId}: ${newPlanCode}`);

    return subscription;
  }

  /**
   * Annuler un abonnement
   */
  async cancel(userId: string): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (subscription.plan === SubscriptionService.FREE_PLAN_CODE) {
      throw new BadRequestException('Cannot cancel free plan');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription already cancelled');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    // Envoyer une notification
    await this.notificationService.create({
      userId,
      title: 'Abonnement annulé',
      message: `Votre abonnement a été annulé. Vous avez accès aux fonctionnalités premium jusqu'au ${subscription.endDate?.toLocaleDateString('fr-FR') || 'fin de la période'}.`,
      type: 'warning',
      actionUrl: '/subscription',
    });

    this.logger.log(`Subscription cancelled for user ${userId}`);

    return updated;
  }

  /**
   * Réactiver un abonnement annulé
   */
  async reactivate(userId: string): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (subscription.status !== SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    // Vérifier si la période n'est pas expirée
    if (subscription.endDate && new Date() > subscription.endDate) {
      throw new BadRequestException(
        'Subscription has expired. Please upgrade to a new plan.',
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        cancelledAt: null,
      },
    });

    await this.notificationService.create({
      userId,
      title: 'Abonnement réactivé',
      message: 'Votre abonnement a été réactivé avec succès.',
      type: 'success',
      actionUrl: '/subscription',
    });

    this.logger.log(`Subscription reactivated for user ${userId}`);

    return updated;
  }

  /**
   * Vérifier si un utilisateur a un plan premium actif
   */
  async isPremium(userId: string): Promise<boolean> {
    try {
      const subscription = await this.findByUserId(userId);

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        return false;
      }

      if (subscription.plan === SubscriptionService.FREE_PLAN_CODE) {
        return false;
      }

      // Vérifier l'expiration
      if (subscription.endDate && new Date() > subscription.endDate) {
        // Mettre à jour le statut
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.EXPIRED,
            plan: SubscriptionService.FREE_PLAN_CODE,
            subscriptionPlanId: null,
            autoRenew: false,
          },
        });
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les détails du plan actuel
   */
  async getCurrentPlanDetails(userId: string): Promise<{
    subscription: Subscription;
    planDetails: PlanDetails;
    isPremium: boolean;
    daysRemaining: number | null;
  }> {
    const subscription = await this.findOrCreateByUserId(userId);
    const { details: planDetails } = await this.getPlanDetails(subscription.plan);
    const isPremium = await this.isPremium(userId);

    let daysRemaining: number | null = null;
    if (subscription.endDate) {
      const now = new Date();
      const end = new Date(subscription.endDate);
      daysRemaining = Math.max(
        0,
        Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    return {
      subscription,
      planDetails,
      isPremium,
      daysRemaining,
    };
  }

  async getStripePriceIdForPlan(planCodeInput: string): Promise<string> {
    const planCode = this.normalizePlanCode(planCodeInput);
    if (planCode === SubscriptionService.FREE_PLAN_CODE) {
      throw new BadRequestException('Stripe Checkout is only supported for paid plans');
    }

    const { stripePriceId } = await this.getPlanDetails(planCode);

    if (stripePriceId) return stripePriceId;

    // Fallback to env vars (useful when DB plans exist but stripePriceId wasn't seeded yet)
    const envPriceId =
      planCode === SubscriptionService.PREMIUM_MONTHLY_PLAN_CODE
        ? process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY
        : planCode === SubscriptionService.PREMIUM_YEARLY_PLAN_CODE
          ? process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY
          : undefined;

    if (envPriceId) return envPriceId;

    throw new BadRequestException(
      `Missing stripePriceId for planCode=${planCode}. Set it in subscription_plans table or in env vars (STRIPE_PRICE_ID_PREMIUM_MONTHLY / STRIPE_PRICE_ID_PREMIUM_YEARLY).`,
    );
  }

  /**
   * Obtenir tous les plans disponibles
   */
  async getAvailablePlans(): Promise<Record<string, PlanDetails>> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    if (plans.length === 0) {
      return this.planDetailsFallback;
    }

    const result: Record<string, PlanDetails> = {};
    for (const plan of plans) {
      result[plan.code] = this.planRowToDetails(plan);
    }
    return result;
  }

  /**
   * Renouveler un abonnement expiré
   */
  async renew(userId: string): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (subscription.plan === SubscriptionService.FREE_PLAN_CODE) {
      throw new BadRequestException('Cannot renew free plan');
    }

    const { details: planInfo } = await this.getPlanDetails(subscription.plan);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planInfo.duration);

    // TODO: Intégrer le paiement ici

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        lastPaidPlan: subscription.plan,
        startDate,
        endDate,
        cancelledAt: null,
      },
    });

    await this.notificationService.create({
      userId,
      title: 'Abonnement renouvelé',
      message: `Votre abonnement ${planInfo.name} a été renouvelé jusqu'au ${endDate.toLocaleDateString('fr-FR')}.`,
      type: 'success',
      actionUrl: '/subscription',
    });

    this.logger.log(`Subscription renewed for user ${userId}`);

    return updated;
  }

  /**
   * Statistiques des abonnements (admin)
   */
  async getStatistics(): Promise<{
    total: number;
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
    revenue: { total: number; currency: string };
  }> {
    const subscriptions = await this.prisma.subscription.findMany();

    const byPlan: Record<string, number> = {};

    const byStatus: Record<string, number> = {
      active: 0,
      cancelled: 0,
      expired: 0,
      pending: 0,
    };

    let totalRevenue = 0;

    for (const sub of subscriptions) {
      byPlan[sub.plan] = (byPlan[sub.plan] || 0) + 1;
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;

      if (sub.status === 'active' && sub.amount) {
        totalRevenue += sub.amount;
      }
    }

    return {
      total: subscriptions.length,
      byPlan,
      byStatus,
      revenue: {
        total: totalRevenue,
        currency: 'TND',
      },
    };
  }

  /**
   * Obtenir tous les abonnements (admin)
   */
  async findAll(options?: {
    plan?: string;
    status?: SubscriptionStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ subscriptions: Subscription[]; total: number }> {
    const where: any = {};

    if (options?.plan) {
      where.plan = options.plan;
    }
    if (options?.status) {
      where.status = options.status;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  /**
   * Vérifier et mettre à jour les abonnements expirés (cron job)
   */
  async checkAndExpireSubscriptions(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: now },
        plan: { not: SubscriptionService.FREE_PLAN_CODE },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        plan: SubscriptionService.FREE_PLAN_CODE,
        subscriptionPlanId: null,
        autoRenew: false,
      },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} subscriptions`);
    }

    return expired.count;
  }
}
