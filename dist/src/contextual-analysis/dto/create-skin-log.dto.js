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
exports.CreateSkinLogDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateSkinLogDto {
}
exports.CreateSkinLogDto = CreateSkinLogDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Score de condition de la peau (1-10)',
        example: 7,
        minimum: 1,
        maximum: 10,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'Le score doit être au minimum 1' }),
    (0, class_validator_1.Max)(10, { message: 'Le score doit être au maximum 10' }),
    __metadata("design:type", Number)
], CreateSkinLogDto.prototype, "conditionScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes supplémentaires sur la condition de la peau',
        example: 'Légère sécheresse après exposition au soleil',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSkinLogDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Liste des problèmes de peau observés',
        example: ['dryness', 'redness'],
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateSkinLogDto.prototype, "concerns", void 0);
//# sourceMappingURL=create-skin-log.dto.js.map