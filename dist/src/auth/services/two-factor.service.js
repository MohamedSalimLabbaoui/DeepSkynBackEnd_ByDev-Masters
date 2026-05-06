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
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const otplib_1 = require("otplib");
const QRCode = require("qrcode");
const prisma_service_1 = require("../../prisma/prisma.service");
let TwoFactorService = class TwoFactorService {
    constructor(prisma) {
        this.prisma = prisma;
        this.APP_NAME = 'DeepSkyn';
    }
    verifyTOTP(token, secret) {
        const result = (0, otplib_1.verifySync)({ token, secret });
        return result?.valid === true;
    }
    async generateTwoFactorSecret(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, twoFactorEnabled: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('Utilisateur non trouvé');
        }
        if (user.twoFactorEnabled) {
            throw new common_1.BadRequestException('Le 2FA est déjà activé pour ce compte');
        }
        const secret = (0, otplib_1.generateSecret)();
        const otpauthUrl = (0, otplib_1.generateURI)({
            issuer: this.APP_NAME,
            label: user.email,
            secret,
            algorithm: 'sha1',
            digits: 6,
            period: 30,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret },
        });
        return {
            secret,
            otpauthUrl,
            qrCode: qrCodeDataUrl,
        };
    }
    async enable(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('Utilisateur non trouvé');
        }
        if (user.twoFactorEnabled) {
            throw new common_1.BadRequestException('Le 2FA est déjà activé');
        }
        if (!user.twoFactorSecret) {
            throw new common_1.BadRequestException("Veuillez d'abord générer un secret 2FA");
        }
        const isValid = this.verifyTOTP(code, user.twoFactorSecret);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Code 2FA invalide');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
        return { message: '2FA activé avec succès' };
    }
    async disable(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('Utilisateur non trouvé');
        }
        if (!user.twoFactorEnabled) {
            throw new common_1.BadRequestException("Le 2FA n'est pas activé");
        }
        const isValid = this.verifyTOTP(code, user.twoFactorSecret);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Code 2FA invalide');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });
        return { message: '2FA désactivé avec succès' };
    }
    async verifyCode(userId, code) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return false;
        }
        return this.verifyTOTP(code, user.twoFactorSecret);
    }
    async isTwoFactorEnabled(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { twoFactorEnabled: true },
        });
        return user?.twoFactorEnabled ?? false;
    }
    async verifyCodeByEmail(email, code) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return false;
        }
        return this.verifyTOTP(code, user.twoFactorSecret);
    }
    async getStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorEnabled: true },
        });
        return { enabled: user?.twoFactorEnabled ?? false };
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TwoFactorService);
//# sourceMappingURL=two-factor.service.js.map