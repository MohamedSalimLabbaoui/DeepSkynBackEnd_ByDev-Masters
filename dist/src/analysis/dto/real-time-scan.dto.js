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
exports.RealTimeScanDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RealTimeScanDto {
}
exports.RealTimeScanDto = RealTimeScanDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Image encodée en Base64',
        example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RealTimeScanDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Type MIME de l'image",
        enum: ['image/jpeg', 'image/png', 'image/webp'],
        default: 'image/jpeg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['image/jpeg', 'image/png', 'image/webp'], {
        message: 'Mime type must be image/jpeg, image/png, or image/webp',
    }),
    __metadata("design:type", String)
], RealTimeScanDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Sauvegarder l'image sur Supabase",
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RealTimeScanDto.prototype, "saveImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Sauvegarder l'analyse dans la base de données",
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RealTimeScanDto.prototype, "saveAnalysis", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Zones du visage qui preoccupent le plus l utilisateur',
        type: [String],
        example: ['nez', 'joues'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RealTimeScanDto.prototype, "preocupent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Image frontale encodée en Base64',
        example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RealTimeScanDto.prototype, "frontImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Image profil gauche encodée en Base64',
        example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RealTimeScanDto.prototype, "leftImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Image profil droit encodée en Base64',
        example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RealTimeScanDto.prototype, "rightImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Résultat d'analyse déjà calculé (à fournir pour sauvegarder sans relancer Gemini)",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RealTimeScanDto.prototype, "cachedAnalysis", void 0);
//# sourceMappingURL=real-time-scan.dto.js.map