import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreatePlanDto, CreateSubscriptionDto, UpdatePlanDto, UpdateSubscriptionDto, UpgradeSubscriptionDto, SubscriptionStatus } from './dto';
import { Subscription } from '@prisma/client';
export interface PlanDetails {
    name: string;
    price: number;
    currency: string;
    duration: number;
    features: string[];
}
export declare class SubscriptionService {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private static readonly FREE_PLAN_CODE;
    private static readonly PREMIUM_MONTHLY_PLAN_CODE;
    private static readonly PREMIUM_YEARLY_PLAN_CODE;
    private readonly freeMonthlyAnalysisLimit;
    private readonly freeMonthlyAiRoutineLimit;
    private readonly freeDailyChatMessageLimit;
    private readonly planDetailsFallback;
    private normalizePlanCode;
    private startOfDay;
    private daysInMonth;
    private buildMonthlyResetDate;
    private computeMonthlyWindow;
    getFreeMonthlyQuotaWindow(userId: string): Promise<{
        periodStart: Date;
        resetsAt: Date;
    }>;
    private planRowToDetails;
    private getPlanFromDb;
    private getPlanDetails;
    constructor(prisma: PrismaService, notificationService: NotificationService);
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
    getUsageSummary(userId: string): Promise<{
        isPremium: boolean;
        subscription: Subscription;
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
    create(userId: string, createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription>;
    findByUserId(userId: string): Promise<Subscription>;
    findOrCreateByUserId(userId: string): Promise<Subscription>;
    update(userId: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<Subscription>;
    upgrade(userId: string, upgradeDto: UpgradeSubscriptionDto): Promise<Subscription>;
    cancel(userId: string): Promise<Subscription>;
    reactivate(userId: string): Promise<Subscription>;
    isPremium(userId: string): Promise<boolean>;
    getCurrentPlanDetails(userId: string): Promise<{
        subscription: Subscription;
        planDetails: PlanDetails;
        isPremium: boolean;
        daysRemaining: number | null;
    }>;
    getStripePriceIdForPlan(planCodeInput: string): Promise<string>;
    getAvailablePlans(): Promise<Record<string, PlanDetails>>;
    renew(userId: string): Promise<Subscription>;
    getStatistics(): Promise<{
        total: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        revenue: {
            total: number;
            currency: string;
        };
    }>;
    findAll(options?: {
        plan?: string;
        status?: SubscriptionStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        subscriptions: Subscription[];
        total: number;
    }>;
    checkAndExpireSubscriptions(): Promise<number>;
}
