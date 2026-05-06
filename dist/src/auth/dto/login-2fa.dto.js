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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login2faDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class Login2faDto {
}
exports.Login2faDto = Login2faDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Nom d'utilisateur Keycloak",
        example: 'john.doe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Username is required' }),
    __metadata("design:type", String)
], Login2faDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Mot de passe (minimum 4 caractères)',
        example: 'password123',
        minLength: 4,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password is required' }),
    (0, class_validator_1.MinLength)(4, { message: 'Password must be at least 4 characters' }),
    __metadata("design:type", String)
], Login2faDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Code TOTP à 6 chiffres (requis si le 2FA est activé)',
        example: '123456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Le code 2FA doit contenir exactement 6 chiffres' }),
    __metadata("design:type", String)
], Login2faDto.prototype, "twoFactorCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Token de vérification reCAPTCHA',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Login2faDto.prototype, "captchaToken", void 0);
//# sourceMappingURL=login-2fa.dto.js.map