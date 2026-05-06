import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
export interface FacebookAuthResult {
    user: Partial<User>;
    isNewUser: boolean;
    accessToken?: string;
    requiresTwoFactor?: boolean;
}
export declare class FacebookAuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService);
    authenticateWithProfile(profile: {
        facebookId: string;
        email: string | null;
        name: string;
        avatar: string | null;
    }): Promise<FacebookAuthResult>;
    private generateToken;
    private sanitizeUser;
}
