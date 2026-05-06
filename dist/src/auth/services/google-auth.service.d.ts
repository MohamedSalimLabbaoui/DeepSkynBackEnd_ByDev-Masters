import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
export interface GoogleAuthResult {
    user: Partial<User>;
    isNewUser: boolean;
    accessToken?: string;
    requiresTwoFactor?: boolean;
}
export declare class GoogleAuthService {
    private readonly configService;
    private readonly prisma;
    private readonly jwtService;
    private readonly logger;
    private readonly oauthClient;
    private readonly googleClientId;
    constructor(configService: ConfigService, prisma: PrismaService, jwtService: JwtService);
    authenticateWithIdToken(idToken: string): Promise<GoogleAuthResult>;
    authenticateWithProfile(profile: {
        googleId: string;
        email: string;
        name: string;
        avatar: string;
        emailVerified: boolean;
    }): Promise<GoogleAuthResult>;
    private findOrCreateUser;
    generateToken(user: User): string;
    private sanitizeUser;
}
