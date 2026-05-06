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
exports.ChurnController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const churn_service_1 = require("./churn.service");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let ChurnController = class ChurnController {
    constructor(churnService) {
        this.churnService = churnService;
    }
    async getStats() {
        return this.churnService.getChurnStats();
    }
    async analyzeAll() {
        const result = await this.churnService.analyzeAllUsers();
        return {
            message: 'Analyse de churn terminée',
            totalUsers: result.totalUsers,
            atRiskCount: result.atRiskCount,
            criticalCount: result.criticalCount,
        };
    }
    async getAtRiskUsers(limit) {
        const numLimit = limit ? parseInt(limit, 10) : 20;
        return this.churnService.getAtRiskUsers(numLimit);
    }
    async predictUser(userId) {
        const result = await this.churnService.predictSingleUser(userId);
        if (!result) {
            return { error: 'Utilisateur non trouvé' };
        }
        return result;
    }
    async sendEmails() {
        const result = await this.churnService.sendReEngagementEmails();
        return {
            message: 'Envoi des emails de re-engagement terminé',
            ...result,
        };
    }
};
exports.ChurnController = ChurnController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Dashboard churn',
        description: 'Statistiques globales du churn (admin uniquement)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistiques retournées' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChurnController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('analyze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: "Lancer l'analyse de churn",
        description: 'Analyse tous les utilisateurs actifs et met à jour les scores de risque (admin uniquement)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Analyse terminée' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChurnController.prototype, "analyzeAll", null);
__decorate([
    (0, common_1.Get)('at-risk'),
    (0, swagger_1.ApiOperation)({
        summary: 'Utilisateurs à risque',
        description: 'Liste des utilisateurs avec un risque de churn élevé ou critique',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Nombre max de résultats (défaut: 20)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des utilisateurs à risque' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChurnController.prototype, "getAtRiskUsers", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: "Risque de churn d'un utilisateur",
        description: 'Analyse le risque de churn pour un utilisateur spécifique',
    }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: "ID de l'utilisateur" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Prédiction retournée' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Utilisateur non trouvé' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChurnController.prototype, "predictUser", null);
__decorate([
    (0, common_1.Post)('send-emails'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Envoyer les emails de re-engagement',
        description: 'Envoie manuellement les emails de re-engagement aux utilisateurs à risque (admin uniquement)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Résultat de l'envoi" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChurnController.prototype, "sendEmails", null);
exports.ChurnController = ChurnController = __decorate([
    (0, swagger_1.ApiTags)('Churn Prediction'),
    (0, common_1.Controller)('churn'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [churn_service_1.ChurnService])
], ChurnController);
//# sourceMappingURL=churn.controller.js.map