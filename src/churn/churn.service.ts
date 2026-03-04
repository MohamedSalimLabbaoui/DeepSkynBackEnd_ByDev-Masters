import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

interface UserChurnInput {
  id: string;
  email: string;
  name: string | null;
  interactionCount: number;
  daysSinceLastActivity: number;
  sessionCount: number;
  accountAgeDays: number;
}

interface PredictionResult {
  id: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isChurned: boolean;
}

interface PredictionOutput {
  predictions: PredictionResult[];
  totalUsers: number;
  atRiskCount: number;
  criticalCount: number;
}

@Injectable()
export class ChurnService implements OnModuleInit {
  private readonly logger = new Logger(ChurnService.name);
  private readonly mlDir: string;
  private pythonPath: string;
  private modelReady = false;

  // Fallback thresholds if Python model is not available
  private readonly FALLBACK_THRESHOLDS = {
    critical: { maxInteractions: 2, minDaysSince: 60, maxSessions: 2 },
    high: { maxInteractions: 5, minDaysSince: 30, maxSessions: 5 },
    medium: { maxInteractions: 15, minDaysSince: 14, maxSessions: 10 },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.mlDir = path.join(process.cwd(), 'ml');
    this.pythonPath = this.configService.get<string>('PYTHON_PATH', 'python');
  }

  async onModuleInit() {
    // Check if ML model is available
    const modelPath = path.join(this.mlDir, 'models', 'churn_model.joblib');
    this.modelReady = fs.existsSync(modelPath);

    if (this.modelReady) {
      this.logger.log('ML churn model loaded successfully');
    } else {
      this.logger.warn(
        'ML churn model not found. Using fallback rule-based prediction. ' +
          'Run "python ml/train_model.py" to train the model.',
      );
    }
  }

