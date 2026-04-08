import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ProcessReclamationDto } from './dto/process-reclamation.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class N8nService {
	private readonly logger = new Logger(N8nService.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly mailService: MailService,
	) {}

	private getReclamationWebhookUrls(): string[] {
		const directWebhookUrl = this.configService.get<string>(
			'N8N_RECLAMATION_WEBHOOK_URL',
		);

		if (directWebhookUrl) {
			return [directWebhookUrl];
		}

		const n8nBaseUrl = this.configService.get<string>('N8N_BASE_URL');

		if (!n8nBaseUrl) {
			return [
				'https://mohamedazizsaid.app.n8n.cloud/webhook/reclamation-deepskyn',
			];
		}

		const base = n8nBaseUrl.replace(/\/$/, '');

		// Try production webhook first, then test webhook for inactive workflows.
		return [
			`${base}/webhook/reclamation-deepskyn`,
			`${base}/webhook-test/reclamation-deepskyn`,
		];
	}

	async triggerReclamationWorkflow(payload: CreateReclamationDto) {
		const webhookUrls = this.getReclamationWebhookUrls();
		let lastErrorMessage = 'unknown';
		const webhookPayload = {
			...payload,
			body: payload,
		};

		for (const webhookUrl of webhookUrls) {
			try {
				const { data } = await axios.post(
					webhookUrl,
					webhookPayload,
					{
						headers: {
							'Content-Type': 'application/json',
						},
						timeout: 10000,
					},
				);

				return data;
			} catch (error) {
				if (axios.isAxiosError(error)) {
					const status = error.response?.status ?? 'n/a';
					lastErrorMessage = `status=${status} message=${error.message}`;
					this.logger.warn(
						`Webhook n8n indisponible sur ${webhookUrl}: ${lastErrorMessage}`,
					);

					// If the URL is explicitly configured, do not try a fallback URL.
					if (
						this.configService.get<string>('N8N_RECLAMATION_WEBHOOK_URL')
					) {
						break;
					}
					continue;
				}

				lastErrorMessage = 'unexpected error';
				this.logger.error('Echec appel webhook n8n', error as Error);
			}
		}

		throw new BadGatewayException(
			`Impossible de declencher le workflow de reclamation pour le moment (${lastErrorMessage}).`,
		);
	}

	async sendProcessedReclamationEmail(payload: ProcessReclamationDto) {
		const userName = payload.nom?.trim() || 'utilisateur';

		await this.mailService.sendReclamationProcessedEmail(payload.email, userName);

		return {
			success: true,
			message: 'Email de traitement reclamation envoye.',
		};
	}
}
