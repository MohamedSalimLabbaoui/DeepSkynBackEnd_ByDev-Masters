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
exports.UpdateSkinProfileDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateSkinProfileDto {
}
exports.UpdateSkinProfileDto = UpdateSkinProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type de peau',
        enum: ['dry', 'oily', 'combination', 'normal', 'sensitive'],
        example: 'oily',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['dry', 'oily', 'combination', 'normal', 'sensitive'], {
        message: 'Skin type must be one of: dry, oily, combination, normal, sensitive',
    }),
    __metadata("design:type", String)
], UpdateSkinProfileDto.prototype, "skinType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type de peau Fitzpatrick (1-6)',
        minimum: 1,
        maximum: 6,
        example: 4,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Fitzpatrick type must be between 1 and 6' }),
    (0, class_validator_1.Max)(6, { message: 'Fitzpatrick type must be between 1 and 6' }),
    __metadata("design:type", Number)
], UpdateSkinProfileDto.prototype, "fitzpatrickType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Liste des préoccupations cutanées',
        type: [String],
        example: ['redness', 'dryness'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateSkinProfileDto.prototype, "concerns", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Liste des sensibilités',
        type: [String],
        example: ['retinol'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateSkinProfileDto.prototype, "sensitivities", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Âge de la peau estimé',
        minimum: 0,
        maximum: 150,
        example: 32,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(150),
    __metadata("design:type", Number)
], UpdateSkinProfileDto.prototype, "skinAge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Score de santé de la peau (0-100)',
        minimum: 0,
        maximum: 100,
        example: 82,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'Health score must be between 0 and 100' }),
    (0, class_validator_1.Max)(100, { message: 'Health score must be between 0 and 100' }),
    __metadata("design:type", Number)
], UpdateSkinProfileDto.prototype, "healthScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Date de la dernière analyse',
        example: '2026-02-04T14:30:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSkinProfileDto.prototype, "lastAnalysisAt", void 0);
//# sourceMappingURL=update-skin-profile.dto.js.map