  /**
   * CRON: Analyse quotidienne du churn à 9h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async scheduledChurnAnalysis() {
    this.logger.log('Starting scheduled churn analysis...');

    try {
      const report = await this.analyzeAllUsers();
      this.logger.log(
        `Churn analysis complete: ${report.totalUsers} users analyzed, ` +
          `${report.atRiskCount} at risk, ${report.criticalCount} critical`,
      );

      // Send re-engagement emails to at-risk users
      await this.sendReEngagementEmails();
    } catch (error) {
      this.logger.error('Scheduled churn analysis failed', error.stack);
    }
  }

  /**
   * Analyse tous les utilisateurs et met à jour leurs scores de churn
   */
  async analyzeAllUsers(): Promise<PredictionOutput> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        interactionCount: true,
        lastActivity: true,
        sessionCount: true,
        createdAt: true,
      },
    });

    if (users.length === 0) {
      return {
        predictions: [],
        totalUsers: 0,
        atRiskCount: 0,
        criticalCount: 0,
      };
    }

    const now = new Date();
    const userInputs: UserChurnInput[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      interactionCount: user.interactionCount,
      daysSinceLastActivity: user.lastActivity
        ? Math.floor(
            (now.getTime() - user.lastActivity.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999,
      sessionCount: user.sessionCount,
      accountAgeDays: Math.floor(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));

    let predictions: PredictionResult[];

    if (this.modelReady) {
      predictions = await this.predictWithMLModel(userInputs);
    } else {
      predictions = this.predictWithFallback(userInputs);
    }

    // Update user records in database (batch)
    const updatePromises = predictions.map((pred) =>
      this.prisma.user.update({
        where: { id: pred.id },
        data: {
          churnRiskScore: pred.churnProbability,
          churnRiskLevel: pred.riskLevel,
          lastChurnAnalysis: now,
        },
      }),
    );

    await Promise.all(updatePromises);

    const atRiskCount = predictions.filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'critical',
    ).length;
    const criticalCount = predictions.filter(
      (p) => p.riskLevel === 'critical',
    ).length;

    return {
      predictions,
      totalUsers: predictions.length,
      atRiskCount,
      criticalCount,
    };
  }

  /**
   * Prediction via le modèle ML Python (XGBoost + Gradient Boosting)
   */
  private async predictWithMLModel(
    users: UserChurnInput[],
  ): Promise<PredictionResult[]> {
    try {
      const input = JSON.stringify({
        users: users.map((u) => ({
          id: u.id,
          interactionCount: u.interactionCount,
          daysSinceLastActivity: u.daysSinceLastActivity,
          sessionCount: u.sessionCount,
          accountAgeDays: u.accountAgeDays,
        })),
      });

      const predictScript = path.join(this.mlDir, 'predict.py');

      const { stdout, stderr } = await execFileAsync(
        this.pythonPath,
        [predictScript, input],
        {
          timeout: 60000, // 60s max
          maxBuffer: 10 * 1024 * 1024, // 10MB
        },
      );

      if (stderr) {
        this.logger.warn(`Python stderr: ${stderr}`);
      }

      const result: PredictionOutput = JSON.parse(stdout.trim());

      if (result.predictions) {
        return result.predictions;
      }

      throw new Error('Invalid prediction output');
    } catch (error) {
      this.logger.error(
        `ML prediction failed, falling back to rules: ${error.message}`,
      );
      return this.predictWithFallback(users);
    }
  }

  /**
   * Prediction basée sur des règles (fallback quand le modèle ML n'est pas disponible)
   * Utilise un scoring pondéré des features
   */
  private predictWithFallback(users: UserChurnInput[]): PredictionResult[] {
    return users.map((user) => {
      // Weighted scoring system
      let score = 0;

      // Days since last activity (weight: 40%)
      if (user.daysSinceLastActivity >= 90) score += 0.4;
      else if (user.daysSinceLastActivity >= 60) score += 0.32;
      else if (user.daysSinceLastActivity >= 30) score += 0.24;
      else if (user.daysSinceLastActivity >= 14) score += 0.16;
      else if (user.daysSinceLastActivity >= 7) score += 0.08;
      else score += 0.02;

      // Interaction count (weight: 30%)
      if (user.interactionCount <= 1) score += 0.3;
      else if (user.interactionCount <= 5) score += 0.22;
      else if (user.interactionCount <= 15) score += 0.15;
      else if (user.interactionCount <= 30) score += 0.08;
      else score += 0.02;

      // Session count (weight: 30%)
      if (user.sessionCount <= 1) score += 0.3;
      else if (user.sessionCount <= 3) score += 0.22;
      else if (user.sessionCount <= 8) score += 0.15;
      else if (user.sessionCount <= 15) score += 0.08;
      else score += 0.02;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (score >= 0.9) riskLevel = 'critical';
      else if (score >= 0.75) riskLevel = 'high';
      else if (score >= 0.5) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        id: user.id,
        churnProbability: Math.round(score * 10000) / 10000,
        riskLevel,
        isChurned: score >= 0.75,
      };
    });
  }

  /**
   * Envoie des emails de re-engagement aux utilisateurs à risque
   * (high + critical) qui n'ont pas reçu d'email dans les 7 derniers jours
   */
  async sendReEngagementEmails(): Promise<{
    sent: number;
    skipped: number;
    failed: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const atRiskUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        churnRiskLevel: { in: ['high', 'critical'] },
        OR: [
          { reEngagementSentAt: null },
          { reEngagementSentAt: { lt: sevenDaysAgo } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        churnRiskLevel: true,
        churnRiskScore: true,
        interactionCount: true,
        lastActivity: true,
      },
    });

    let sent = 0;
    const skipped = 0;
    let failed = 0;

    for (const user of atRiskUsers) {
      try {
        await this.mailService.sendReEngagementEmail(
          user.email,
          user.name || 'cher utilisateur',
          user.churnRiskLevel as 'high' | 'critical',
        );

        await this.prisma.user.update({
          where: { id: user.id },
          data: { reEngagementSentAt: new Date() },
        });

        sent++;
        this.logger.log(
          `Re-engagement email sent to ${user.email} (risk: ${user.churnRiskLevel})`,
        );
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to send re-engagement email to ${user.email}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Re-engagement emails: ${sent} sent, ${skipped} skipped, ${failed} failed`,
    );

    return { sent, skipped, failed };
  }

  /**
   * Obtenir le rapport de churn pour le dashboard admin
   */
  async getChurnStats() {
    const [
      totalUsers,
      analyzed,
      lowRisk,
      mediumRisk,
      highRisk,
      criticalRisk,
      emailsToday,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { lastChurnAnalysis: { not: null } } }),
      this.prisma.user.count({ where: { churnRiskLevel: 'low' } }),
      this.prisma.user.count({ where: { churnRiskLevel: 'medium' } }),
      this.prisma.user.count({ where: { churnRiskLevel: 'high' } }),
      this.prisma.user.count({ where: { churnRiskLevel: 'critical' } }),
      this.prisma.user.count({
        where: {
          reEngagementSentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    const lastAnalyzed = await this.prisma.user.findFirst({
      where: { lastChurnAnalysis: { not: null } },
      orderBy: { lastChurnAnalysis: 'desc' },
      select: { lastChurnAnalysis: true },
    });

    return {
      totalUsers,
      analyzedUsers: analyzed,
      lowRisk,
      mediumRisk,
      highRisk,
      criticalRisk,
      emailsSentToday: emailsToday,
      lastAnalysis: lastAnalyzed?.lastChurnAnalysis?.toISOString() || null,
      modelReady: this.modelReady,
    };
  }

  /**
   * Prediction pour un seul utilisateur
   */
  async predictSingleUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        interactionCount: true,
        lastActivity: true,
        sessionCount: true,
        createdAt: true,
        churnRiskScore: true,
        churnRiskLevel: true,
        lastChurnAnalysis: true,
      },
    });

    if (!user) {
      return null;
    }

    const now = new Date();
    const input: UserChurnInput = {
      id: user.id,
      email: user.email,
      name: user.name,
      interactionCount: user.interactionCount,
      daysSinceLastActivity: user.lastActivity
        ? Math.floor(
            (now.getTime() - user.lastActivity.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999,
      sessionCount: user.sessionCount,
      accountAgeDays: Math.floor(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    };

    let prediction: PredictionResult;

    if (this.modelReady) {
      const results = await this.predictWithMLModel([input]);
      prediction = results[0];
    } else {
      const results = this.predictWithFallback([input]);
      prediction = results[0];
    }

    // Update in DB
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        churnRiskScore: prediction.churnProbability,
        churnRiskLevel: prediction.riskLevel,
        lastChurnAnalysis: now,
      },
    });

    return {
      ...prediction,
      email: user.email,
      name: user.name,
      interactionCount: user.interactionCount,
      sessionCount: user.sessionCount,
      daysSinceLastActivity: input.daysSinceLastActivity,
      accountAgeDays: input.accountAgeDays,
    };
  }

  /**
   * Obtenir les utilisateurs les plus à risque
   */
  async getAtRiskUsers(limit = 20) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        churnRiskLevel: { in: ['high', 'critical'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        interactionCount: true,
        sessionCount: true,
        lastActivity: true,
        churnRiskScore: true,
        churnRiskLevel: true,
        lastChurnAnalysis: true,
        reEngagementSentAt: true,
        createdAt: true,
      },
      orderBy: { churnRiskScore: 'desc' },
      take: limit,
    });
  }
}
