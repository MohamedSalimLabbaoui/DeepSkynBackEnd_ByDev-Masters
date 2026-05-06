import { SubscriptionStatus } from './create-subscription.dto';
export declare class UpdateSubscriptionDto {
    plan?: string;
    planCode?: string;
    status?: SubscriptionStatus;
    amount?: number;
    currency?: string;
    endDate?: string;
}
