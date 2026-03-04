import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

export interface FacebookAuthResult {
    user: Partial<User>;
    isNewUser: boolean;
    accessToken?: string;
    requiresTwoFactor?: boolean;
}

@Injectable()
export class FacebookAuthService {
    private readonly logger = new Logger(FacebookAuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async authenticateWithProfile(profile: {
        facebookId: string;
        email: string | null;
        name: string;
        avatar: string | null;
    }): Promise<FacebookAuthResult> {
        // 1. Chercher par facebookId
        let user = await this.prisma.user.findUnique({
            where: { facebookId: profile.facebookId } as any,
        });

        if (user) {
            // Utilisateur existant trouvé - mettre à jour les infos
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    avatar: profile.avatar || user.avatar,
                    lastActivity: new Date(),
                },
            });

            return {
                user: this.sanitizeUser(user),
                isNewUser: false,
                requiresTwoFactor: user.twoFactorEnabled,
                accessToken: user.twoFactorEnabled ? undefined : this.generateToken(user),
            };
        }

        // 2. Chercher par email si présent
        if (profile.email) {
            const existingByEmail = await this.prisma.user.findUnique({
                where: { email: profile.email },
            });

            if (existingByEmail) {
                // Lier le compte Facebook au compte existant
                user = await this.prisma.user.update({
                    where: { id: existingByEmail.id } as any,
                    data: {
                        facebookId: profile.facebookId,
                        avatar: profile.avatar || existingByEmail.avatar,
                        lastActivity: new Date(),
                    } as any,
                });

                return {
                    user: this.sanitizeUser(user),
                    isNewUser: false,
                    requiresTwoFactor: user.twoFactorEnabled,
                    accessToken: user.twoFactorEnabled ? undefined : this.generateToken(user),
                };
            }
        }

        // 3. Créer un nouvel utilisateur
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
            } as any,
        });

        this.logger.log(`New user created via Facebook: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            isNewUser: true,
            requiresTwoFactor: user.twoFactorEnabled,
            accessToken: user.twoFactorEnabled ? undefined : this.generateToken(user),
        };
    }

    private generateToken(user: User): string {
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            roles: [user.role || 'user'],
        };
        return this.jwtService.sign(payload);
    }

    private sanitizeUser(user: User): Partial<User> {
        const { password, refreshToken, twoFactorSecret, ...safeUser } = user;
        return safeUser;
    }
}
