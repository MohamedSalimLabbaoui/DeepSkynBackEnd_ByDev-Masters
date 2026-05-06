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
exports.CreateAnalysisDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateAnalysisDto {
}
exports.CreateAnalysisDto = CreateAnalysisDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'URLs des images de peau à analyser (max 5)',
        type: [String],
        example: ['https://storage.supabase.co/deepskyn-images/face1.jpg'],
        maxItems: 5,
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUrl)({}, { each: true, message: 'Each image must be a valid URL' }),
    (0, class_validator_1.ArrayMaxSize)(5, { message: 'Maximum 5 images allowed' }),
    __metadata("design:type", Array)
], CreateAnalysisDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Questionnaire de pré-analyse (habitudes, préférences)',
        example: { age: 28, hasAllergies: false, skinRoutine: 'basic' },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAnalysisDto.prototype, "questionnaire", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Zones du visage qui preoccupent le plus l utilisateur',
        type: [String],
        example: ['nez', 'joues', 'autour_bouche'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateAnalysisDto.prototype, "preocupent", void 0);
//# sourceMappingURL=create-analysis.dto.js.map