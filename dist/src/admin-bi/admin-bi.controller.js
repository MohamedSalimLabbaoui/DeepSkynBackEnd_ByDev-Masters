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
exports.AdminBiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const admin_bi_service_1 = require("./admin-bi.service");
let AdminBiController = class AdminBiController {
    constructor(adminBiService) {
        this.adminBiService = adminBiService;
    }
    async getDashboard() {
        return this.adminBiService.getDashboardData();
    }
};
exports.AdminBiController = AdminBiController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({
        summary: 'Advanced BI dashboard data',
        description: 'Returns aggregated business metrics for the admin BI dashboard.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'BI dashboard payload returned' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminBiController.prototype, "getDashboard", null);
exports.AdminBiController = AdminBiController = __decorate([
    (0, swagger_1.ApiTags)('Admin BI'),
    (0, common_1.Controller)('admin-bi'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'ADMIN', 'realm-admin', 'super_admin', 'administrator'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [admin_bi_service_1.AdminBiService])
], AdminBiController);
//# sourceMappingURL=admin-bi.controller.js.map