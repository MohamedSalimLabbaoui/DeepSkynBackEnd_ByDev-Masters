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
exports.ContextualAnalysisController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contextual_analysis_service_1 = require("./contextual-analysis.service");
const dto_1 = require("./dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ContextualAnalysisController = class ContextualAnalysisController {
    constructor(contextualAnalysisService) {
        this.contextualAnalysisService = contextualAnalysisService;
    }
    async getWeatherAlert(userId, query) {
        return this.contextualAnalysisService.getWeatherAlert(userId, query);
    }
    async getUnreadAlerts(userId) {
        return this.contextualAnalysisService.getUnreadAlerts(userId);
    }
    async getAllAlerts(userId, page, limit) {
        return this.contextualAnalysisService.getAllAlerts(userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
    }
    async markAlertAsRead(alertId, userId) {
        return this.contextualAnalysisService.markAlertAsRead(alertId, userId);
    }
    async markAllAlertsAsRead(userId) {
        return this.contextualAnalysisService.markAllAlertsAsRead(userId);
    }
    async getSeasonalPrediction(userId) {
        return this.contextualAnalysisService.getSeasonalPrediction(userId);
    }
    async createSkinLog(userId, dto) {
        return this.contextualAnalysisService.createSkinLog(userId, dto);
    }
    async getSkinLogs(userId, days) {
        return this.contextualAnalysisService.getSkinLogs(userId, days ? Number(days) : 30);
    }
};
exports.ContextualAnalysisController = ContextualAnalysisController;
__decorate([
    (0, common_1.Get)('weather-alert'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir une alerte météo pour la peau',
        description: "Récupère les données météo (UV, qualité de l'air) et génère une alerte personnalisée pour la peau si nécessaire",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Alerte météo générée avec succès',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.WeatherAlertQueryDto]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "getWeatherAlert", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les alertes non lues',
        description: "Récupère toutes les alertes non lues de l'utilisateur",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Liste des alertes non lues',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "getUnreadAlerts", null);
__decorate([
    (0, common_1.Get)('alerts/all'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir toutes les alertes',
        description: "Récupère toutes les alertes de l'utilisateur avec pagination",
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Liste paginée des alertes',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "getAllAlerts", null);
__decorate([
    (0, common_1.Patch)('alerts/:id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Marquer une alerte comme lue',
        description: 'Marque une alerte spécifique comme lue',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Alerte marquée comme lue',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Alerte non trouvée',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "markAlertAsRead", null);
__decorate([
    (0, common_1.Patch)('alerts/read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Marquer toutes les alertes comme lues',
        description: "Marque toutes les alertes non lues de l'utilisateur comme lues",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Toutes les alertes marquées comme lues',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "markAllAlertsAsRead", null);
__decorate([
    (0, common_1.Get)('seasonal-prediction'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir la prédiction saisonnière',
        description: "Analyse les patterns saisonniers de la peau et génère une prédiction basée sur l'historique",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Prédiction saisonnière générée',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "getSeasonalPrediction", null);
__decorate([
    (0, common_1.Post)('skin-log'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Logger la condition de peau du jour',
        description: 'Enregistre le score de condition de peau et les notes pour construire les patterns saisonniers',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Log créé avec succès',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateSkinLogDto]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "createSkinLog", null);
__decorate([
    (0, common_1.Get)('skin-logs'),
    (0, swagger_1.ApiOperation)({
        summary: "Obtenir l'historique des logs de peau",
        description: 'Récupère les logs de condition de peau des X derniers jours',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'days',
        required: false,
        type: Number,
        description: 'Nombre de jours (défaut: 30)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Historique des logs',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ContextualAnalysisController.prototype, "getSkinLogs", null);
exports.ContextualAnalysisController = ContextualAnalysisController = __decorate([
    (0, swagger_1.ApiTags)('Contextual Analysis'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('contextual-analysis'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [contextual_analysis_service_1.ContextualAnalysisService])
], ContextualAnalysisController);
//# sourceMappingURL=contextual-analysis.controller.js.map