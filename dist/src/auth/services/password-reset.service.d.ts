import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
export declare class PasswordResetService {
    private readonly prisma;
    private readonly mailService;
    private readonly logger;
    private readonly RESET_TOKEN_EXPIRY_HOURS;
    constructor(prisma: PrismaService, mailService: MailService);
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    validateResetToken(token: string): Promise<{
        valid: boolean;
        email?: string;
    }>;
}
