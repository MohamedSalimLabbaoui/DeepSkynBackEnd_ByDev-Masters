export declare class CreateCouponDto {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    currency?: string;
    isActive?: boolean;
    startsAt?: string;
    expiresAt?: string;
    maxRedemptions?: number;
    maxPerUser?: number;
    allowedPlans?: string[];
    stripePromotionCodeId?: string;
}
