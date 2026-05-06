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
exports.AdminBiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminBiService = class AdminBiService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardData() {
        const now = new Date();
        const days30Ago = this.subDays(now, 30);
        const days60Ago = this.subDays(now, 60);
        const days14Ago = this.subDays(now, 13);
        const days90Ago = this.subDays(now, 90);
        const [totalUsers, usersLast30, usersPrev30, onboardedUsers, usersWithActivity, usersWithAnalyses, activePaidSubs, subscriptionsAll, subscriptionsLast60, analysesLast14, chatsLast14, postsLast14, usersLast14, churnRiskUsers, analysesConditions, analysisPerf, skinAlertsLast30, unreadAlerts,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { createdAt: { gte: days30Ago } } }),
            this.prisma.user.count({
                where: { createdAt: { gte: days60Ago, lt: days30Ago } },
            }),
            this.prisma.user.count({ where: { onboardingComplete: true } }),
            this.prisma.user.count({
                where: {
                    isActive: true,
                    OR: [
                        { lastActivity: { gte: days30Ago } },
                        { analyses: { some: { createdAt: { gte: days30Ago } } } },
                        { chatHistories: { some: { createdAt: { gte: days30Ago } } } },
                        { posts: { some: { createdAt: { gte: days30Ago } } } },
                    ],
                },
            }),
            this.prisma.analysis.groupBy({ by: ['userId'] }),
            this.prisma.subscription.findMany({
                where: {
                    plan: { not: 'free' },
                    status: 'active',
                },
                select: {
                    userId: true,
                    amount: true,
                    plan: true,
                    createdAt: true,
                },
            }),
            this.prisma.subscription.findMany({
                select: {
                    amount: true,
                    status: true,
                    plan: true,
                    createdAt: true,
                    userId: true,
                },
            }),
            this.prisma.subscription.findMany({
                where: {
                    createdAt: { gte: days60Ago },
                    plan: { not: 'free' },
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
            }),
            this.prisma.analysis.findMany({
                where: { createdAt: { gte: days14Ago } },
                select: { createdAt: true },
            }),
            this.prisma.chatHistory.findMany({
                where: { createdAt: { gte: days14Ago } },
                select: { createdAt: true },
            }),
            this.prisma.post.findMany({
                where: { createdAt: { gte: days14Ago } },
                select: { createdAt: true },
            }),
            this.prisma.user.findMany({
                where: { createdAt: { gte: days14Ago } },
                select: { createdAt: true },
            }),
            this.prisma.user.findMany({
                where: { churnRiskLevel: { not: null } },
                select: { churnRiskLevel: true, churnRiskScore: true },
            }),
            this.prisma.analysis.findMany({
                where: { createdAt: { gte: days90Ago } },
                select: { conditions: true, results: true },
            }),
            this.prisma.analysis.aggregate({
                where: { createdAt: { gte: days30Ago } },
                _avg: { processingTime: true },
                _count: { _all: true },
            }),
            this.prisma.skinAlert.count({ where: { createdAt: { gte: days30Ago } } }),
            this.prisma.skinAlert.count({ where: { isRead: false } }),
        ]);
        let activityWindowStart = days14Ago;
        let activityWindowEnd = now;
        let analysesPoints = analysesLast14.map((x) => x.createdAt);
        let chatsPoints = chatsLast14.map((x) => x.createdAt);
        let postsPoints = postsLast14.map((x) => x.createdAt);
        let signupsPoints = usersLast14.map((x) => x.createdAt);
        const hasRecentActivity = analysesPoints.length > 0 ||
            chatsPoints.length > 0 ||
            postsPoints.length > 0 ||
            signupsPoints.length > 0;
        if (!hasRecentActivity) {
            const [lastAnalysis, lastChat, lastPost, lastSignup] = await Promise.all([
                this.prisma.analysis.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                }),
                this.prisma.chatHistory.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                }),
                this.prisma.post.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                }),
                this.prisma.user.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                }),
            ]);
            const latestCandidates = [
                lastAnalysis?.createdAt,
                lastChat?.createdAt,
                lastPost?.createdAt,
                lastSignup?.createdAt,
            ].filter((value) => value instanceof Date);
            if (latestCandidates.length > 0) {
                const latestTimestamp = Math.max(...latestCandidates.map((value) => value.getTime()));
                activityWindowEnd = new Date(latestTimestamp);
                activityWindowStart = this.subDays(activityWindowEnd, 13);
                const [fallbackAnalyses, fallbackChats, fallbackPosts, fallbackSignups,] = await Promise.all([
                    this.prisma.analysis.findMany({
                        where: {
                            createdAt: {
                                gte: activityWindowStart,
                                lte: activityWindowEnd,
                            },
                        },
                        select: { createdAt: true },
                    }),
                    this.prisma.chatHistory.findMany({
                        where: {
                            createdAt: {
                                gte: activityWindowStart,
                                lte: activityWindowEnd,
                            },
                        },
                        select: { createdAt: true },
                    }),
                    this.prisma.post.findMany({
                        where: {
                            createdAt: {
                                gte: activityWindowStart,
                                lte: activityWindowEnd,
                            },
                        },
                        select: { createdAt: true },
                    }),
                    this.prisma.user.findMany({
                        where: {
                            createdAt: {
                                gte: activityWindowStart,
                                lte: activityWindowEnd,
                            },
                        },
                        select: { createdAt: true },
                    }),
                ]);
                analysesPoints = fallbackAnalyses.map((x) => x.createdAt);
                chatsPoints = fallbackChats.map((x) => x.createdAt);
                postsPoints = fallbackPosts.map((x) => x.createdAt);
                signupsPoints = fallbackSignups.map((x) => x.createdAt);
            }
        }
        const paidUsersCount = new Set(activePaidSubs.map((s) => s.userId)).size;
        const mrr = activePaidSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
        const totalRevenueAllTime = subscriptionsAll.reduce((sum, s) => {
            if (s.plan === 'free')
                return sum;
            return sum + (s.amount || 0);
        }, 0);
        const revenue30 = subscriptionsLast60
            .filter((s) => s.createdAt >= days30Ago)
            .reduce((sum, s) => sum + (s.amount || 0), 0);
        const revenuePrev30 = subscriptionsLast60
            .filter((s) => s.createdAt < days30Ago)
            .reduce((sum, s) => sum + (s.amount || 0), 0);
        const userGrowthRate = this.safeRate(usersLast30 - usersPrev30, usersPrev30 || 1);
        const revenueGrowthRate = this.safeRate(revenue30 - revenuePrev30, revenuePrev30 || 1);
        const conversionRate = this.safeRate(paidUsersCount, totalUsers || 1);
        const arpu = totalUsers > 0 ? mrr / totalUsers : 0;
        const activitySeries = this.buildDailySeries(activityWindowStart, activityWindowEnd, {
            analyses: analysesPoints,
            chats: chatsPoints,
            posts: postsPoints,
            signups: signupsPoints,
        });
        const riskDistribution = this.getRiskDistribution(churnRiskUsers);
        let topConcerns = this.getTopConcerns(analysesConditions, 6);
        if (topConcerns.length === 0) {
            const fallbackAnalyses = await this.prisma.analysis.findMany({
                where: {
                    createdAt: { gte: this.subDays(now, 365) },
                },
                orderBy: { createdAt: 'desc' },
                take: 2000,
                select: { conditions: true, results: true },
            });
            topConcerns = this.getTopConcerns(fallbackAnalyses, 6);
        }
        const avgRiskScore = this.getAvgRiskScore(churnRiskUsers);
        return {
            generatedAt: now.toISOString(),
            kpis: {
                totalUsers,
                newUsersLast30: usersLast30,
                userGrowthRate,
                activeUsersLast30: usersWithActivity,
                payingUsers: paidUsersCount,
                conversionRate,
                mrr,
                arpu,
                totalRevenueAllTime,
                revenue30,
                revenueGrowthRate,
            },
            funnel: {
                registered: totalUsers,
                onboarded: onboardedUsers,
                analyzed: usersWithAnalyses.length,
                subscribed: paidUsersCount,
                retained30d: usersWithActivity,
            },
            engagement: {
                activitySeries,
                avgAnalysisProcessingTimeMs: Math.round(analysisPerf._avg.processingTime || 0),
                analysesLast30: analysisPerf._count._all || 0,
            },
            churn: {
                avgRiskScore,
                riskDistribution,
            },
            support: {
                skinAlertsLast30,
                unreadAlerts,
            },
            insights: {
                topConcerns,
            },
        };
    }
    getAvgRiskScore(users) {
        const valid = users
            .map((u) => u.churnRiskScore)
            .filter((score) => typeof score === 'number');
        if (valid.length === 0) {
            return 0;
        }
        const avg = valid.reduce((sum, score) => sum + score, 0) / valid.length;
        return Number(avg.toFixed(3));
    }
    getTopConcerns(analyses, limit) {
        const buckets = {};
        const pushConcern = (value) => {
            const normalized = String(value || '')
                .trim()
                .toLowerCase();
            if (!normalized)
                return;
            buckets[normalized] = (buckets[normalized] || 0) + 1;
        };
        for (const analysis of analyses) {
            for (const condition of analysis.conditions || []) {
                pushConcern(condition);
            }
            const concernsFromResults = Array.isArray(analysis.results?.concerns)
                ? analysis.results.concerns
                : [];
            for (const concern of concernsFromResults) {
                pushConcern(concern);
            }
            if (analysis.results?.detailedAnalysis &&
                typeof analysis.results.detailedAnalysis === 'object') {
                for (const key of Object.keys(analysis.results.detailedAnalysis)) {
                    pushConcern(key);
                }
            }
        }
        return Object.entries(buckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, value]) => ({ name, value }));
    }
    getRiskDistribution(users) {
        const levels = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
            unknown: 0,
        };
        for (const user of users) {
            const rawLevel = (user.churnRiskLevel || '').toLowerCase();
            if (rawLevel === 'low')
                levels.low += 1;
            else if (rawLevel === 'medium')
                levels.medium += 1;
            else if (rawLevel === 'high')
                levels.high += 1;
            else if (rawLevel === 'critical')
                levels.critical += 1;
            else
                levels.unknown += 1;
        }
        return [
            { name: 'Low', value: levels.low },
            { name: 'Medium', value: levels.medium },
            { name: 'High', value: levels.high },
            { name: 'Critical', value: levels.critical },
            { name: 'Unknown', value: levels.unknown },
        ];
    }
    buildDailySeries(from, to, source) {
        const days = [];
        for (let cursor = this.startOfDay(from); cursor <= to; cursor = this.addDays(cursor, 1)) {
            days.push({
                date: this.dateKey(cursor),
                analyses: 0,
                chats: 0,
                posts: 0,
                signups: 0,
            });
        }
        const index = new Map(days.map((day, i) => [day.date, i]));
        const apply = (points, field) => {
            for (const point of points) {
                const key = this.dateKey(point);
                const i = index.get(key);
                if (i === undefined)
                    continue;
                days[i][field] += 1;
            }
        };
        apply(source.analyses, 'analyses');
        apply(source.chats, 'chats');
        apply(source.posts, 'posts');
        apply(source.signups, 'signups');
        return days;
    }
    safeRate(value, base) {
        if (!base || !Number.isFinite(base)) {
            return 0;
        }
        return value / base;
    }
    subDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() - days);
        return copy;
    }
    addDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }
    startOfDay(date) {
        const copy = new Date(date);
        copy.setHours(0, 0, 0, 0);
        return copy;
    }
    dateKey(date) {
        return date.toISOString().slice(0, 10);
    }
};
exports.AdminBiService = AdminBiService;
exports.AdminBiService = AdminBiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminBiService);
//# sourceMappingURL=admin-bi.service.js.map