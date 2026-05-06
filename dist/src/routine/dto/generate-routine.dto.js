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
exports.GenerateRoutineDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const create_routine_dto_1 = require("./create-routine.dto");
class GenerateRoutineDto {
}
exports.GenerateRoutineDto = GenerateRoutineDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type de routine à générer',
        enum: create_routine_dto_1.RoutineType,
        example: 'AM',
    }),
    (0, class_validator_1.IsEnum)(create_routine_dto_1.RoutineType),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type de peau pour personnaliser la routine',
        example: 'combination',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "skinType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Préoccupations cutanées à cibler',
        type: [String],
        example: ['acne', 'dark_spots'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateRoutineDto.prototype, "concerns", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sensibilités à prendre en compte',
        type: [String],
        example: ['fragrance', 'alcohol'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateRoutineDto.prototype, "sensitivities", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Budget pour les produits',
        enum: ['low', 'medium', 'high'],
        example: 'medium',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Marques préférées',
        example: 'CeraVe, La Roche-Posay, The Ordinary',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "preferredBrands", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Notes additionnelles pour l'IA",
        example: 'Je préfère les produits naturels',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "additionalNotes", void 0);
//# sourceMappingURL=generate-routine.dto.js.map