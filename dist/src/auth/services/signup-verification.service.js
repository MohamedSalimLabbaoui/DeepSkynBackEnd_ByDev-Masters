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
var SignupVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupVerificationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
let SignupVerificationService = SignupVerificationService_1 = class SignupVerificationService {
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.logger = new common_1.Logger(SignupVerificationService_1.name);
        this.CODE_TTL_MS = 10 * 60 * 1000;
        this.RESEND_COOLDOWN_MS = 60 * 1000;
        this.MAX_ATTEMPTS = 5;
        this.pendingVerifications = new Map();
    }
    async requestCode(payload) {
        const email = payload.email.toLowerCase().trim();
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Un compte avec cet email existe deja.');
        }
        const existingPending = this.pendingVerifications.get(email);
        if (existingPending &&
            existingPending.resendAvailableAt.getTime() > Date.now()) {
            const retryAfter = Math.ceil((existingPending.resendAvailableAt.getTime() - Date.now()) / 1000);
            throw new common_1.HttpException(`Veuillez attendre ${retryAfter}s avant de redemander un code.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const code = this.generateNumericCode();
        const codeHash = this.hashCode(code);
        const now = Date.now();
        this.pendingVerifications.set(email, {
            email,
            codeHash,
            attemptsLeft: this.MAX_ATTEMPTS,
            expiresAt: new Date(now + this.CODE_TTL_MS),
            resendAvailableAt: new Date(now + this.RESEND_COOLDOWN_MS),
            payload: {
                ...payload,
                email,
            },
        });
        try {
            await this.mailService.sendSignupVerificationCode(email, payload.name || email, code, Math.floor(this.CODE_TTL_MS / 60000));
        }
        catch (error) {
            this.pendingVerifications.delete(email);
            this.logger.error(`Failed to send signup verification code to ${email}`, error?.stack);
            throw new common_1.BadRequestException("Impossible d'envoyer le code de verification pour le moment.");
        }
        return {
            message: 'Code de verification envoye par email.',
            expiresInSeconds: Math.floor(this.CODE_TTL_MS / 1000),
        };
    }
    verifyCodeAndConsume(emailInput, code) {
        const email = emailInput.toLowerCase().trim();
        const pending = this.pendingVerifications.get(email);
        if (!pending) {
            throw new common_1.BadRequestException('Aucune demande de verification en cours pour cet email.');
        }
        if (pending.expiresAt.getTime() < Date.now()) {
            this.pendingVerifications.delete(email);
            throw new common_1.BadRequestException('Le code de verification a expire.');
        }
        const providedHash = this.hashCode(code.trim());
        if (providedHash !== pending.codeHash) {
            pending.attemptsLeft -= 1;
            if (pending.attemptsLeft <= 0) {
                this.pendingVerifications.delete(email);
                throw new common_1.BadRequestException('Code incorrect. Veuillez redemander un nouveau code.');
            }
            throw new common_1.BadRequestException(`Code incorrect. Il vous reste ${pending.attemptsLeft} tentative(s).`);
        }
        this.pendingVerifications.delete(email);
        return pending.payload;
    }
    generateNumericCode() {
        return crypto.randomInt(100000, 1000000).toString();
    }
    hashCode(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }
};
exports.SignupVerificationService = SignupVerificationService;
exports.SignupVerificationService = SignupVerificationService = SignupVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], SignupVerificationService);
//# sourceMappingURL=signup-verification.service.js.map