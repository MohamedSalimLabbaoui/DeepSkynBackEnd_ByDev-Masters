import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatus } from './dto/create-subscription.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CouponsService } from '../coupons/coupons.service';

@ApiTags('Subscriptions')
@Controller()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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

  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET in environment');
    }
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const stripe = this.stripeClient();

    // rawBody is required to verify signature
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body. Ensure main.ts uses express.raw for /webhook route.',
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(
        `Stripe webhook signature verification failed: ${err?.message || err}`,
      );
      throw new BadRequestException('Invalid Stripe signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.userId as string) || (session.client_reference_id as string);
        const planCodeRaw =
          (session.metadata?.planCode as string | undefined) ||
          (session.metadata?.plan as string | undefined);
        const couponCode = (session.metadata?.couponCode as string | undefined) || '';
        const planCode = String(planCodeRaw || '').trim().toLowerCase();

        if (!userId) {
          this.logger.warn('checkout.session.completed missing userId');
          break;
        }
        if (!planCode || planCode === 'free') {
          this.logger.warn(
            `checkout.session.completed missing/invalid planCode: ${String(planCodeRaw)}`,
          );
          break;
        }

        // Ensure subscription row exists
        await this.subscriptionService.findOrCreateByUserId(userId);

        const plans = await this.subscriptionService.getAvailablePlans();
        const planInfo = plans[planCode];
        if (!planInfo || planInfo.duration <= 0) {
          this.logger.warn(`Plan details not found for planCode=${planCode}`);
        }

        const startDate = new Date();
        let endDate: Date | null = null;
        if (planInfo?.duration && planInfo.duration > 0) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + planInfo.duration);
        }

        const stripeSubscriptionId =
          typeof session.subscription === 'string' ? session.subscription : null;

        // Stripe sends amount_total in the smallest currency unit (e.g. cents).
        const chargedAmount =
          typeof session.amount_total === 'number'
            ? Number((session.amount_total / 100).toFixed(2))
            : undefined;
        const chargedCurrency = session.currency
          ? session.currency.toUpperCase()
          : undefined;

        const planRow = await this.prisma.subscriptionPlan.findUnique({
          where: { code: planCode },
          select: { id: true },
        });

        const updatedSubscription = await this.prisma.subscription.update({
          where: { userId },
          data: {
            plan: planCode,
            lastPaidPlan: planCode,
            status: SubscriptionStatus.ACTIVE,
            amount: chargedAmount ?? planInfo?.price ?? undefined,
            currency: chargedCurrency ?? planInfo?.currency ?? undefined,
            startDate,
            endDate,
            cancelledAt: null,
            planId: stripeSubscriptionId ?? undefined,
            subscriptionPlanId: planRow?.id ?? null,
          },
        });

        if (couponCode.trim()) {
          await this.couponsService.markCouponRedeemed({
            userId,
            couponCode,
            subscriptionId: updatedSubscription.id,
            stripeCheckoutSessionId: session.id,
          });
        }

        await this.notificationService.create({
          userId,
          title: 'Abonnement activé',
          message: `Votre abonnement ${planInfo?.name || String(planCode)} est maintenant actif.`,
          type: 'success',
          actionUrl: '/subscription',
        });

        this.logger.log(
          `Subscription updated for user=${userId} planCode=${planCode} stripeSub=${stripeSubscriptionId ?? 'n/a'}`,
        );
        break;
      }
      case 'customer.subscription.deleted': {
        // Optional: handle cancellations coming from Stripe
        // You can lookup user via metadata if you store stripeCustomerId later.
        break;
      }
      default:
        break;
    }

    return { received: true };
  }
}
