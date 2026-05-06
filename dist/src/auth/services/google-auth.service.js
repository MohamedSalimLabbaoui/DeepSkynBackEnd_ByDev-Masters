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
var GoogleAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
const prisma_service_1 = require("../../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
let GoogleAuthService = GoogleAuthService_1 = class GoogleAuthService {
    constructor(configService, prisma, jwtService) {
        this.configService = configService;
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(GoogleAuthService_1.name);
        this.googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
        this.oauthClient = new google_auth_library_1.OAuth2Client(this.googleClientId);
    }
    async authenticateWithIdToken(idToken) {
        try {
            const ticket = await this.oauthClient.verifyIdToken({
                idToken,
                audience: this.googleClientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new common_1.UnauthorizedException('Token Google invalide');
            }
            const { sub: googleId, email, name, picture, email_verified } = payload;
            if (!email) {
                throw new common_1.UnauthorizedException('Email non disponible dans le token Google');
            }
            return this.findOrCreateUser({
                googleId,
                email,
                name: name || email.split('@')[0],
                avatar: picture || null,
                emailVerified: email_verified || false,
            });
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Google authentication failed', error);
            throw new common_1.UnauthorizedException("Échec de l'authentification Google");
        }
    }
    async authenticateWithProfile(profile) {
        return this.findOrCreateUser(profile);
    }
    async findOrCreateUser(profile) {
        let user = await this.prisma.user.findUnique({
            where: { googleId: profile.googleId },
        });
        if (user) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    avatar: profile.avatar || user.avatar,
                    lastActivity: new Date(),
                    ...(user.twoFactorEnabled
                        ? {}
                        : {
                            sessionCount: {
                                increment: 1,
                            },
                        }),
                },
            });
            return {
                user: this.sanitizeUser(user),
                isNewUser: false,
                requiresTwoFactor: user.twoFactorEnabled,
                accessToken: user.twoFactorEnabled
                    ? undefined
                    : this.generateToken(user),
            };
        }
        const existingByEmail = await this.prisma.user.findUnique({
            where: { email: profile.email },
        });
        if (existingByEmail) {
            user = await this.prisma.user.update({
                where: { id: existingByEmail.id },
                data: {
                    googleId: profile.googleId,
                    avatar: profile.avatar || existingByEmail.avatar,
                    emailVerified: true,
                    lastActivity: new Date(),
                    ...(existingByEmail.twoFactorEnabled
                        ? {}
                        : {
                            sessionCount: {
                                increment: 1,
                            },
                        }),
                },
            });
            return {
                user: this.sanitizeUser(user),
                isNewUser: false,
                requiresTwoFactor: user.twoFactorEnabled,
                accessToken: user.twoFactorEnabled
                    ? undefined
                    : this.generateToken(user),
            };
        }
        user = await this.prisma.user.create({
            data: {
                googleId: profile.googleId,
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
                emailVerified: profile.emailVerified,
                onboardingComplete: false,
                role: 'user',
                lastActivity: new Date(),
                sessionCount: 1,
            },
        });
        this.logger.log(`New user created via Google: ${user.email}`);
        return {
            user: this.sanitizeUser(user),
            isNewUser: true,
            requiresTwoFactor: user.twoFactorEnabled,
            accessToken: user.twoFactorEnabled ? undefined : this.generateToken(user),
        };
    }
    generateToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            roles: [user.role || 'user'],
        };
        return this.jwtService.sign(payload);
    }
    sanitizeUser(user) {
        const { password, refreshToken, twoFactorSecret, ...safeUser } = user;
        return safeUser;
    }
};
exports.GoogleAuthService = GoogleAuthService;
exports.GoogleAuthService = GoogleAuthService = GoogleAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], GoogleAuthService);
//# sourceMappingURL=google-auth.service.js.map