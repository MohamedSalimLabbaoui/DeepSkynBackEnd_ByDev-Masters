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
exports.RecommendProductDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RecommendProductDto {
}
exports.RecommendProductDto = RecommendProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Nom de l'étape de routine (ex: Nettoyant, Sérum)",
        example: 'Sérum Vitamine C',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecommendProductDto.prototype, "stepName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Catégorie du step (cleanser, serum, moisturizer, etc.)',
        example: 'serum',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecommendProductDto.prototype, "stepCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description optionnelle du step',
        required: false,
        example: 'Protection antioxydante',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecommendProductDto.prototype, "stepDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Type de peau de l'utilisateur",
        required: false,
        example: 'combination',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecommendProductDto.prototype, "skinType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Préoccupations cutanées séparées par virgule',
        required: false,
        example: 'acne,hyperpigmentation',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecommendProductDto.prototype, "concerns", void 0);
//# sourceMappingURL=recommend-product.dto.js.map