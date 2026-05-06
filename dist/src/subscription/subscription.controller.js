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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const subscription_service_1 = require("./subscription.service");
const dto_1 = require("./dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const stripe_1 = require("stripe");
const coupons_service_1 = require("../coupons/coupons.service");
let SubscriptionController = class SubscriptionController {
    constructor(subscriptionService, couponsService) {
        this.subscriptionService = subscriptionService;
        this.couponsService = couponsService;
    }
    isStripeAuthenticationError(error) {
        return error instanceof stripe_1.default.errors.StripeAuthenticationError;
    }
    handleStripeError(error) {
        if (error instanceof common_1.BadRequestException) {
            throw error;
        }
        if (this.isStripeAuthenticationError(error)) {
            throw new common_1.BadRequestException('Stripe API key is invalid or expired. Please update STRIPE_SECRET_KEY.');
        }
        if (error instanceof stripe_1.default.errors.StripeInvalidRequestError) {
            throw new common_1.BadRequestException(error.message);
        }
        const message = error instanceof Error ? error.message : 'Stripe request failed';
        throw new common_1.BadRequestException(message);
    }
    stripeClient() {
        const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
        if (!secretKey) {
            throw new common_1.BadRequestException('Missing STRIPE_SECRET_KEY in environment');
        }
        const apiVersion = process.env.STRIPE_API_VERSION?.trim();
        return new stripe_1.default(secretKey, {
            apiVersion: apiVersion || undefined,
        });
    }
    async getStripePriceId(planCode) {
        return this.subscriptionService.getStripePriceIdForPlan(planCode);
    }
    async createCheckoutSessionForPlan(userId, dto) {
        const stripe = this.stripeClient();
        const planCode = dto.plan || dto.planCode;
        const priceId = await this.getStripePriceId(planCode);
        const couponCode = String(dto.couponCode || '').trim();
        let stripePromotionCodeId;
        if (couponCode) {
            const couponValidation = await this.couponsService.validateCouponForCheckout(userId, couponCode, planCode);
            if (!couponValidation.stripePromotionCodeId) {
                throw new common_1.BadRequestException('Coupon is valid but not configured for Stripe checkout (missing stripePromotionCodeId).');
            }
            stripePromotionCodeId = couponValidation.stripePromotionCodeId;
        }
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${frontendUrl}/payment/cancel`;
        const discounts = stripePromotionCodeId
            ? [
                { promotion_code: stripePromotionCodeId },
            ]
            : undefined;
        let session;
        try {
            session = await stripe.checkout.sessions.create({
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
        }
        catch (error) {
            this.handleStripeError(error);
        }
        return { url: session.url, id: session.id };
    }
    async getMyPaymentHistory(userId) {
        const subscription = await this.subscriptionService.findOrCreateByUserId(userId);
        if (!subscription.planId) {
            return { payments: [] };
        }
        const stripe = this.stripeClient();
        let invoices;
        try {
            invoices = await stripe.invoices.list({
                subscription: subscription.planId,
                limit: 50,
            });
        }
        catch (error) {
            this.handleStripeError(error);
        }
        const payments = invoices.data.map((invoice) => ({
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            createdAt: new Date(invoice.created * 1000),
            status: invoice.status,
            amountPaid: typeof invoice.amount_paid === 'number'
                ? Number((invoice.amount_paid / 100).toFixed(2))
                : 0,
            amountDue: typeof invoice.amount_due === 'number'
                ? Number((invoice.amount_due / 100).toFixed(2))
                : 0,
            currency: (invoice.currency || '').toUpperCase(),
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdfUrl: invoice.invoice_pdf,
        }));
        return { payments };
    }
    async getMyInvoice(userId, invoiceId) {
        const subscription = await this.subscriptionService.findOrCreateByUserId(userId);
        if (!subscription.planId) {
            throw new common_1.BadRequestException('No paid subscription found for this user');
        }
        const stripe = this.stripeClient();
        let invoices;
        try {
            invoices = await stripe.invoices.list({
                subscription: subscription.planId,
                limit: 100,
            });
        }
        catch (error) {
            this.handleStripeError(error);
        }
        const invoice = invoices.data.find((x) => x.id === invoiceId);
        if (!invoice) {
            throw new common_1.BadRequestException('Invoice does not belong to current user');
        }
        return {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            status: invoice.status,
            amountPaid: typeof invoice.amount_paid === 'number'
                ? Number((invoice.amount_paid / 100).toFixed(2))
                : 0,
            currency: (invoice.currency || '').toUpperCase(),
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdfUrl: invoice.invoice_pdf,
        };
    }
    async getAdminPaymentsHistory(subscriptionsLimit, invoicesPerSubscription) {
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
        const paidSubscriptions = subscriptions.filter((sub) => !!sub.planId && sub.plan !== 'free');
        const grouped = await Promise.all(paidSubscriptions.map(async (sub) => {
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
                    amountPaid: typeof invoice.amount_paid === 'number'
                        ? Number((invoice.amount_paid / 100).toFixed(2))
                        : 0,
                    amountDue: typeof invoice.amount_due === 'number'
                        ? Number((invoice.amount_due / 100).toFixed(2))
                        : 0,
                    currency: (invoice.currency || '').toUpperCase(),
                    hostedInvoiceUrl: invoice.hosted_invoice_url,
                    invoicePdfUrl: invoice.invoice_pdf,
                }));
            }
            catch (error) {
                if (this.isStripeAuthenticationError(error)) {
                    this.handleStripeError(error);
                }
                return [];
            }
        }));
        const payments = grouped.flat().sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return {
            total: payments.length,
            subscriptionsScanned: paidSubscriptions.length,
            payments,
        };
    }
    async getMySubscription(userId) {
        return this.subscriptionService.getCurrentPlanDetails(userId);
    }
    async getMyUsage(userId) {
        return this.subscriptionService.getUsageSummary(userId);
    }
    async checkPremium(userId) {
        const isPremium = await this.subscriptionService.isPremium(userId);
        return { isPremium };
    }
    async getPlans() {
        return this.subscriptionService.getAvailablePlans();
    }
    async createStripeCheckout(userId, dto) {
        return this.createCheckoutSessionForPlan(userId, dto);
    }
    async upgrade(userId, upgradeDto) {
        return this.subscriptionService.upgrade(userId, upgradeDto);
    }
    async renew(userId, dto) {
        return this.createCheckoutSessionForPlan(userId, dto);
    }
    async updateMySubscription(userId, updateDto) {
        return this.subscriptionService.update(userId, updateDto);
    }
    async getStatistics() {
        return this.subscriptionService.getStatistics();
    }
    async getAllSubscriptions(plan, status, limit, offset) {
        return this.subscriptionService.findAll({
            plan,
            status,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async adminListPlans() {
        return this.subscriptionService.adminListPlans();
    }
    async adminCreatePlan(dto) {
        return this.subscriptionService.adminCreatePlan(dto);
    }
    async adminUpdatePlan(id, dto) {
        return this.subscriptionService.adminUpdatePlan(id, dto);
    }
    async adminDeletePlan(id) {
        return this.subscriptionService.adminDeletePlan(id);
    }
    async checkExpired() {
        const count = await this.subscriptionService.checkAndExpireSubscriptions();
        return { expiredCount: count };
    }
    async createForUser(userId, createDto) {
        return this.subscriptionService.create(userId, createDto);
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('payments/history'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getMyPaymentHistory", null);
__decorate([
    (0, common_1.Get)('payments/:invoiceId/invoice'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getMyInvoice", null);
__decorate([
    (0, common_1.Get)('admin/payments/history'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('subscriptionsLimit')),
    __param(1, (0, common_1.Query)('invoicesPerSubscription')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getAdminPaymentsHistory", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mon abonnement',
        description: "Récupère les détails de l'abonnement actuel",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Détails de l'abonnement" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Aucun abonnement trouvé' }),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Get)('me/usage'),
    (0, swagger_1.ApiOperation)({
        summary: "Usage de l'abonnement",
        description: "Récupère le résumé des quotas et de l'utilisation de l'abonnement",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Résumé de l'utilisation retourné" }),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getMyUsage", null);
__decorate([
    (0, common_1.Get)('me/premium'),
    (0, swagger_1.ApiOperation)({
        summary: 'Vérifier premium',
        description: "Vérifie si l'utilisateur a un abonnement premium actif",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut premium retourné' }),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkPremium", null);
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Post)('stripe/checkout'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateStripeCheckoutDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createStripeCheckout", null);
__decorate([
    (0, common_1.Post)('upgrade'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpgradeSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "upgrade", null);
__decorate([
    (0, common_1.Post)('renew'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateStripeCheckoutDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "renew", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "updateMySubscription", null);
__decorate([
    (0, common_1.Get)('admin/statistics'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('plan')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getAllSubscriptions", null);
__decorate([
    (0, common_1.Get)('admin/plans'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminListPlans", null);
__decorate([
    (0, common_1.Post)('admin/plans'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreatePlanDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminCreatePlan", null);
__decorate([
    (0, common_1.Patch)('admin/plans/:id'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdatePlanDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminUpdatePlan", null);
__decorate([
    (0, common_1.Delete)('admin/plans/:id'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "adminDeletePlan", null);
__decorate([
    (0, common_1.Post)('admin/check-expired'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkExpired", null);
__decorate([
    (0, common_1.Post)('admin/create/:userId'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createForUser", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, swagger_1.ApiTags)('Subscriptions'),
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        coupons_service_1.CouponsService])
], SubscriptionController);
//# sourceMappingURL=subscription.controller.js.map