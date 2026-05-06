"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCouponDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_coupon_dto_1 = require("./create-coupon.dto");
class UpdateCouponDto extends (0, swagger_1.PartialType)(create_coupon_dto_1.CreateCouponDto) {
}
exports.UpdateCouponDto = UpdateCouponDto;
//# sourceMappingURL=update-coupon.dto.js.map