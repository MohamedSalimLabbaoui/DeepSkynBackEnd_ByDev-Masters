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
exports.CreateRoutineDto = exports.RoutineStepDto = exports.RoutineType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var RoutineType;
(function (RoutineType) {
    RoutineType["AM"] = "AM";
    RoutineType["PM"] = "PM";
    RoutineType["WEEKLY"] = "weekly";
})(RoutineType || (exports.RoutineType = RoutineType = {}));
class RoutineStepDto {
}
exports.RoutineStepDto = RoutineStepDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Ordre de l'étape dans la routine",
        example: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RoutineStepDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Nom de l'étape",
        example: 'Nettoyage',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nom du produit',
        example: 'CeraVe Hydrating Cleanser',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Marque du produit',
        example: 'CeraVe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "productBrand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "URL de l'image du produit",
        example: 'https://example.com/product.jpg',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "productImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Description de l'étape",
        example: 'Appliquer sur peau humide et masser doucement',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Durée de l'étape en secondes",
        example: 60,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], RoutineStepDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Catégorie du produit',
        example: 'cleanser',
        enum: [
            'cleanser',
            'toner',
            'serum',
            'moisturizer',
            'sunscreen',
            'treatment',
            'mask',
        ],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RoutineStepDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Étape complétée ou non',
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], RoutineStepDto.prototype, "isCompleted", void 0);
class CreateRoutineDto {
}
exports.CreateRoutineDto = CreateRoutineDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nom de la routine',
        example: 'Ma routine matinale',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRoutineDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type de routine',
        enum: RoutineType,
        example: 'AM',
    }),
    (0, class_validator_1.IsEnum)(RoutineType),
    __metadata("design:type", String)
], CreateRoutineDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Liste des étapes de la routine',
        type: [RoutineStepDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RoutineStepDto),
    __metadata("design:type", Array)
], CreateRoutineDto.prototype, "steps", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes personnelles sur la routine',
        example: 'Routine adaptée pour peau sensible',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRoutineDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Routine active ou non',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateRoutineDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-routine.dto.js.map