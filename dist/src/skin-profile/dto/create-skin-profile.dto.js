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
exports.CreateSkinProfileDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateSkinProfileDto {
}
exports.CreateSkinProfileDto = CreateSkinProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type de peau',
        enum: ['dry', 'oily', 'combination', 'normal', 'sensitive'],
        example: 'combination',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['dry', 'oily', 'combination', 'normal', 'sensitive'], {
        message: 'Skin type must be one of: dry, oily, combination, normal, sensitive',
    }),
    __metadata("design:type", String)
], CreateSkinProfileDto.prototype, "skinType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type de peau Fitzpatrick (1-6)',
        minimum: 1,
        maximum: 6,
        example: 3,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Fitzpatrick type must be between 1 and 6' }),
    (0, class_validator_1.Max)(6, { message: 'Fitzpatrick type must be between 1 and 6' }),
    __metadata("design:type", Number)
], CreateSkinProfileDto.prototype, "fitzpatrickType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Liste des préoccupations cutanées',
        type: [String],
        example: ['acne', 'wrinkles', 'dark_spots'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateSkinProfileDto.prototype, "concerns", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Liste des sensibilités',
        type: [String],
        example: ['fragrance', 'alcohol'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateSkinProfileDto.prototype, "sensitivities", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Âge de la peau estimé',
        minimum: 0,
        maximum: 150,
        example: 28,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(150),
    __metadata("design:type", Number)
], CreateSkinProfileDto.prototype, "skinAge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Score de santé de la peau (0-100)',
        minimum: 0,
        maximum: 100,
        example: 75,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'Health score must be between 0 and 100' }),
    (0, class_validator_1.Max)(100, { message: 'Health score must be between 0 and 100' }),
    __metadata("design:type", Number)
], CreateSkinProfileDto.prototype, "healthScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Date de la dernière analyse',
        example: '2026-02-04T10:00:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSkinProfileDto.prototype, "lastAnalysisAt", void 0);
//# sourceMappingURL=create-skin-profile.dto.js.map