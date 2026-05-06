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
exports.AdviseRoutineDto = exports.ChangeType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ChangeType;
(function (ChangeType) {
    ChangeType["REORDER"] = "reorder";
    ChangeType["ADD_STEP"] = "add_step";
    ChangeType["REMOVE_STEP"] = "remove_step";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
class AdviseRoutineDto {
}
exports.AdviseRoutineDto = AdviseRoutineDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of change made to the routine',
        enum: ChangeType,
        example: 'reorder',
    }),
    (0, class_validator_1.IsEnum)(ChangeType),
    __metadata("design:type", String)
], AdviseRoutineDto.prototype, "changeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current steps after the change (name list)',
        type: [String],
        example: ['Cleanser', 'Vitamin C Serum', 'SPF'],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AdviseRoutineDto.prototype, "currentSteps", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Description of the change made',
        example: 'Moved Vitamin C before SPF',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdviseRoutineDto.prototype, "changeDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Name of the step that was added',
        example: 'Niacinamide Serum',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdviseRoutineDto.prototype, "addedStepName", void 0);
//# sourceMappingURL=advise-routine.dto.js.map