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
exports.ShareRoutineDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ShareRoutineDto {
}
exports.ShareRoutineDto = ShareRoutineDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "ID de la routine à partager (peut être obtenu du paramètre d'URL)",
        example: 'uuid-of-routine',
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ShareRoutineDto.prototype, "routineId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Message personnalisé à ajouter au post',
        example: 'Voici ma routine du matin! 💕',
        maxLength: 1000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ShareRoutineDto.prototype, "customMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Image de couverture pour le post',
        example: 'https://example.com/image.jpg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShareRoutineDto.prototype, "coverImage", void 0);
//# sourceMappingURL=share-routine.dto.js.map