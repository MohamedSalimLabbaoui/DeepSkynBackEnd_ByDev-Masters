import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CouponsService } from '../coupons/coupons.service';
export declare class StripeWebhookController {
    private readonly subscriptionService;
    private readonly prisma;
    private readonly notificationService;
    private readonly couponsService;
    private readonly logger;
    constructor(subscriptionService: SubscriptionService, prisma: PrismaService, notificationService: NotificationService, couponsService: CouponsService);
    private stripeClient;
    handleStripeWebhook(req: any, signature?: string): Promise<{
        received: boolean;
    }>;
}
