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
exports.GetUserRoutinesQueryDto = exports.UpdateRoutineStatusDto = exports.PredictiveRoutineStatus = void 0;
const class_validator_1 = require("class-validator");
var PredictiveRoutineStatus;
(function (PredictiveRoutineStatus) {
    PredictiveRoutineStatus["PENDING"] = "PENDING";
    PredictiveRoutineStatus["VIEWED"] = "VIEWED";
    PredictiveRoutineStatus["ACCEPTED"] = "ACCEPTED";
    PredictiveRoutineStatus["DISMISSED"] = "DISMISSED";
    PredictiveRoutineStatus["IMPLEMENTED"] = "IMPLEMENTED";
    PredictiveRoutineStatus["EXPIRED"] = "EXPIRED";
})(PredictiveRoutineStatus || (exports.PredictiveRoutineStatus = PredictiveRoutineStatus = {}));
class UpdateRoutineStatusDto {
}
exports.UpdateRoutineStatusDto = UpdateRoutineStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(PredictiveRoutineStatus),
    __metadata("design:type", String)
], UpdateRoutineStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateRoutineStatusDto.prototype, "feedback", void 0);
class GetUserRoutinesQueryDto {
    constructor() {
        this.includeExpired = false;
    }
}
exports.GetUserRoutinesQueryDto = GetUserRoutinesQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PredictiveRoutineStatus),
    __metadata("design:type", String)
], GetUserRoutinesQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GetUserRoutinesQueryDto.prototype, "includeExpired", void 0);
//# sourceMappingURL=routine-status.dto.js.map