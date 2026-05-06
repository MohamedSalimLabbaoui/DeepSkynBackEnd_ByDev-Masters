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
var FacebookAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookAuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
let FacebookAuthService = FacebookAuthService_1 = class FacebookAuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(FacebookAuthService_1.name);
    }
    async authenticateWithProfile(profile) {
        let user = await this.prisma.user.findUnique({
            where: { facebookId: profile.facebookId },
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
        if (profile.email) {
            const existingByEmail = await this.prisma.user.findUnique({
                where: { email: profile.email },
            });
            if (existingByEmail) {
                user = await this.prisma.user.update({
                    where: { id: existingByEmail.id },
                    data: {
                        facebookId: profile.facebookId,
                        avatar: profile.avatar || existingByEmail.avatar,
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
        }
        const finalEmail = profile.email || `fb_${profile.facebookId}@placeholder.com`;
        user = await this.prisma.user.create({
            data: {
                facebookId: profile.facebookId,
                email: finalEmail,
                name: profile.name,
                avatar: profile.avatar,
                emailVerified: !!profile.email,
                onboardingComplete: false,
                role: 'user',
                lastActivity: new Date(),
                sessionCount: 1,
            },
        });
        this.logger.log(`New user created via Facebook: ${user.email}`);
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
exports.FacebookAuthService = FacebookAuthService;
exports.FacebookAuthService = FacebookAuthService = FacebookAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], FacebookAuthService);
//# sourceMappingURL=facebook-auth.service.js.map