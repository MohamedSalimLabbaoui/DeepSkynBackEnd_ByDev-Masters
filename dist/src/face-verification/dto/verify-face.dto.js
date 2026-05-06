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
exports.VerifyFaceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class VerifyFaceDto {
}
exports.VerifyFaceDto = VerifyFaceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descripteur facial (vecteur de 128 dimensions de face-api.js)',
        type: [Number],
        example: [0.1, -0.2, 0.3],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(128),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], VerifyFaceDto.prototype, "descriptor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Image encodée en Base64 (optionnel, pour stocker l'image de référence)",
        example: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyFaceDto.prototype, "imageBase64", void 0);
//# sourceMappingURL=verify-face.dto.js.map