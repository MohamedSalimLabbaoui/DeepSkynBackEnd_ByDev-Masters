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
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  UpgradeSubscriptionDto,
  SubscriptionPlan,
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

  // Configuration des plans
  private readonly planDetails: Record<SubscriptionPlan, PlanDetails> = {
    [SubscriptionPlan.FREE]: {
      name: 'Gratuit',
      price: 0,
      currency: 'TND',
      duration: -1, // illimité
      features: [
        '3 analyses par mois',
        'Routines basiques',
        'Conseils généraux',
      ],
    },
    [SubscriptionPlan.PREMIUM]: {
      name: 'Premium Mensuel',
      price: 19.99,
      currency: 'TND',
      duration: 30,
      features: [
        'Analyses illimitées',
        'Routines personnalisées AI',
        'Chat AI illimité',
        'Suivi avancé',
        'Recommandations produits',
        'Support prioritaire',
      ],
    },
    [SubscriptionPlan.PREMIUM_YEARLY]: {
      name: 'Premium Annuel',
      price: 199.99,
      currency: 'TND',
      duration: 365,
      features: [
        'Toutes les fonctionnalités Premium',
        '2 mois gratuits',
        'Accès anticipé aux nouvelles fonctionnalités',
      ],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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

    const plan = createSubscriptionDto.plan || SubscriptionPlan.FREE;
    const planInfo = this.planDetails[plan];

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
        plan,
        status: createSubscriptionDto.status || SubscriptionStatus.ACTIVE,
        amount: createSubscriptionDto.amount ?? planInfo.price,
        currency: createSubscriptionDto.currency || planInfo.currency,
        startDate,
        endDate,
      },
    });

    this.logger.log(`Subscription created for user ${userId}: ${plan}`);

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
        plan: SubscriptionPlan.FREE,
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

    if (updateSubscriptionDto.plan) {
      updateData.plan = updateSubscriptionDto.plan;
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
    const newPlan = upgradeDto.plan;

    // Vérifier que c'est bien une mise à niveau
    if (currentSub.plan === newPlan) {
      throw new BadRequestException('Already on this plan');
    }

    if (
      currentSub.plan === SubscriptionPlan.PREMIUM_YEARLY &&
      newPlan === SubscriptionPlan.PREMIUM
    ) {
      throw new BadRequestException('Cannot downgrade from yearly to monthly');
    }

    const planInfo = this.planDetails[newPlan];

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
        plan: newPlan,
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

    this.logger.log(`Subscription upgraded for user ${userId}: ${newPlan}`);

    return subscription;
  }

  /**
   * Annuler un abonnement
   */
  async cancel(userId: string): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (subscription.plan === SubscriptionPlan.FREE) {
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

      if (subscription.plan === SubscriptionPlan.FREE) {
        return false;
      }

      // Vérifier l'expiration
      if (subscription.endDate && new Date() > subscription.endDate) {
        // Mettre à jour le statut
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
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
    const planDetails = this.planDetails[subscription.plan as SubscriptionPlan];
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

  /**
   * Obtenir tous les plans disponibles
   */
  getAvailablePlans(): Record<string, PlanDetails> {
    return this.planDetails;
  }

  /**
   * Renouveler un abonnement expiré
   */
  async renew(userId: string): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (subscription.plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Cannot renew free plan');
    }

    const planInfo = this.planDetails[subscription.plan as SubscriptionPlan];

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planInfo.duration);

    // TODO: Intégrer le paiement ici

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
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

    const byPlan: Record<string, number> = {
      free: 0,
      premium: 0,
      premium_yearly: 0,
    };

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
    plan?: SubscriptionPlan;
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
        plan: { not: SubscriptionPlan.FREE },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} subscriptions`);
    }

    return expired.count;
  }
}
