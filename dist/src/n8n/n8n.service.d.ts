import { ConfigService } from '@nestjs/config';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ProcessReclamationDto } from './dto/process-reclamation.dto';
import { MailService } from '../mail/mail.service';
export declare class N8nService {
    private readonly configService;
    private readonly mailService;
    private readonly logger;
    constructor(configService: ConfigService, mailService: MailService);
    private getReclamationWebhookUrls;
    triggerReclamationWorkflow(payload: CreateReclamationDto): Promise<any>;
    sendProcessedReclamationEmail(payload: ProcessReclamationDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
