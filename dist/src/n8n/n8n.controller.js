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
exports.N8nController = void 0;
const common_1 = require("@nestjs/common");
const create_reclamation_dto_1 = require("./dto/create-reclamation.dto");
const process_reclamation_dto_1 = require("./dto/process-reclamation.dto");
const n8n_service_1 = require("./n8n.service");
let N8nController = class N8nController {
    constructor(n8nService) {
        this.n8nService = n8nService;
    }
    async triggerReclamation(payload) {
        return this.n8nService.triggerReclamationWorkflow(payload);
    }
    async sendProcessedReclamationMail(payload) {
        return this.n8nService.sendProcessedReclamationEmail(payload);
    }
};
exports.N8nController = N8nController;
__decorate([
    (0, common_1.Post)('reclamation'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_reclamation_dto_1.CreateReclamationDto]),
    __metadata("design:returntype", Promise)
], N8nController.prototype, "triggerReclamation", null);
__decorate([
    (0, common_1.Post)('reclamation/processed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [process_reclamation_dto_1.ProcessReclamationDto]),
    __metadata("design:returntype", Promise)
], N8nController.prototype, "sendProcessedReclamationMail", null);
exports.N8nController = N8nController = __decorate([
    (0, common_1.Controller)('n8n'),
    __metadata("design:paramtypes", [n8n_service_1.N8nService])
], N8nController);
//# sourceMappingURL=n8n.controller.js.map