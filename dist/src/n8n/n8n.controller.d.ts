import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ProcessReclamationDto } from './dto/process-reclamation.dto';
import { N8nService } from './n8n.service';
export declare class N8nController {
    private readonly n8nService;
    constructor(n8nService: N8nService);
    triggerReclamation(payload: CreateReclamationDto): Promise<any>;
    sendProcessedReclamationMail(payload: ProcessReclamationDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
