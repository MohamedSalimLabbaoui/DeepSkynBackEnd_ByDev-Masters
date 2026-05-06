"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var N8nService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const mail_service_1 = require("../mail/mail.service");
let N8nService = N8nService_1 = class N8nService {
    constructor(configService, mailService) {
        this.configService = configService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(N8nService_1.name);
    }
    getReclamationWebhookUrls() {
        const directWebhookUrl = this.configService.get('N8N_RECLAMATION_WEBHOOK_URL');
        if (directWebhookUrl) {
            return [directWebhookUrl];
        }
        const n8nBaseUrl = this.configService.get('N8N_BASE_URL');
        if (!n8nBaseUrl) {
            return [
                'https://mohamedazizsaid.app.n8n.cloud/webhook/reclamation-deepskyn',
            ];
        }
        const base = n8nBaseUrl.replace(/\/$/, '');
        return [
            `${base}/webhook/reclamation-deepskyn`,
            `${base}/webhook-test/reclamation-deepskyn`,
        ];
    }
    async triggerReclamationWorkflow(payload) {
        const webhookUrls = this.getReclamationWebhookUrls();
        let lastErrorMessage = 'unknown';
        const webhookPayload = {
            ...payload,
            body: payload,
        };
        for (const webhookUrl of webhookUrls) {
            try {
                const { data } = await axios_1.default.post(webhookUrl, webhookPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                });
                return data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const status = error.response?.status ?? 'n/a';
                    lastErrorMessage = `status=${status} message=${error.message}`;
                    this.logger.warn(`Webhook n8n indisponible sur ${webhookUrl}: ${lastErrorMessage}`);
                    if (this.configService.get('N8N_RECLAMATION_WEBHOOK_URL')) {
                        break;
                    }
                    continue;
                }
                lastErrorMessage = 'unexpected error';
                this.logger.error('Echec appel webhook n8n', error);
            }
        }
        throw new common_1.BadGatewayException(`Impossible de declencher le workflow de reclamation pour le moment (${lastErrorMessage}).`);
    }
    async sendProcessedReclamationEmail(payload) {
        const userName = payload.nom?.trim() || 'utilisateur';
        await this.mailService.sendReclamationProcessedEmail(payload.email, userName);
        return {
            success: true,
            message: 'Email de traitement reclamation envoye.',
        };
    }
};
exports.N8nService = N8nService;
exports.N8nService = N8nService = N8nService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mail_service_1.MailService])
], N8nService);
//# sourceMappingURL=n8n.service.js.map