import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { RequestSignupCodeDto } from '../dto/request-signup-code.dto';
export declare class SignupVerificationService {
    private readonly prisma;
    private readonly mailService;
    private readonly logger;
    private readonly CODE_TTL_MS;
    private readonly RESEND_COOLDOWN_MS;
    private readonly MAX_ATTEMPTS;
    private readonly pendingVerifications;
    constructor(prisma: PrismaService, mailService: MailService);
    requestCode(payload: RequestSignupCodeDto): Promise<{
        message: string;
        expiresInSeconds: number;
    }>;
    verifyCodeAndConsume(emailInput: string, code: string): RequestSignupCodeDto;
    private generateNumericCode;
    private hashCode;
}
