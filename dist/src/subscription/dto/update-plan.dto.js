"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePlanDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_plan_dto_1 = require("./create-plan.dto");
class UpdatePlanDto extends (0, swagger_1.PartialType)(create_plan_dto_1.CreatePlanDto) {
}
exports.UpdatePlanDto = UpdatePlanDto;
//# sourceMappingURL=update-plan.dto.js.map