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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StripeWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const stripe_1 = require("stripe");
const subscription_service_1 = require("./subscription.service");
const create_subscription_dto_1 = require("./dto/create-subscription.dto");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const coupons_service_1 = require("../coupons/coupons.service");
let StripeWebhookController = StripeWebhookController_1 = class StripeWebhookController {
    constructor(subscriptionService, prisma, notificationService, couponsService) {
        this.subscriptionService = subscriptionService;
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.couponsService = couponsService;
        this.logger = new common_1.Logger(StripeWebhookController_1.name);
    }
    stripeClient() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('Missing STRIPE_SECRET_KEY in environment');
        }
        return new stripe_1.default(secretKey, {
            apiVersion: process.env.STRIPE_API_VERSION || undefined,
        });
    }
    async handleStripeWebhook(req, signature) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('Missing STRIPE_WEBHOOK_SECRET in environment');
        }
        if (!signature) {
            throw new Error('Missing stripe-signature header');
        }
        const stripe = this.stripeClient();
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('Missing raw body. Ensure main.ts uses express.raw for /webhook route.');
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error(`Stripe webhook signature verification failed: ${err?.message || err}`);
            throw new common_1.BadRequestException('Invalid Stripe signature');
        }
        this.logger.log(`Stripe webhook received: ${event.type}`);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId ||
                    session.client_reference_id;
                const planCodeRaw = session.metadata?.planCode ||
                    session.metadata?.plan;
                const couponCode = session.metadata?.couponCode || '';
                const planCode = String(planCodeRaw || '')
                    .trim()
                    .toLowerCase();
                if (!userId) {
                    this.logger.warn('checkout.session.completed missing userId');
                    break;
                }
                if (!planCode || planCode === 'free') {
                    this.logger.warn(`checkout.session.completed missing/invalid planCode: ${String(planCodeRaw)}`);
                    break;
                }
                await this.subscriptionService.findOrCreateByUserId(userId);
                const plans = await this.subscriptionService.getAvailablePlans();
                const planInfo = plans[planCode];
                if (!planInfo || planInfo.duration <= 0) {
                    this.logger.warn(`Plan details not found for planCode=${planCode}`);
                }
                const startDate = new Date();
                let endDate = null;
                if (planInfo?.duration && planInfo.duration > 0) {
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + planInfo.duration);
                }
                const stripeSubscriptionId = typeof session.subscription === 'string'
                    ? session.subscription
                    : null;
                const chargedAmount = typeof session.amount_total === 'number'
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
                        status: create_subscription_dto_1.SubscriptionStatus.ACTIVE,
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
                this.logger.log(`Subscription updated for user=${userId} planCode=${planCode} stripeSub=${stripeSubscriptionId ?? 'n/a'}`);
                break;
            }
            case 'customer.subscription.deleted': {
                break;
            }
            default:
                break;
        }
        return { received: true };
    }
};
exports.StripeWebhookController = StripeWebhookController;
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StripeWebhookController.prototype, "handleStripeWebhook", null);
exports.StripeWebhookController = StripeWebhookController = StripeWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Subscriptions'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        coupons_service_1.CouponsService])
], StripeWebhookController);
//# sourceMappingURL=stripe-webhook.controller.js.map