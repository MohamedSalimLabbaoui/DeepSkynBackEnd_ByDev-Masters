import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import Stripe from 'stripe';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private stripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('Missing STRIPE_SECRET_KEY in environment');
    }
    return new Stripe(secretKey, {
      apiVersion: (process.env.STRIPE_API_VERSION as any) || undefined,
    });
  }

  private normalizeCode(code: string): string {
    return String(code || '').trim().toUpperCase();
  }

  private normalizePlanCode(planCode: string): string {
    return String(planCode || '').trim().toLowerCase();
  }

  private async createStripePromotionCode(params: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    currency?: string | null;
    maxRedemptions?: number | null;
    expiresAt?: Date | null;
  }): Promise<string> {
    const stripe = this.stripeClient();

    const stripeCoupon =
      params.discountType === 'percentage'
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

  private assertCouponUsableWindow(coupon: {
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
  }) {
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon is not active yet');
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }
  }

  async adminListCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async adminCreateCoupon(dto: CreateCouponDto) {
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
      } catch (error: any) {
        throw new BadRequestException(
          `Failed to create Stripe promotion code: ${error?.message || 'unknown error'}`,
        );
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

  async adminUpdateCoupon(id: string, dto: UpdateCouponDto) {
    const data: any = {};

    if (dto.code !== undefined) data.code = this.normalizeCode(dto.code);
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.maxRedemptions !== undefined) data.maxRedemptions = dto.maxRedemptions;
    if (dto.maxPerUser !== undefined) data.maxPerUser = dto.maxPerUser;
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

  async adminDeleteCoupon(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validateCouponForCheckout(userId: string, couponCode: string, planCodeInput: string) {
    const code = this.normalizeCode(couponCode);
    const planCode = this.normalizePlanCode(planCodeInput);

    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    this.assertCouponUsableWindow(coupon);

    if (coupon.allowedPlans.length > 0 && !coupon.allowedPlans.includes(planCode)) {
      throw new BadRequestException('Coupon is not valid for this plan');
    }

    const [totalUsed, usedByUser, plan] = await Promise.all([
      this.prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
      this.prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } }),
      this.prisma.subscriptionPlan.findUnique({
        where: { code: planCode },
        select: { price: true, currency: true },
      }),
    ]);

    if (coupon.maxRedemptions !== null && totalUsed >= coupon.maxRedemptions) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.maxPerUser !== null && usedByUser >= coupon.maxPerUser) {
      throw new BadRequestException('You already used this coupon');
    }

    let estimated = null as null | {
      before: number;
      discount: number;
      after: number;
      currency: string;
    };

    if (plan && plan.price !== null) {
      const before = Number(plan.price);
      const discount =
        coupon.discountType === 'percentage'
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

  async markCouponRedeemed(params: {
    userId: string;
    couponCode: string;
    subscriptionId?: string | null;
    stripeCheckoutSessionId?: string | null;
  }) {
    const code = this.normalizeCode(params.couponCode);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon) return;

    await this.prisma.couponRedemption.create({
      data: {
        couponId: coupon.id,
        userId: params.userId,
        subscriptionId: params.subscriptionId || null,
        stripeCheckoutSessionId: params.stripeCheckoutSessionId || null,
      },
    });
  }
}
