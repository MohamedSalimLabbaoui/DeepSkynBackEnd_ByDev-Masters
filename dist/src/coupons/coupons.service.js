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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_1 = require("stripe");
let CouponsService = class CouponsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    throwStripeError(action, error) {
        if (error instanceof common_1.BadRequestException) {
            throw error;
        }
        if (error instanceof stripe_1.default.errors.StripeAuthenticationError) {
            throw new common_1.BadRequestException('Stripe API key is invalid or expired. Please update STRIPE_SECRET_KEY.');
        }
        const message = error instanceof Error ? error.message : 'unknown error';
        throw new common_1.BadRequestException(`${action}: ${message}`);
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
    normalizeCode(code) {
        return String(code || '')
            .trim()
            .toUpperCase();
    }
    normalizePlanCode(planCode) {
        return String(planCode || '')
            .trim()
            .toLowerCase();
    }
    async createStripePromotionCode(params) {
        const stripe = this.stripeClient();
        const stripeCoupon = params.discountType === 'percentage'
            ? await stripe.coupons.create({
                percent_off: params.discountValue,
                duration: 'once',
            })
            : await stripe.coupons.create({
                amount_off: Math.round(params.discountValue * 100),
                currency: String(params.currency || 'tnd').toLowerCase(),
                duration: 'once',
            });
        const promotionCode = await stripe.promotionCodes.create({
            promotion: {
                type: 'coupon',
                coupon: stripeCoupon.id,
            },
            code: params.code,
            max_redemptions: params.maxRedemptions || undefined,
            expires_at: params.expiresAt
                ? Math.floor(params.expiresAt.getTime() / 1000)
                : undefined,
            active: true,
        });
        return promotionCode.id;
    }
    assertCouponUsableWindow(coupon) {
        if (!coupon.isActive) {
            throw new common_1.BadRequestException('Coupon is inactive');
        }
        const now = new Date();
        if (coupon.startsAt && now < coupon.startsAt) {
            throw new common_1.BadRequestException('Coupon is not active yet');
        }
        if (coupon.expiresAt && now > coupon.expiresAt) {
            throw new common_1.BadRequestException('Coupon has expired');
        }
    }
    async adminListCoupons() {
        return this.prisma.coupon.findMany({
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async adminCreateCoupon(dto) {
        const normalizedCode = this.normalizeCode(dto.code);
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        const discountType = dto.discountType;
        const discountValue = dto.discountValue;
        const currency = dto.currency ?? null;
        const maxRedemptions = dto.maxRedemptions ?? null;
        let stripePromotionCodeId = dto.stripePromotionCodeId ?? null;
        if (!stripePromotionCodeId) {
            try {
                stripePromotionCodeId = await this.createStripePromotionCode({
                    code: normalizedCode,
                    discountType,
                    discountValue,
                    currency,
                    maxRedemptions,
                    expiresAt,
                });
            }
            catch (error) {
                this.throwStripeError('Failed to create Stripe promotion code', error);
            }
        }
        return this.prisma.coupon.create({
            data: {
                code: normalizedCode,
                discountType,
                discountValue,
                currency,
                isActive: dto.isActive ?? true,
                startsAt,
                expiresAt,
                maxRedemptions,
                maxPerUser: dto.maxPerUser ?? null,
                allowedPlans: (dto.allowedPlans || []).map((x) => this.normalizePlanCode(x)),
                stripePromotionCodeId,
            },
        });
    }
    async adminUpdateCoupon(id, dto) {
        const data = {};
        if (dto.code !== undefined)
            data.code = this.normalizeCode(dto.code);
        if (dto.discountType !== undefined)
            data.discountType = dto.discountType;
        if (dto.discountValue !== undefined)
            data.discountValue = dto.discountValue;
        if (dto.currency !== undefined)
            data.currency = dto.currency;
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        if (dto.startsAt !== undefined)
            data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        if (dto.expiresAt !== undefined)
            data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        if (dto.maxRedemptions !== undefined)
            data.maxRedemptions = dto.maxRedemptions;
        if (dto.maxPerUser !== undefined)
            data.maxPerUser = dto.maxPerUser;
        if (dto.allowedPlans !== undefined) {
            data.allowedPlans = dto.allowedPlans.map((x) => this.normalizePlanCode(x));
        }
        if (dto.stripePromotionCodeId !== undefined) {
            data.stripePromotionCodeId = dto.stripePromotionCodeId;
        }
        return this.prisma.coupon.update({
            where: { id },
            data,
        });
    }
    async adminDeleteCoupon(id) {
        return this.prisma.coupon.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async validateCouponForCheckout(userId, couponCode, planCodeInput) {
        const code = this.normalizeCode(couponCode);
        const planCode = this.normalizePlanCode(planCodeInput);
        const coupon = await this.prisma.coupon.findUnique({
            where: { code },
        });
        if (!coupon) {
            throw new common_1.NotFoundException('Coupon not found');
        }
        this.assertCouponUsableWindow(coupon);
        if (coupon.allowedPlans.length > 0 &&
            !coupon.allowedPlans.includes(planCode)) {
            throw new common_1.BadRequestException('Coupon is not valid for this plan');
        }
        const [totalUsed, usedByUser, plan] = await Promise.all([
            this.prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
            this.prisma.couponRedemption.count({
                where: { couponId: coupon.id, userId },
            }),
            this.prisma.subscriptionPlan.findUnique({
                where: { code: planCode },
                select: { price: true, currency: true },
            }),
        ]);
        if (coupon.maxRedemptions !== null && totalUsed >= coupon.maxRedemptions) {
            throw new common_1.BadRequestException('Coupon usage limit reached');
        }
        if (coupon.maxPerUser !== null && usedByUser >= coupon.maxPerUser) {
            throw new common_1.BadRequestException('You already used this coupon');
        }
        let estimated = null;
        if (plan && plan.price !== null) {
            const before = Number(plan.price);
            const discount = coupon.discountType === 'percentage'
                ? (before * coupon.discountValue) / 100
                : coupon.discountValue;
            const after = Math.max(0, before - discount);
            estimated = {
                before,
                discount: Number(discount.toFixed(2)),
                after: Number(after.toFixed(2)),
                currency: plan.currency || coupon.currency || 'TND',
            };
        }
        return {
            valid: true,
            couponId: coupon.id,
            couponCode: coupon.code,
            stripePromotionCodeId: coupon.stripePromotionCodeId,
            estimated,
        };
    }
    async markCouponRedeemed(params) {
        const code = this.normalizeCode(params.couponCode);
        const coupon = await this.prisma.coupon.findUnique({ where: { code } });
        if (!coupon)
            return;
        await this.prisma.couponRedemption.create({
            data: {
                couponId: coupon.id,
                userId: params.userId,
                subscriptionId: params.subscriptionId || null,
                stripeCheckoutSessionId: params.stripeCheckoutSessionId || null,
                discountAmount: coupon.discountValue,
            },
        });
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
//# sourceMappingURL=coupons.service.js.map