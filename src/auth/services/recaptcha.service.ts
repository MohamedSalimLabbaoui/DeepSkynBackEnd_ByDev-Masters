import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
    private readonly logger = new Logger(RecaptchaService.name);
    private readonly secretKey: string;

    constructor(private readonly configService: ConfigService) {
        this.secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    }

    async verify(captchaToken: string): Promise<boolean> {
        if (!captchaToken) {
            throw new BadRequestException('Captcha token is required');
        }

        try {
            const response = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify`,
                null,
                {
                    params: {
                        secret: this.secretKey,
                        response: captchaToken,
                    },
                },
            );

            const { success, 'error-codes': errorCodes } = response.data;

            if (!success) {
                this.logger.warn(`Recaptcha verification failed: ${errorCodes}`);
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Recaptcha verification error', error);
            return false;
        }
    }
}
