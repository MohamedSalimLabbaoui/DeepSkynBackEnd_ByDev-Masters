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
var RecaptchaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let RecaptchaService = RecaptchaService_1 = class RecaptchaService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RecaptchaService_1.name);
        this.secretKey = this.configService.get('RECAPTCHA_SECRET_KEY');
    }
    async verify(captchaToken) {
        if (!captchaToken) {
            throw new common_1.BadRequestException('Captcha token is required');
        }
        try {
            const response = await axios_1.default.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
                params: {
                    secret: this.secretKey,
                    response: captchaToken,
                },
            });
            const { success, 'error-codes': errorCodes } = response.data;
            if (!success) {
                this.logger.warn(`Recaptcha verification failed: ${errorCodes}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error('Recaptcha verification error', error);
            return false;
        }
    }
};
exports.RecaptchaService = RecaptchaService;
exports.RecaptchaService = RecaptchaService = RecaptchaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RecaptchaService);
//# sourceMappingURL=recaptcha.service.js.map