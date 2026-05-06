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
exports.DigitalTwinController = void 0;
const common_1 = require("@nestjs/common");
const digital_twin_service_1 = require("./digital-twin.service");
const twin_dto_1 = require("./dto/twin.dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
let DigitalTwinController = class DigitalTwinController {
    constructor(twinService) {
        this.twinService = twinService;
    }
    async getTwin(req) {
        return this.twinService.getTwinState(req.user.userId);
    }
    async captureSnapshot(req, dto) {
        return this.twinService.captureSnapshot(req.user.userId, dto);
    }
    async getSnapshots(req, limit) {
        const limitNum = limit ? parseInt(limit, 10) : 30;
        return this.twinService.getSnapshots(req.user.userId, limitNum);
    }
    async compareSnapshots(req, id1, id2) {
        return this.twinService.compareSnapshots(req.user.userId, id1, id2);
    }
    async predictFuture(req, query) {
        const daysAhead = query.daysAhead || 7;
        return this.twinService.predictFuture(req.user.userId, daysAhead);
    }
    async simulateProduct(req, dto) {
        return this.twinService.simulateProduct(req.user.userId, dto);
    }
    async updateSimulation(req, id, dto) {
        return this.twinService.updateSimulation(req.user.userId, id, dto);
    }
    async syncTwin(req) {
        await this.twinService.updateTwinFromSnapshot(req.user.userId);
        return { message: 'Digital Twin synchronized successfully' };
    }
};
exports.DigitalTwinController = DigitalTwinController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "getTwin", null);
__decorate([
    (0, common_1.Post)('snapshot'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, twin_dto_1.CreateSnapshotDto]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "captureSnapshot", null);
__decorate([
    (0, common_1.Get)('snapshots'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "getSnapshots", null);
__decorate([
    (0, common_1.Get)('snapshots/compare'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('id1')),
    __param(2, (0, common_1.Query)('id2')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "compareSnapshots", null);
__decorate([
    (0, common_1.Get)('predict'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, twin_dto_1.GetPredictionDto]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "predictFuture", null);
__decorate([
    (0, common_1.Post)('simulate-product'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, twin_dto_1.SimulateProductDto]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "simulateProduct", null);
__decorate([
    (0, common_1.Patch)('simulations/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, twin_dto_1.UpdateSimulationDto]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "updateSimulation", null);
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinController.prototype, "syncTwin", null);
exports.DigitalTwinController = DigitalTwinController = __decorate([
    (0, common_1.Controller)('digital-twin'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [digital_twin_service_1.DigitalTwinService])
], DigitalTwinController);
//# sourceMappingURL=digital-twin.controller.js.map