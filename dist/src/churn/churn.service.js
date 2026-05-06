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
var ChurnService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurnService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = require("path");
const fs = require("fs");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let ChurnService = ChurnService_1 = class ChurnService {
    constructor(prisma, mailService, configService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.configService = configService;
        this.logger = new common_1.Logger(ChurnService_1.name);
        this.modelReady = false;
        this.FALLBACK_THRESHOLDS = {
            critical: { maxInteractions: 2, minDaysSince: 60, maxSessions: 2 },
            high: { maxInteractions: 5, minDaysSince: 30, maxSessions: 5 },
            medium: { maxInteractions: 15, minDaysSince: 14, maxSessions: 10 },
        };
        this.mlDir = path.join(process.cwd(), 'ml');
        this.pythonPath = this.configService.get('PYTHON_PATH', 'python');
    }
    async onModuleInit() {
        const modelPath = path.join(this.mlDir, 'models', 'churn_model.joblib');
        this.modelReady = fs.existsSync(modelPath);
        if (this.modelReady) {
            this.logger.log('ML churn model loaded successfully');
        }
        else {
            this.logger.warn('ML churn model not found. Using fallback rule-based prediction. ' +
                'Run "python ml/train_model.py" to train the model.');
        }
    }
    async scheduledChurnAnalysis() {
        this.logger.log('Starting scheduled churn analysis...');
        try {
            const report = await this.analyzeAllUsers();
            this.logger.log(`Churn analysis complete: ${report.totalUsers} users analyzed, ` +
                `${report.atRiskCount} at risk, ${report.criticalCount} critical`);
            await this.sendReEngagementEmails();
        }
        catch (error) {
            this.logger.error('Scheduled churn analysis failed', error.stack);
        }
    }
    async analyzeAllUsers() {
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
        const userInputs = users.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            interactionCount: user.interactionCount,
            daysSinceLastActivity: user.lastActivity
                ? Math.floor((now.getTime() - user.lastActivity.getTime()) /
                    (1000 * 60 * 60 * 24))
                : 999,
            sessionCount: user.sessionCount,
            accountAgeDays: Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        }));
        let predictions;
        if (this.modelReady) {
            predictions = await this.predictWithMLModel(userInputs);
        }
        else {
            predictions = this.predictWithFallback(userInputs);
        }
        const updatePromises = predictions.map((pred) => this.prisma.user.update({
            where: { id: pred.id },
            data: {
                churnRiskScore: pred.churnProbability,
                churnRiskLevel: pred.riskLevel,
                lastChurnAnalysis: now,
            },
        }));
        await Promise.all(updatePromises);
        const atRiskCount = predictions.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
        const criticalCount = predictions.filter((p) => p.riskLevel === 'critical').length;
        return {
            predictions,
            totalUsers: predictions.length,
            atRiskCount,
            criticalCount,
        };
    }
    async predictWithMLModel(users) {
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
            const { stdout, stderr } = await execFileAsync(this.pythonPath, [predictScript, input], {
                timeout: 60000,
                maxBuffer: 10 * 1024 * 1024,
            });
            if (stderr) {
                this.logger.warn(`Python stderr: ${stderr}`);
            }
            const result = JSON.parse(stdout.trim());
            if (result.predictions) {
                return result.predictions;
            }
            throw new Error('Invalid prediction output');
        }
        catch (error) {
            this.logger.error(`ML prediction failed, falling back to rules: ${error.message}`);
            return this.predictWithFallback(users);
        }
    }
    predictWithFallback(users) {
        return users.map((user) => {
            let score = 0;
            if (user.daysSinceLastActivity >= 90)
                score += 0.4;
            else if (user.daysSinceLastActivity >= 60)
                score += 0.32;
            else if (user.daysSinceLastActivity >= 30)
                score += 0.24;
            else if (user.daysSinceLastActivity >= 14)
                score += 0.16;
            else if (user.daysSinceLastActivity >= 7)
                score += 0.08;
            else
                score += 0.02;
            if (user.interactionCount <= 1)
                score += 0.3;
            else if (user.interactionCount <= 5)
                score += 0.22;
            else if (user.interactionCount <= 15)
                score += 0.15;
            else if (user.interactionCount <= 30)
                score += 0.08;
            else
                score += 0.02;
            if (user.sessionCount <= 1)
                score += 0.3;
            else if (user.sessionCount <= 3)
                score += 0.22;
            else if (user.sessionCount <= 8)
                score += 0.15;
            else if (user.sessionCount <= 15)
                score += 0.08;
            else
                score += 0.02;
            let riskLevel;
            if (score >= 0.9)
                riskLevel = 'critical';
            else if (score >= 0.75)
                riskLevel = 'high';
            else if (score >= 0.5)
                riskLevel = 'medium';
            else
                riskLevel = 'low';
            return {
                id: user.id,
                churnProbability: Math.round(score * 10000) / 10000,
                riskLevel,
                isChurned: score >= 0.75,
            };
        });
    }
    async sendReEngagementEmails() {
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
                await this.mailService.sendReEngagementEmail(user.email, user.name || 'cher utilisateur', user.churnRiskLevel);
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { reEngagementSentAt: new Date() },
                });
                sent++;
                this.logger.log(`Re-engagement email sent to ${user.email} (risk: ${user.churnRiskLevel})`);
            }
            catch (error) {
                failed++;
                this.logger.error(`Failed to send re-engagement email to ${user.email}`, error.stack);
            }
        }
        this.logger.log(`Re-engagement emails: ${sent} sent, ${skipped} skipped, ${failed} failed`);
        return { sent, skipped, failed };
    }
    async getChurnStats() {
        const [totalUsers, analyzed, lowRisk, mediumRisk, highRisk, criticalRisk, emailsToday,] = await Promise.all([
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
    async predictSingleUser(userId) {
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
        const input = {
            id: user.id,
            email: user.email,
            name: user.name,
            interactionCount: user.interactionCount,
            daysSinceLastActivity: user.lastActivity
                ? Math.floor((now.getTime() - user.lastActivity.getTime()) /
                    (1000 * 60 * 60 * 24))
                : 999,
            sessionCount: user.sessionCount,
            accountAgeDays: Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        };
        let prediction;
        if (this.modelReady) {
            const results = await this.predictWithMLModel([input]);
            prediction = results[0];
        }
        else {
            const results = this.predictWithFallback([input]);
            prediction = results[0];
        }
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
};
exports.ChurnService = ChurnService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChurnService.prototype, "scheduledChurnAnalysis", null);
exports.ChurnService = ChurnService = ChurnService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], ChurnService);
//# sourceMappingURL=churn.service.js.map