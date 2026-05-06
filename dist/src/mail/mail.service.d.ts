import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendPasswordResetEmail(to: string, userName: string, resetToken: string): Promise<void>;
    sendPasswordChangedEmail(to: string, userName: string): Promise<void>;
    sendReEngagementEmail(to: string, userName: string, riskLevel: 'high' | 'critical'): Promise<void>;
    sendSignupVerificationCode(to: string, userName: string, code: string, expiresInMinutes: number): Promise<void>;
    sendReclamationProcessedEmail(to: string, userName: string): Promise<void>;
    private getPasswordResetTemplate;
    private getSignupVerificationTemplate;
    private getPasswordChangedTemplate;
    private getReEngagementTemplate;
    private getReclamationProcessedTemplate;
}
