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
exports.CouponsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const coupons_service_1 = require("./coupons.service");
const dto_1 = require("./dto");
let CouponsController = class CouponsController {
    constructor(couponsService) {
        this.couponsService = couponsService;
    }
    async validateCoupon(userId, dto) {
        return this.couponsService.validateCouponForCheckout(userId, dto.couponCode, dto.planCode);
    }
    async adminListCoupons() {
        return this.couponsService.adminListCoupons();
    }
    async adminCreateCoupon(dto) {
        return this.couponsService.adminCreateCoupon(dto);
    }
    async adminUpdateCoupon(id, dto) {
        return this.couponsService.adminUpdateCoupon(id, dto);
    }
    async adminDeleteCoupon(id) {
        return this.couponsService.adminDeleteCoupon(id);
    }
};
exports.CouponsController = CouponsController;
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ValidateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "validateCoupon", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "adminListCoupons", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "adminCreateCoupon", null);
__decorate([
    (0, common_1.Patch)('admin/:id'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "adminUpdateCoupon", null);
__decorate([
    (0, common_1.Delete)('admin/:id'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "adminDeleteCoupon", null);
exports.CouponsController = CouponsController = __decorate([
    (0, swagger_1.ApiTags)('Coupons'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('coupons'),
    __metadata("design:paramtypes", [coupons_service_1.CouponsService])
], CouponsController);
//# sourceMappingURL=coupons.controller.js.map