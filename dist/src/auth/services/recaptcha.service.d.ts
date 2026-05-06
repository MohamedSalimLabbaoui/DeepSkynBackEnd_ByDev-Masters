import { ConfigService } from '@nestjs/config';
export declare class RecaptchaService {
    private readonly configService;
    private readonly logger;
    private readonly secretKey;
    constructor(configService: ConfigService);
    verify(captchaToken: string): Promise<boolean>;
}
