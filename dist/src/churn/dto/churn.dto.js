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
exports.ChurnStatsDto = exports.ChurnReportDto = exports.ChurnPredictionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ChurnPredictionDto {
}
exports.ChurnPredictionDto = ChurnPredictionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: "ID de l'utilisateur" }),
    __metadata("design:type", String)
], ChurnPredictionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Probabilité de churn (0.0 - 1.0)',
        example: 0.85,
    }),
    __metadata("design:type", Number)
], ChurnPredictionDto.prototype, "churnProbability", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Niveau de risque',
        enum: ['low', 'medium', 'high', 'critical'],
    }),
    __metadata("design:type", String)
], ChurnPredictionDto.prototype, "riskLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Est considéré comme churné' }),
    __metadata("design:type", Boolean)
], ChurnPredictionDto.prototype, "isChurned", void 0);
class ChurnReportDto {
}
exports.ChurnReportDto = ChurnReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Total d'utilisateurs analysés" }),
    __metadata("design:type", Number)
], ChurnReportDto.prototype, "totalUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Utilisateurs à risque (high + critical)' }),
    __metadata("design:type", Number)
], ChurnReportDto.prototype, "atRiskCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Utilisateurs en risque critique' }),
    __metadata("design:type", Number)
], ChurnReportDto.prototype, "criticalCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ChurnPredictionDto] }),
    __metadata("design:type", Array)
], ChurnReportDto.prototype, "predictions", void 0);
class ChurnStatsDto {
}
exports.ChurnStatsDto = ChurnStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "totalUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "analyzedUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "lowRisk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "mediumRisk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "highRisk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "criticalRisk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChurnStatsDto.prototype, "emailsSentToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ChurnStatsDto.prototype, "lastAnalysis", void 0);
//# sourceMappingURL=churn.dto.js.map