import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DigitalTwinService } from '../digital-twin/digital-twin.service';
import { PredictiveRoutineService } from '../predictive-routine/predictive-routine.service';

@Controller('user')
@UseGuards(KeycloakAuthGuard)
export class UserJourneyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digitalTwinService: DigitalTwinService,
    private readonly predictiveRoutineService: PredictiveRoutineService,
  ) {}

  /**
   * 🌟 GET /user/skin-journey
   * Endpoint unifié qui retourne TOUT le contexte utilisateur
   * pour construire une UX fluide et professionnelle
   */
  @Get('skin-journey')
  async getSkinJourney(@Req() req) {
    const userId = req.user.userId;

    // Récupérer tous les contextes en parallèle
    const [
      user,
      latestAnalysis,
      twin,
      snapshots,
      pendingRoutines,
      activeRoutine,
    ] = await Promise.all([
      // User info
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

      // Latest analysis
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

      // Digital Twin
      this.digitalTwinService.getOrCreateTwin(userId),

      // Snapshots count
      this.digitalTwinService.getSnapshots(userId, 30),

      // Pending Predictive Routine
      this.predictiveRoutineService.getPendingRoutines(userId),

      // Active Routine (if any)
      this.prisma.routine.findFirst({
        where: { userId, isActive: true },
        include: { user: false },
      }),
    ]);

    // Calculate Digital Twin status
    const snapshotCount = snapshots.length;
    const twinEnabled = snapshotCount >= 3;
    const predictionsUnlocked = twin.confidence >= 0.3;

    // Calculate system state
    const systemState = this.calculateSystemState(snapshotCount, twin.confidence);

    // Generate insights
    const insights = await this.generateInsights(twin, snapshots, pendingRoutines[0] || null);

    // Get recommendations for next actions
    const recommendations = this.getRecommendations(
      systemState,
      pendingRoutines[0] || null,
      activeRoutine,
      latestAnalysis,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        memberSince: user.createdAt,
      },

      latestAnalysis: latestAnalysis ? {
        id: latestAnalysis.id,
        healthScore: latestAnalysis.healthScore,
        skinAge: latestAnalysis.skinAge,
        conditions: latestAnalysis.conditions,
        createdAt: latestAnalysis.createdAt,
      } : null,

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

      predictiveRoutine: pendingRoutines && pendingRoutines.length > 0 ? {
        id: pendingRoutines[0].id,
        status: pendingRoutines[0].status,
        routine: pendingRoutines[0].routine,
        generatedAt: pendingRoutines[0].generatedAt,
        expiresAt: pendingRoutines[0].expiresAt,
        twinEnhanced: twinEnabled,
        confidence: twin.confidence,
      } : null,

      activeRoutine: activeRoutine ? {
        id: activeRoutine.id,
        name: activeRoutine.name,
        type: activeRoutine.type,
        steps: activeRoutine.steps,
        isActive: activeRoutine.isActive,
        createdAt: activeRoutine.createdAt,
        // Calculate progress
        currentDay: this.calculateCurrentDay(activeRoutine.createdAt),
        totalDays: 7, // Assuming 7-day routine
      } : null,

      systemState,
      insights,
      recommendations,
    };
  }

  /**
   * Calculate system state based on snapshots and confidence
   */
  private calculateSystemState(snapshotCount: number, confidence: number): string {
    if (snapshotCount === 0) return 'NEW_USER';
    if (snapshotCount < 3) return 'BUILDING_TWIN';
    if (confidence < 0.3) return 'TWIN_READY';
    if (confidence < 0.8) return 'PREDICTIONS_UNLOCKED';
    return 'HIGH_CONFIDENCE';
  }

  /**
   * Generate contextual insights
   */
  private async generateInsights(twin: any, snapshots: any[], pendingRoutine: any) {
    const insights: string[] = [];

    // Digital Twin insights
    if (snapshots.length < 3) {
      insights.push(`📸 ${3 - snapshots.length} more scan${3 - snapshots.length > 1 ? 's' : ''} to unlock Digital Twin`);
    } else if (twin.confidence < 0.3) {
      insights.push('🔬 Digital Twin active - Add more scans for predictions');
    } else if (twin.confidence >= 0.8) {
      insights.push('✨ High accuracy Digital Twin - Predictions very reliable');
    }

    // Improvement insights
    if (twin.improvementRate && twin.improvementRate > 10) {
      insights.push(`🎉 Your skin is improving at ${twin.improvementRate.toFixed(1)}% rate!`);
    } else if (twin.improvementRate && twin.improvementRate < -10) {
      insights.push(`⚠️ Skin health declining - Review your routine`);
    }

    // Trend insights
    if (twin.trendAnalysis?.healthScoreTrend === 'improving') {
      insights.push('📈 Positive trend detected - Keep it up!');
    } else if (twin.trendAnalysis?.healthScoreTrend === 'declining') {
      insights.push('📉 Declining trend - Consider adjusting routine');
    }

    // Routine insights
    if (pendingRoutine) {
      insights.push('💡 Personalized routine ready to activate');
    }

    return insights;
  }

  /**
   * Get Digital Twin-specific insights
   */
  private getDigitalTwinInsights(twin: any, snapshotCount: number): string[] {
    const insights: string[] = [];

    if (snapshotCount < 3) {
      insights.push(`🔬 Building Digital Twin: ${snapshotCount}/3 scans`);
    } else if (twin.confidence < 0.3) {
      insights.push('🎯 Twin ready - Predictions available with limited confidence');
    } else if (twin.confidence < 0.8) {
      insights.push(`🎯 ${Math.round(twin.confidence * 100)}% confidence - Good accuracy`);
    } else {
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

  /**
   * Get recommendations for next actions
   */
  private getRecommendations(
    systemState: string,
    pendingRoutine: any,
    activeRoutine: any,
    latestAnalysis: any,
  ) {
    const recommendations = {
      nextScan: null,
      actionItems: [],
    };

    // Recommend next scan based on state
    if (systemState === 'BUILDING_TWIN') {
      recommendations.actionItems.push('Take more scans to unlock Digital Twin predictions');
    } else if (systemState === 'TWIN_READY') {
      recommendations.actionItems.push('Take 5-7 more scans for accurate predictions');
    } else if (latestAnalysis) {
      const daysSinceLastScan = Math.floor(
        (Date.now() - new Date(latestAnalysis.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastScan >= 7) {
        recommendations.nextScan = new Date().toISOString().split('T')[0];
        recommendations.actionItems.push('Weekly scan recommended');
      } else if (activeRoutine) {
        // Recommend scan at day 7 of routine
        const routineDay = this.calculateCurrentDay(activeRoutine.createdAt);
        if (routineDay === 7) {
          recommendations.nextScan = new Date().toISOString().split('T')[0];
          recommendations.actionItems.push('Scan to see routine results');
        }
      }
    }

    // Routine recommendations
    if (pendingRoutine) {
      recommendations.actionItems.push('Review and activate your personalized routine');
    } else if (!activeRoutine && latestAnalysis) {
      recommendations.actionItems.push('Generate new personalized routine');
    }

    if (activeRoutine) {
      const routineDay = this.calculateCurrentDay(activeRoutine.createdAt);
      recommendations.actionItems.push(`Complete today's routine steps (Day ${routineDay}/7)`);
    }

    return recommendations;
  }

  /**
   * Calculate current day of routine
   */
  private calculateCurrentDay(createdAt: Date): number {
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.min(daysSinceStart + 1, 7);
  }
}
