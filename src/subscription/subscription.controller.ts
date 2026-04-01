import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
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
  CreatePlanDto,
  UpdateSubscriptionDto,
  UpdatePlanDto,
  UpgradeSubscriptionDto,
  SubscriptionStatus,
} from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import Stripe from 'stripe';
import { CouponsService } from '../coupons/coupons.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly couponsService: CouponsService,
  ) {}

  private stripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment');
    }
    return new Stripe(secretKey, {
      apiVersion: (process.env.STRIPE_API_VERSION as any) || undefined,
    });
  }

  private async getStripePriceId(planCode: string): Promise<string> {
    return this.subscriptionService.getStripePriceIdForPlan(planCode);
  }

  private async createCheckoutSessionForPlan(
    userId: string,
    dto: CreateStripeCheckoutDto,
  ) {
    const stripe = this.stripeClient();
    const planCode = dto.plan || dto.planCode;
    const priceId = await this.getStripePriceId(planCode);
    const couponCode = String(dto.couponCode || '').trim();

    let stripePromotionCodeId: string | undefined;
    if (couponCode) {
      const couponValidation = await this.couponsService.validateCouponForCheckout(
        userId,
        couponCode,
        planCode,
      );

      if (!couponValidation.stripePromotionCodeId) {
        throw new BadRequestException(
          'Coupon is valid but not configured for Stripe checkout (missing stripePromotionCodeId).',
        );
      }
      stripePromotionCodeId = couponValidation.stripePromotionCodeId;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/payment/cancel`;

    const discounts = stripePromotionCodeId
      ? ([{ promotion_code: stripePromotionCodeId }] as Stripe.Checkout.SessionCreateParams.Discount[])
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        planCode,
        plan: planCode,
        couponCode: couponCode || '',
      },
    });

    return { url: session.url, id: session.id };
  }

  @Get('payments/history')
  @UseGuards(KeycloakAuthGuard)
  async getMyPaymentHistory(@CurrentUser('userId') userId: string) {
    const subscription = await this.subscriptionService.findOrCreateByUserId(userId);

    // planId stores Stripe subscription id in current implementation.
    if (!subscription.planId) {
      return { payments: [] };
    }

    const stripe = this.stripeClient();
    const invoices = await stripe.invoices.list({
      subscription: subscription.planId,
      limit: 50,
    });

    const payments = invoices.data.map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      createdAt: new Date(invoice.created * 1000),
      status: invoice.status,
      amountPaid:
        typeof invoice.amount_paid === 'number'
          ? Number((invoice.amount_paid / 100).toFixed(2))
          : 0,
      amountDue:
        typeof invoice.amount_due === 'number'
          ? Number((invoice.amount_due / 100).toFixed(2))
          : 0,
      currency: (invoice.currency || '').toUpperCase(),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
    }));

    return { payments };
  }

  @Get('payments/:invoiceId/invoice')
  @UseGuards(KeycloakAuthGuard)
  async getMyInvoice(
    @CurrentUser('userId') userId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const subscription = await this.subscriptionService.findOrCreateByUserId(userId);
    if (!subscription.planId) {
      throw new BadRequestException('No paid subscription found for this user');
    }

    const stripe = this.stripeClient();
    const invoices = await stripe.invoices.list({
      subscription: subscription.planId,
      limit: 100,
    });
    const invoice = invoices.data.find((x) => x.id === invoiceId);

    if (!invoice) {
      throw new BadRequestException('Invoice does not belong to current user');
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      status: invoice.status,
      amountPaid:
        typeof invoice.amount_paid === 'number'
          ? Number((invoice.amount_paid / 100).toFixed(2))
          : 0,
      currency: (invoice.currency || '').toUpperCase(),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
    };
  }

  @Get('admin/payments/history')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getAdminPaymentsHistory(
    @Query('subscriptionsLimit') subscriptionsLimit?: string,
    @Query('invoicesPerSubscription') invoicesPerSubscription?: string,
  ) {
    const stripe = this.stripeClient();

    const subscriptionsCap = subscriptionsLimit
      ? Math.min(Math.max(parseInt(subscriptionsLimit, 10) || 100, 1), 1000)
      : 100;
    const invoicesCap = invoicesPerSubscription
      ? Math.min(Math.max(parseInt(invoicesPerSubscription, 10) || 20, 1), 100)
      : 20;

    const { subscriptions } = await this.subscriptionService.findAll({
      limit: subscriptionsCap,
      offset: 0,
    });

    const paidSubscriptions = subscriptions.filter(
      (sub: any) => !!sub.planId && sub.plan !== 'free',
    );

    const grouped = await Promise.all(
      paidSubscriptions.map(async (sub: any) => {
        try {
          const invoices = await stripe.invoices.list({
            subscription: sub.planId,
            limit: invoicesCap,
          });

          return invoices.data.map((invoice) => ({
            userId: sub.userId,
            userEmail: sub.user?.email || null,
            userName: sub.user?.name || null,
            subscriptionId: sub.id,
            planCode: sub.plan,
            stripeSubscriptionId: sub.planId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            createdAt: new Date(invoice.created * 1000),
            status: invoice.status,
            amountPaid:
              typeof invoice.amount_paid === 'number'
                ? Number((invoice.amount_paid / 100).toFixed(2))
                : 0,
            amountDue:
              typeof invoice.amount_due === 'number'
                ? Number((invoice.amount_due / 100).toFixed(2))
                : 0,
            currency: (invoice.currency || '').toUpperCase(),
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdfUrl: invoice.invoice_pdf,
          }));
        } catch {
          return [];
        }
      }),
    );

    const payments = grouped.flat().sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      total: payments.length,
      subscriptionsScanned: paidSubscriptions.length,
      payments,
    };
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
  
  @Get('me/usage')
  @ApiOperation({
    summary: 'Usage de l\'abonnement',
    description: "Récupère le résumé des quotas et de l'utilisation de l'abonnement",
  })
  @ApiResponse({ status: 200, description: 'Résumé de l\'utilisation retourné' })
  @UseGuards(KeycloakAuthGuard)
  async getMyUsage(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.getUsageSummary(userId);
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
  async getPlans() {
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
    return this.createCheckoutSessionForPlan(userId, dto);
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
   * Renouveler mon abonnement via Stripe Checkout
   */
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async renew(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateStripeCheckoutDto,
  ) {
    return this.createCheckoutSessionForPlan(userId, dto);
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
    @Query('plan') plan?: string,
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

  // ========== ADMIN PLAN CRUD ==========

  @Get('admin/plans')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminListPlans() {
    return this.subscriptionService.adminListPlans();
  }

  @Post('admin/plans')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminCreatePlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionService.adminCreatePlan(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminUpdatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.adminUpdatePlan(id, dto);
  }

  @Delete('admin/plans/:id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminDeletePlan(@Param('id') id: string) {
    return this.subscriptionService.adminDeletePlan(id);
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
