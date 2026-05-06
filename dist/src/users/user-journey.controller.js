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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserJourneyController = void 0;
const common_1 = require("@nestjs/common");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const digital_twin_service_1 = require("../digital-twin/digital-twin.service");
const predictive_routine_service_1 = require("../predictive-routine/predictive-routine.service");
let UserJourneyController = class UserJourneyController {
    constructor(prisma, digitalTwinService, predictiveRoutineService) {
        this.prisma = prisma;
        this.digitalTwinService = digitalTwinService;
        this.predictiveRoutineService = predictiveRoutineService;
    }
    async getSkinJourney(req) {
        const userId = req.user.userId;
        const [user, latestAnalysis, twin, snapshots, pendingRoutines, activeRoutine,] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    createdAt: true,
                },
            }),
            this.prisma.analysis.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    healthScore: true,
                    skinAge: true,
                    conditions: true,
                    results: true,
                    createdAt: true,
                },
            }),
            this.digitalTwinService.getOrCreateTwin(userId),
            this.digitalTwinService.getSnapshots(userId, 30),
            this.predictiveRoutineService.getPendingRoutines(userId),
            this.prisma.routine.findFirst({
                where: { userId, isActive: true },
                include: { user: false },
            }),
        ]);
        const snapshotCount = snapshots.length;
        const twinEnabled = snapshotCount >= 3;
        const predictionsUnlocked = twin.confidence >= 0.1;
        const systemState = this.calculateSystemState(snapshotCount, twin.confidence);
        const insights = await this.generateInsights(twin, snapshots, pendingRoutines[0] || null);
        const recommendations = this.getRecommendations(systemState, pendingRoutines[0] || null, activeRoutine, latestAnalysis);
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                memberSince: user.createdAt,
            },
            latestAnalysis: latestAnalysis
                ? {
                    id: latestAnalysis.id,
                    healthScore: latestAnalysis.healthScore,
                    skinAge: latestAnalysis.skinAge,
                    conditions: latestAnalysis.conditions,
                    createdAt: latestAnalysis.createdAt,
                }
                : null,
            digitalTwin: {
                enabled: twinEnabled,
                snapshotCount,
                confidence: twin.confidence,
                predictionsUnlocked,
                currentState: twin.currentState,
                trendAnalysis: twin.trendAnalysis,
                seasonalPatterns: twin.seasonalPatterns,
                improvementRate: twin.improvementRate,
                lastUpdated: twin.lastUpdated,
                insights: this.getDigitalTwinInsights(twin, snapshotCount),
            },
            predictiveRoutine: pendingRoutines && pendingRoutines.length > 0
                ? {
                    id: pendingRoutines[0].id,
                    status: pendingRoutines[0].status,
                    routine: pendingRoutines[0].routine,
                    generatedAt: pendingRoutines[0].generatedAt,
                    expiresAt: pendingRoutines[0].expiresAt,
                    twinEnhanced: twinEnabled,
                    confidence: twin.confidence,
                }
                : null,
            activeRoutine: activeRoutine
                ? {
                    id: activeRoutine.id,
                    name: activeRoutine.name,
                    type: activeRoutine.type,
                    steps: activeRoutine.steps,
                    isActive: activeRoutine.isActive,
                    createdAt: activeRoutine.createdAt,
                    currentDay: this.calculateCurrentDay(activeRoutine.createdAt),
                    totalDays: 7,
                }
                : null,
            systemState,
            insights,
            recommendations,
        };
    }
    calculateSystemState(snapshotCount, confidence) {
        if (snapshotCount === 0)
            return 'NEW_USER';
        if (snapshotCount < 3)
            return 'BUILDING_TWIN';
        if (confidence < 0.3)
            return 'TWIN_READY';
        if (confidence < 0.8)
            return 'PREDICTIONS_UNLOCKED';
        return 'HIGH_CONFIDENCE';
    }
    async generateInsights(twin, snapshots, pendingRoutine) {
        const insights = [];
        if (snapshots.length < 3) {
            insights.push(`📸 ${3 - snapshots.length} more scan${3 - snapshots.length > 1 ? 's' : ''} to unlock Digital Twin`);
        }
        else if (twin.confidence < 0.3) {
            insights.push('🔬 Digital Twin active - Add more scans for predictions');
        }
        else if (twin.confidence >= 0.8) {
            insights.push('✨ High accuracy Digital Twin - Predictions very reliable');
        }
        if (twin.improvementRate && twin.improvementRate > 10) {
            insights.push(`🎉 Your skin is improving at ${twin.improvementRate.toFixed(1)}% rate!`);
        }
        else if (twin.improvementRate && twin.improvementRate < -10) {
            insights.push(`⚠️ Skin health declining - Review your routine`);
        }
        if (twin.trendAnalysis?.healthScoreTrend === 'improving') {
            insights.push('📈 Positive trend detected - Keep it up!');
        }
        else if (twin.trendAnalysis?.healthScoreTrend === 'declining') {
            insights.push('📉 Declining trend - Consider adjusting routine');
        }
        if (pendingRoutine) {
            insights.push('💡 Personalized routine ready to activate');
        }
        return insights;
    }
    getDigitalTwinInsights(twin, snapshotCount) {
        const insights = [];
        if (snapshotCount < 3) {
            insights.push(`🔬 Building Digital Twin: ${snapshotCount}/3 scans`);
        }
        else if (twin.confidence < 0.3) {
            insights.push('🎯 Twin ready - Predictions available with limited confidence');
        }
        else if (twin.confidence < 0.8) {
            insights.push(`🎯 ${Math.round(twin.confidence * 100)}% confidence - Good accuracy`);
        }
        else {
            insights.push(`✨ ${Math.round(twin.confidence * 100)}% confidence - Excellent accuracy`);
        }
        if (twin.trendAnalysis?.dataPoints > 10) {
            insights.push(`📊 ${twin.trendAnalysis.dataPoints} data points analyzed`);
        }
        if (twin.seasonalPatterns && twin.seasonalPatterns.length > 0) {
            insights.push('🌍 Seasonal patterns detected');
        }
        return insights;
    }
    getRecommendations(systemState, pendingRoutine, activeRoutine, latestAnalysis) {
        const recommendations = {
            nextScan: null,
            actionItems: [],
        };
        if (systemState === 'BUILDING_TWIN') {
            recommendations.actionItems.push('Take more scans to unlock Digital Twin predictions');
        }
        else if (systemState === 'TWIN_READY') {
            recommendations.actionItems.push('Take 5-7 more scans for accurate predictions');
        }
        else if (latestAnalysis) {
            const daysSinceLastScan = Math.floor((Date.now() - new Date(latestAnalysis.createdAt).getTime()) /
                (1000 * 60 * 60 * 24));
            if (daysSinceLastScan >= 7) {
                recommendations.nextScan = new Date().toISOString().split('T')[0];
                recommendations.actionItems.push('Weekly scan recommended');
            }
            else if (activeRoutine) {
                const routineDay = this.calculateCurrentDay(activeRoutine.createdAt);
                if (routineDay === 7) {
                    recommendations.nextScan = new Date().toISOString().split('T')[0];
                    recommendations.actionItems.push('Scan to see routine results');
                }
            }
        }
        if (pendingRoutine) {
            recommendations.actionItems.push('Review and activate your personalized routine');
        }
        else if (!activeRoutine && latestAnalysis) {
            recommendations.actionItems.push('Generate new personalized routine');
        }
        if (activeRoutine) {
            const routineDay = this.calculateCurrentDay(activeRoutine.createdAt);
            recommendations.actionItems.push(`Complete today's routine steps (Day ${routineDay}/7)`);
        }
        return recommendations;
    }
    calculateCurrentDay(createdAt) {
        const daysSinceStart = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return Math.min(daysSinceStart + 1, 7);
    }
};
exports.UserJourneyController = UserJourneyController;
__decorate([
    (0, common_1.Get)('skin-journey'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserJourneyController.prototype, "getSkinJourney", null);
exports.UserJourneyController = UserJourneyController = __decorate([
    (0, common_1.Controller)('user'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        digital_twin_service_1.DigitalTwinService,
        predictive_routine_service_1.PredictiveRoutineService])
], UserJourneyController);
//# sourceMappingURL=user-journey.controller.js.map