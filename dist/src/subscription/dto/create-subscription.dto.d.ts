export declare enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    PENDING = "pending"
}
export declare class CreateSubscriptionDto {
    plan?: string;
    planCode?: string;
    status?: SubscriptionStatus;
    amount?: number;
    currency?: string;
    startDate?: string;
    endDate?: string;
}
