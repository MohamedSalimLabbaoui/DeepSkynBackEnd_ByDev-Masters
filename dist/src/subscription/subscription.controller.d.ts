import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto, CreateStripeCheckoutDto, CreatePlanDto, UpdateSubscriptionDto, UpdatePlanDto, UpgradeSubscriptionDto, SubscriptionStatus } from './dto';
import Stripe from 'stripe';
import { CouponsService } from '../coupons/coupons.service';
export declare class SubscriptionController {
    private readonly subscriptionService;
    private readonly couponsService;
    constructor(subscriptionService: SubscriptionService, couponsService: CouponsService);
    private isStripeAuthenticationError;
    private handleStripeError;
    private stripeClient;
    private getStripePriceId;
    private createCheckoutSessionForPlan;
    getMyPaymentHistory(userId: string): Promise<{
        payments: {
            invoiceId: string;
            invoiceNumber: string;
            createdAt: Date;
            status: Stripe.Invoice.Status;
            amountPaid: number;
            amountDue: number;
            currency: string;
            hostedInvoiceUrl: string;
            invoicePdfUrl: string;
        }[];
    }>;
    getMyInvoice(userId: string, invoiceId: string): Promise<{
        invoiceId: string;
        invoiceNumber: string;
        status: Stripe.Invoice.Status;
        amountPaid: number;
        currency: string;
        hostedInvoiceUrl: string;
        invoicePdfUrl: string;
    }>;
    getAdminPaymentsHistory(subscriptionsLimit?: string, invoicesPerSubscription?: string): Promise<{
        total: number;
        subscriptionsScanned: number;
        payments: {
            userId: any;
            userEmail: any;
            userName: any;
            subscriptionId: any;
            planCode: any;
            stripeSubscriptionId: any;
            invoiceId: string;
            invoiceNumber: string;
            createdAt: Date;
            status: Stripe.Invoice.Status;
            amountPaid: number;
            amountDue: number;
            currency: string;
            hostedInvoiceUrl: string;
            invoicePdfUrl: string;
        }[];
    }>;
    getMySubscription(userId: string): Promise<{
        subscription: import(".prisma/client").Subscription;
        planDetails: import("./subscription.service").PlanDetails;
        isPremium: boolean;
        daysRemaining: number | null;
    }>;
    getMyUsage(userId: string): Promise<{
        isPremium: boolean;
        subscription: import(".prisma/client").Subscription;
        quotas: {
            analyses: {
                used: number;
                limit: number | null;
                remaining: number | null;
                resetsAt: Date | null;
            };
            aiRoutines: {
                used: number;
                limit: number | null;
                remaining: number | null;
                resetsAt: Date | null;
            };
            chatMessages: {
                used: number;
                limit: number | null;
                remaining: number | null;
                resetsAt: Date | null;
            };
        };
    }>;
    checkPremium(userId: string): Promise<{
        isPremium: boolean;
    }>;
    getPlans(): Promise<Record<string, import("./subscription.service").PlanDetails>>;
    createStripeCheckout(userId: string, dto: CreateStripeCheckoutDto): Promise<{
        url: string;
        id: string;
    }>;
    upgrade(userId: string, upgradeDto: UpgradeSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        planId: string | null;
        plan: string;
        lastPaidPlan: string | null;
        amount: number | null;
        currency: string | null;
        paymentMethod: string | null;
        autoRenew: boolean;
        startDate: Date;
        endDate: Date | null;
        cancelledAt: Date | null;
        subscriptionPlanId: string | null;
    }>;
    renew(userId: string, dto: CreateStripeCheckoutDto): Promise<{
        url: string;
        id: string;
    }>;
    updateMySubscription(userId: string, updateDto: UpdateSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        planId: string | null;
        plan: string;
        lastPaidPlan: string | null;
        amount: number | null;
        currency: string | null;
        paymentMethod: string | null;
        autoRenew: boolean;
        startDate: Date;
        endDate: Date | null;
        cancelledAt: Date | null;
        subscriptionPlanId: string | null;
    }>;
    getStatistics(): Promise<{
        total: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        revenue: {
            total: number;
            currency: string;
        };
    }>;
    getAllSubscriptions(plan?: string, status?: SubscriptionStatus, limit?: string, offset?: string): Promise<{
        subscriptions: import(".prisma/client").Subscription[];
        total: number;
    }>;
    adminListPlans(): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        code: string;
        price: number;
        durationDays: number;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        stripePriceId: string | null;
    }[]>;
    adminCreatePlan(dto: CreatePlanDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        code: string;
        price: number;
        durationDays: number;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        stripePriceId: string | null;
    }>;
    adminUpdatePlan(id: string, dto: UpdatePlanDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        code: string;
        price: number;
        durationDays: number;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        stripePriceId: string | null;
    }>;
    adminDeletePlan(id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        code: string;
        price: number;
        durationDays: number;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        stripePriceId: string | null;
    }>;
    checkExpired(): Promise<{
        expiredCount: number;
    }>;
    createForUser(userId: string, createDto: CreateSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        planId: string | null;
        plan: string;
        lastPaidPlan: string | null;
        amount: number | null;
        currency: string | null;
        paymentMethod: string | null;
        autoRenew: boolean;
        startDate: Date;
        endDate: Date | null;
        cancelledAt: Date | null;
        subscriptionPlanId: string | null;
    }>;
}
