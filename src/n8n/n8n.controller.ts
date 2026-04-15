import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ProcessReclamationDto } from './dto/process-reclamation.dto';
import { N8nService } from './n8n.service';

@Controller('n8n')
export class N8nController {
	constructor(private readonly n8nService: N8nService) {}

	@Post('reclamation')
	@HttpCode(HttpStatus.OK)
	async triggerReclamation(@Body() payload: CreateReclamationDto) {
		return this.n8nService.triggerReclamationWorkflow(payload);
	}

	@Post('reclamation/processed')
	@HttpCode(HttpStatus.OK)
	async sendProcessedReclamationMail(
		@Body() payload: ProcessReclamationDto,
	) {
		return this.n8nService.sendProcessedReclamationEmail(payload);
	}
}
