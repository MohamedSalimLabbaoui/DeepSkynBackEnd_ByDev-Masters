import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  CreateStripeCheckoutDto,
  UpdateSubscriptionDto,
  UpgradeSubscriptionDto,
  SubscriptionPlan,
  SubscriptionStatus,
} from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import Stripe from 'stripe';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  private stripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment');
    }
    return new Stripe(secretKey, {
      apiVersion: (process.env.STRIPE_API_VERSION as any) || undefined,
    });
  }

  private getStripePriceId(plan: SubscriptionPlan): string {
    if (plan === SubscriptionPlan.PREMIUM) {
      const priceId = process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY;
      if (!priceId) {
        throw new Error('Missing STRIPE_PRICE_ID_PREMIUM_MONTHLY in environment');
      }
      return priceId;
    }

    if (plan === SubscriptionPlan.PREMIUM_YEARLY) {
      const priceId = process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY;
      if (!priceId) {
        throw new Error('Missing STRIPE_PRICE_ID_PREMIUM_YEARLY in environment');
      }
      return priceId;
    }

    throw new Error('Stripe Checkout is only supported for premium plans');
  }

  @Get('me')
  @ApiOperation({
    summary: 'Mon abonnement',
    description: "Récupère les détails de l'abonnement actuel",
  })
  @ApiResponse({ status: 200, description: "Détails de l'abonnement" })
  @ApiResponse({ status: 404, description: 'Aucun abonnement trouvé' })
  @UseGuards(KeycloakAuthGuard)
  async getMySubscription(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.getCurrentPlanDetails(userId);
  }

  @Get('me/premium')
  @ApiOperation({
    summary: 'Vérifier premium',
    description: "Vérifie si l'utilisateur a un abonnement premium actif",
  })
  @ApiResponse({ status: 200, description: 'Statut premium retourné' })
  @UseGuards(KeycloakAuthGuard)
  async checkPremium(@CurrentUser('userId') userId: string) {
    const isPremium = await this.subscriptionService.isPremium(userId);
    return { isPremium };
  }

  /**
   * Obtenir les plans disponibles
   */
  @Get('plans')
  getPlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  /**
   * Démarrer un paiement Stripe Checkout (abonnement)
   */
  @Post('stripe/checkout')
  @UseGuards(KeycloakAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createStripeCheckout(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateStripeCheckoutDto,
  ) {
    const stripe = this.stripeClient();
    const priceId = this.getStripePriceId(dto.plan);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/payment/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        plan: dto.plan,
      },
    });

    return { url: session.url, id: session.id };
  }

  /**
   * Mettre à niveau mon abonnement
   */
  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async upgrade(
    @CurrentUser('userId') userId: string,
    @Body() upgradeDto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionService.upgrade(userId, upgradeDto);
  }

  /**
   * Annuler mon abonnement
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async cancel(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.cancel(userId);
  }

  /**
   * Réactiver mon abonnement annulé
   */
  @Post('reactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async reactivate(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.reactivate(userId);
  }

  /**
   * Renouveler mon abonnement expiré
   */
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async renew(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.renew(userId);
  }

  /**
   * Mettre à jour mon abonnement
   */
  @Patch('me')
  @UseGuards(KeycloakAuthGuard)
  async updateMySubscription(
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(userId, updateDto);
  }

  // ========== ADMIN ENDPOINTS ==========

  /**
   * [ADMIN] Obtenir les statistiques des abonnements
   */
  @Get('admin/statistics')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getStatistics() {
    return this.subscriptionService.getStatistics();
  }

  /**
   * [ADMIN] Liste tous les abonnements
   */
  @Get('admin/all')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllSubscriptions(
    @Query('plan') plan?: SubscriptionPlan,
    @Query('status') status?: SubscriptionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.subscriptionService.findAll({
      plan,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * [ADMIN] Vérifier et expirer les abonnements (normalement appelé par un cron)
   */
  @Post('admin/check-expired')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async checkExpired() {
    const count = await this.subscriptionService.checkAndExpireSubscriptions();
    return { expiredCount: count };
  }

  /**
   * [ADMIN] Créer un abonnement pour un utilisateur
   */
  @Post('admin/create/:userId')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async createForUser(
    @Param('userId') userId: string,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.create(userId, createDto);
  }
}
