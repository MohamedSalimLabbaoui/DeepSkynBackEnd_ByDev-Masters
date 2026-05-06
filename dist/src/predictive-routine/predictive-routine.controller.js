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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveRoutineController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const predictive_routine_service_1 = require("./predictive-routine.service");
const routine_status_dto_1 = require("./dto/routine-status.dto");
class AnalysisResultDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalysisResultDto.prototype, "condition", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AnalysisResultDto.prototype, "detectedIssues", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalysisResultDto.prototype, "skinType", void 0);
class GenerateRoutineDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateRoutineDto.prototype, "analysisId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AnalysisResultDto),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", AnalysisResultDto)
], GenerateRoutineDto.prototype, "analysisResult", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], GenerateRoutineDto.prototype, "latitude", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], GenerateRoutineDto.prototype, "longitude", void 0);
let PredictiveRoutineController = class PredictiveRoutineController {
    constructor(service) {
        this.service = service;
    }
    async generateRoutine(userId, dto) {
        return this.service.generatePredictiveRoutine(userId, dto.analysisId, dto.analysisResult, dto.latitude, dto.longitude);
    }
    async validateRoutine(userId, routineId) {
        return this.service.validateAndActivateRoutine(userId, routineId);
    }
    async getPendingRoutines(userId) {
        return this.service.getPendingRoutines(userId);
    }
    async getUserRoutines(userId, query) {
        return this.service.getUserRoutines(userId, query.status, query.includeExpired);
    }
    async updateRoutineStatus(userId, routineId, dto) {
        return this.service.updateRoutineStatus(userId, routineId, dto);
    }
    async markAsViewed(userId, routineId) {
        return this.service.markAsViewed(userId, routineId);
    }
    async acceptRoutine(userId, routineId, implement = false) {
        return this.service.acceptRoutine(userId, routineId, implement);
    }
    async dismissRoutine(userId, routineId) {
        return this.service.dismissRoutine(userId, routineId);
    }
};
exports.PredictiveRoutineController = PredictiveRoutineController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GenerateRoutineDto]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "generateRoutine", null);
__decorate([
    (0, common_1.Post)(':id/validate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "validateRoutine", null);
__decorate([
    (0, common_1.Get)('pending'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "getPendingRoutines", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, routine_status_dto_1.GetUserRoutinesQueryDto]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "getUserRoutines", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, routine_status_dto_1.UpdateRoutineStatusDto]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "updateRoutineStatus", null);
__decorate([
    (0, common_1.Post)(':id/view'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "markAsViewed", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('implement')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "acceptRoutine", null);
__decorate([
    (0, common_1.Post)(':id/dismiss'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PredictiveRoutineController.prototype, "dismissRoutine", null);
exports.PredictiveRoutineController = PredictiveRoutineController = __decorate([
    (0, common_1.Controller)('predictive-routine'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [predictive_routine_service_1.PredictiveRoutineService])
], PredictiveRoutineController);
//# sourceMappingURL=predictive-routine.controller.js.map