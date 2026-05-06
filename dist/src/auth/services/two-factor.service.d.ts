import { PrismaService } from '../../prisma/prisma.service';
export interface TwoFactorSetup {
    secret: string;
    otpauthUrl: string;
    qrCode: string;
}
export declare class TwoFactorService {
    private readonly prisma;
    private readonly APP_NAME;
    constructor(prisma: PrismaService);
    private verifyTOTP;
    generateTwoFactorSecret(userId: string): Promise<TwoFactorSetup>;
    enable(userId: string, code: string): Promise<{
        message: string;
    }>;
    disable(userId: string, code: string): Promise<{
        message: string;
    }>;
    verifyCode(userId: string, code: string): Promise<boolean>;
    isTwoFactorEnabled(email: string): Promise<boolean>;
    verifyCodeByEmail(email: string, code: string): Promise<boolean>;
    getStatus(userId: string): Promise<{
        enabled: boolean;
    }>;
}
