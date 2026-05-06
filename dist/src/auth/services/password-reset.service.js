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
var PasswordResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.logger = new common_1.Logger(PasswordResetService_1.name);
        this.RESET_TOKEN_EXPIRY_HOURS = 1;
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            this.logger.warn(`Tentative de reset pour un email inexistant: ${email}`);
            return {
                message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
            };
        }
        if (!user.password && user.googleId) {
            this.logger.warn(`Tentative de reset pour un compte Google-only: ${email}`);
            return {
                message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
            };
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + this.RESET_TOKEN_EXPIRY_HOURS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: expiresAt,
            },
        });
        try {
            await this.mailService.sendPasswordResetEmail(user.email, user.name || user.email, resetToken);
        }
        catch (error) {
            this.logger.error("Erreur lors de l'envoi de l'email de reset", error.stack);
        }
        return {
            message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
        };
    }
    async resetPassword(token, newPassword) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.');
        }
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        try {
            await this.mailService.sendPasswordChangedEmail(user.email, user.name || user.email);
        }
        catch (error) {
            this.logger.error("Erreur lors de l'envoi de l'email de confirmation", error.stack);
        }
        this.logger.log(`Mot de passe réinitialisé pour l'utilisateur ${user.id}`);
        return {
            message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        };
    }
    async validateResetToken(token) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
            select: { email: true },
        });
        if (!user) {
            return { valid: false };
        }
        return { valid: true, email: user.email };
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = PasswordResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map