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
var SubscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const dto_1 = require("./dto");
let SubscriptionService = SubscriptionService_1 = class SubscriptionService {
    normalizePlanCode(planCode) {
        const normalized = String(planCode || '')
            .trim()
            .toLowerCase();
        return normalized || SubscriptionService_1.FREE_PLAN_CODE;
    }
    startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    daysInMonth(year, monthIndex0) {
        return new Date(year, monthIndex0 + 1, 0).getDate();
    }
    buildMonthlyResetDate(year, monthIndex0, anchorDay) {
        const day = Math.min(anchorDay, this.daysInMonth(year, monthIndex0));
        const d = new Date(year, monthIndex0, day);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    computeMonthlyWindow(anchorDate, now) {
        const anchorDay = this.startOfDay(anchorDate).getDate();
        const today = this.startOfDay(now);
        const thisMonthReset = this.buildMonthlyResetDate(today.getFullYear(), today.getMonth(), anchorDay);
        if (today >= thisMonthReset) {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            return {
                periodStart: thisMonthReset,
                nextReset: this.buildMonthlyResetDate(nextMonth.getFullYear(), nextMonth.getMonth(), anchorDay),
            };
        }
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return {
            periodStart: this.buildMonthlyResetDate(prevMonth.getFullYear(), prevMonth.getMonth(), anchorDay),
            nextReset: thisMonthReset,
        };
    }
    async getFreeMonthlyQuotaWindow(userId) {
        const subscription = await this.findOrCreateByUserId(userId);
        const anchor = subscription.startDate || subscription.createdAt;
        const { periodStart, nextReset } = this.computeMonthlyWindow(anchor, new Date());
        return { periodStart, resetsAt: nextReset };
    }
    planRowToDetails(row) {
        const features = Array.isArray(row.features)
            ? row.features
            : [];
        return {
            name: row.name,
            price: row.price,
            currency: row.currency,
            duration: row.durationDays,
            features,
        };
    }
    async getPlanFromDb(planCode) {
        return this.prisma.subscriptionPlan.findUnique({
            where: { code: planCode },
        });
    }
    async getPlanDetails(planCodeInput) {
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
        const fallback = this.planDetailsFallback[planCode] ||
            this.planDetailsFallback[SubscriptionService_1.FREE_PLAN_CODE];
        return { planCode, details: fallback };
    }
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(SubscriptionService_1.name);
        this.freeMonthlyAnalysisLimit = 3;
        this.freeMonthlyAiRoutineLimit = 3;
        this.freeDailyChatMessageLimit = 10;
        this.planDetailsFallback = {
            [SubscriptionService_1.FREE_PLAN_CODE]: {
                name: 'Free',
                price: 0,
                currency: 'TND',
                duration: -1,
                features: [
                    '3 analyses per month',
                    '3 AI routines per month',
                    'Unlimited manual routines',
                    'AI chat limited to 10 messages/day',
                    'General guidance',
                ],
            },
            [SubscriptionService_1.PREMIUM_MONTHLY_PLAN_CODE]: {
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
            [SubscriptionService_1.PREMIUM_YEARLY_PLAN_CODE]: {
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
    }
    async adminListPlans() {
        return this.prisma.subscriptionPlan.findMany({
            orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
        });
    }
    async adminCreatePlan(dto) {
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
    async adminUpdatePlan(id, dto) {
        const data = {};
        if (dto.code !== undefined)
            data.code = this.normalizePlanCode(dto.code);
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.price !== undefined)
            data.price = dto.price;
        if (dto.currency !== undefined)
            data.currency = dto.currency;
        if (dto.durationDays !== undefined)
            data.durationDays = dto.durationDays;
        if (dto.features !== undefined)
            data.features = dto.features;
        if (dto.stripePriceId !== undefined)
            data.stripePriceId = dto.stripePriceId;
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        return this.prisma.subscriptionPlan.update({
            where: { id },
            data,
        });
    }
    async adminDeletePlan(id) {
        return this.prisma.subscriptionPlan.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getUsageSummary(userId) {
        const subscription = await this.findOrCreateByUserId(userId);
        const isPremium = await this.isPremium(userId);
        if (isPremium) {
            return {
                isPremium,
                subscription,
                quotas: {
                    analyses: { used: 0, limit: null, remaining: null, resetsAt: null },
                    aiRoutines: { used: 0, limit: null, remaining: null, resetsAt: null },
                    chatMessages: {
                        used: 0,
                        limit: null,
                        remaining: null,
                        resetsAt: null,
                    },
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
            const messages = chat.messages;
            if (!Array.isArray(messages))
                continue;
            chatMessagesUsed += messages.filter((m) => {
                const role = (m.role || '').toLowerCase();
                const ts = m.timestamp ? new Date(m.timestamp) : null;
                return role === 'user' && !!ts && ts >= startOfToday;
            }).length;
        }
        const analysisRemaining = Math.max(0, this.freeMonthlyAnalysisLimit - analysesUsed);
        const aiRoutineRemaining = Math.max(0, this.freeMonthlyAiRoutineLimit - aiRoutinesUsed);
        const chatRemaining = Math.max(0, this.freeDailyChatMessageLimit - chatMessagesUsed);
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
    async create(userId, createSubscriptionDto) {
        const existing = await this.prisma.subscription.findUnique({
            where: { userId },
        });
        if (existing) {
            throw new common_1.ConflictException('User already has a subscription');
        }
        const planCode = this.normalizePlanCode(createSubscriptionDto.plan || createSubscriptionDto.planCode);
        const { details: planInfo, subscriptionPlanId } = await this.getPlanDetails(planCode);
        const startDate = createSubscriptionDto.startDate
            ? new Date(createSubscriptionDto.startDate)
            : new Date();
        let endDate = null;
        if (planInfo.duration > 0) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + planInfo.duration);
        }
        const subscription = await this.prisma.subscription.create({
            data: {
                userId,
                plan: planCode,
                lastPaidPlan: planCode !== SubscriptionService_1.FREE_PLAN_CODE ? planCode : null,
                subscriptionPlanId,
                status: createSubscriptionDto.status || dto_1.SubscriptionStatus.ACTIVE,
                amount: createSubscriptionDto.amount ?? planInfo.price,
                currency: createSubscriptionDto.currency || planInfo.currency,
                startDate,
                endDate,
            },
        });
        this.logger.log(`Subscription created for user ${userId}: ${planCode}`);
        return subscription;
    }
    async findByUserId(userId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        return subscription;
    }
    async findOrCreateByUserId(userId) {
        let subscription = await this.prisma.subscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            subscription = await this.create(userId, {
                planCode: SubscriptionService_1.FREE_PLAN_CODE,
                status: dto_1.SubscriptionStatus.ACTIVE,
            });
        }
        return subscription;
    }
    async update(userId, updateSubscriptionDto) {
        const subscription = await this.findByUserId(userId);
        const updateData = {};
        const incomingPlan = updateSubscriptionDto.plan || updateSubscriptionDto.planCode;
        if (incomingPlan) {
            const planCode = this.normalizePlanCode(incomingPlan);
            const { subscriptionPlanId } = await this.getPlanDetails(planCode);
            updateData.plan = planCode;
            if (planCode !== SubscriptionService_1.FREE_PLAN_CODE) {
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
    async upgrade(userId, upgradeDto) {
        const currentSub = await this.findOrCreateByUserId(userId);
        const newPlanCode = this.normalizePlanCode(upgradeDto.plan || upgradeDto.planCode);
        if (currentSub.plan !== SubscriptionService_1.FREE_PLAN_CODE &&
            currentSub.status === dto_1.SubscriptionStatus.ACTIVE &&
            (!currentSub.endDate || new Date() <= new Date(currentSub.endDate))) {
            throw new common_1.BadRequestException('Subscription is still active. You cannot change plan until it expires or is cancelled.');
        }
        if (currentSub.plan === newPlanCode) {
            throw new common_1.BadRequestException('Already on this plan');
        }
        if (currentSub.plan === SubscriptionService_1.PREMIUM_YEARLY_PLAN_CODE &&
            newPlanCode === SubscriptionService_1.PREMIUM_MONTHLY_PLAN_CODE) {
            throw new common_1.BadRequestException('Cannot downgrade from yearly to monthly');
        }
        const { details: planInfo, subscriptionPlanId } = await this.getPlanDetails(newPlanCode);
        const startDate = new Date();
        let endDate = null;
        if (planInfo.duration > 0) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + planInfo.duration);
        }
        const subscription = await this.prisma.subscription.update({
            where: { id: currentSub.id },
            data: {
                plan: newPlanCode,
                lastPaidPlan: newPlanCode,
                subscriptionPlanId: subscriptionPlanId ?? null,
                status: dto_1.SubscriptionStatus.ACTIVE,
                amount: planInfo.price,
                currency: planInfo.currency,
                startDate,
                endDate,
                cancelledAt: null,
            },
        });
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
    async cancel(userId) {
        const subscription = await this.findByUserId(userId);
        if (subscription.plan === SubscriptionService_1.FREE_PLAN_CODE) {
            throw new common_1.BadRequestException('Cannot cancel free plan');
        }
        if (subscription.status === dto_1.SubscriptionStatus.CANCELLED) {
            throw new common_1.BadRequestException('Subscription already cancelled');
        }
        const updated = await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: dto_1.SubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
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
    async reactivate(userId) {
        const subscription = await this.findByUserId(userId);
        if (subscription.status !== dto_1.SubscriptionStatus.CANCELLED) {
            throw new common_1.BadRequestException('Subscription is not cancelled');
        }
        if (subscription.endDate && new Date() > subscription.endDate) {
            throw new common_1.BadRequestException('Subscription has expired. Please upgrade to a new plan.');
        }
        const updated = await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: dto_1.SubscriptionStatus.ACTIVE,
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
    async isPremium(userId) {
        try {
            const subscription = await this.findByUserId(userId);
            if (subscription.status !== dto_1.SubscriptionStatus.ACTIVE) {
                return false;
            }
            if (subscription.plan === SubscriptionService_1.FREE_PLAN_CODE) {
                return false;
            }
            if (subscription.endDate && new Date() > subscription.endDate) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        status: dto_1.SubscriptionStatus.EXPIRED,
                        plan: SubscriptionService_1.FREE_PLAN_CODE,
                        subscriptionPlanId: null,
                        autoRenew: false,
                    },
                });
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async getCurrentPlanDetails(userId) {
        const subscription = await this.findOrCreateByUserId(userId);
        const { details: planDetails } = await this.getPlanDetails(subscription.plan);
        const isPremium = await this.isPremium(userId);
        let daysRemaining = null;
        if (subscription.endDate) {
            const now = new Date();
            const end = new Date(subscription.endDate);
            daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        return {
            subscription,
            planDetails,
            isPremium,
            daysRemaining,
        };
    }
    async getStripePriceIdForPlan(planCodeInput) {
        const planCode = this.normalizePlanCode(planCodeInput);
        if (planCode === SubscriptionService_1.FREE_PLAN_CODE) {
            throw new common_1.BadRequestException('Stripe Checkout is only supported for paid plans');
        }
        const { stripePriceId } = await this.getPlanDetails(planCode);
        if (stripePriceId)
            return stripePriceId;
        const envPriceId = planCode === SubscriptionService_1.PREMIUM_MONTHLY_PLAN_CODE
            ? process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY
            : planCode === SubscriptionService_1.PREMIUM_YEARLY_PLAN_CODE
                ? process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY
                : undefined;
        if (envPriceId)
            return envPriceId;
        throw new common_1.BadRequestException(`Missing stripePriceId for planCode=${planCode}. Set it in subscription_plans table or in env vars (STRIPE_PRICE_ID_PREMIUM_MONTHLY / STRIPE_PRICE_ID_PREMIUM_YEARLY).`);
    }
    async getAvailablePlans() {
        const plans = await this.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });
        if (plans.length === 0) {
            return this.planDetailsFallback;
        }
        const result = {};
        for (const plan of plans) {
            result[plan.code] = this.planRowToDetails(plan);
        }
        return result;
    }
    async renew(userId) {
        const subscription = await this.findByUserId(userId);
        if (subscription.plan === SubscriptionService_1.FREE_PLAN_CODE) {
            throw new common_1.BadRequestException('Cannot renew free plan');
        }
        const { details: planInfo } = await this.getPlanDetails(subscription.plan);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + planInfo.duration);
        const updated = await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: dto_1.SubscriptionStatus.ACTIVE,
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
    async getStatistics() {
        const subscriptions = await this.prisma.subscription.findMany();
        const byPlan = {};
        const byStatus = {
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
    async findAll(options) {
        const where = {};
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
    async checkAndExpireSubscriptions() {
        const now = new Date();
        const expired = await this.prisma.subscription.updateMany({
            where: {
                status: dto_1.SubscriptionStatus.ACTIVE,
                endDate: { lt: now },
                plan: { not: SubscriptionService_1.FREE_PLAN_CODE },
            },
            data: {
                status: dto_1.SubscriptionStatus.EXPIRED,
                plan: SubscriptionService_1.FREE_PLAN_CODE,
                subscriptionPlanId: null,
                autoRenew: false,
            },
        });
        if (expired.count > 0) {
            this.logger.log(`Expired ${expired.count} subscriptions`);
        }
        return expired.count;
    }
};
exports.SubscriptionService = SubscriptionService;
SubscriptionService.FREE_PLAN_CODE = 'free';
SubscriptionService.PREMIUM_MONTHLY_PLAN_CODE = 'premium';
SubscriptionService.PREMIUM_YEARLY_PLAN_CODE = 'premium_yearly';
exports.SubscriptionService = SubscriptionService = SubscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map