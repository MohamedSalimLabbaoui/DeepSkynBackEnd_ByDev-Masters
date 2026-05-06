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
exports.RoutineController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const routine_service_1 = require("./routine.service");
const dto_1 = require("./dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let RoutineController = class RoutineController {
    constructor(routineService) {
        this.routineService = routineService;
    }
    async create(userId, createRoutineDto) {
        return this.routineService.create(userId, createRoutineDto);
    }
    async generateWithAI(userId, generateRoutineDto) {
        return this.routineService.generateWithAI(userId, generateRoutineDto);
    }
    async findAll(userId, type, isActive, isAIGenerated) {
        return this.routineService.findAllByUser(userId, {
            type,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            isAIGenerated: isAIGenerated !== undefined ? isAIGenerated === 'true' : undefined,
        });
    }
    async getStatistics(userId) {
        return this.routineService.getStatistics(userId);
    }
    async recommendProduct(userId, dto) {
        return this.routineService.recommendProductForStep(userId, dto);
    }
    async getActiveByType(userId, type) {
        return this.routineService.findAllByUser(userId, {
            type,
            isActive: true,
        });
    }
    async findOne(id, userId) {
        return this.routineService.findOne(id, userId);
    }
    async update(id, userId, updateRoutineDto) {
        return this.routineService.update(id, userId, updateRoutineDto);
    }
    async toggleActive(id, userId) {
        return this.routineService.toggleActive(id, userId);
    }
    async completeStep(id, stepOrder, userId, isCompleted) {
        return this.routineService.updateStepCompletion(id, userId, parseInt(stepOrder, 10), isCompleted);
    }
    async resetSteps(id, userId) {
        return this.routineService.resetStepsCompletion(id, userId);
    }
    async addStep(id, userId, step) {
        return this.routineService.addStep(id, userId, step);
    }
    async removeStep(id, stepOrder, userId) {
        return this.routineService.removeStep(id, userId, parseInt(stepOrder, 10));
    }
    async reorderSteps(id, userId, newOrder) {
        return this.routineService.reorderSteps(id, userId, newOrder);
    }
    async adviseOnChange(id, userId, adviseDto) {
        return this.routineService.adviseOnChange(userId, id, adviseDto);
    }
    async duplicate(id, userId, newName) {
        return this.routineService.duplicate(id, userId, newName);
    }
    async shareRoutine(id, userId, shareDto) {
        return this.routineService.shareAsPost(id, userId, shareDto);
    }
    async findByUser(userId) {
        return this.routineService.findAllByUser(userId, { isActive: true });
    }
    async remove(id, userId) {
        return this.routineService.remove(id, userId);
    }
};
exports.RoutineController = RoutineController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer une routine manuelle',
        description: 'Crée une nouvelle routine de soins personnalisée',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Routine créée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateRoutineDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer routine avec IA',
        description: "Génère une routine personnalisée avec l'IA Gemini",
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Routine générée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Paramètres invalides' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.GenerateRoutineDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "generateWithAI", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Mes routines',
        description: "Récupère toutes les routines de l'utilisateur",
    }),
    (0, swagger_1.ApiQuery)({ name: 'type', enum: ['AM', 'PM', 'weekly'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', type: 'boolean', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isAIGenerated', type: 'boolean', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des routines' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('isActive')),
    __param(3, (0, common_1.Query)('isAIGenerated')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({
        summary: 'Statistiques routines',
        description: 'Récupère les statistiques des routines',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistiques retournées' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Post)('recommend-product'),
    (0, swagger_1.ApiOperation)({
        summary: 'Recommander un produit pour un step',
        description: "Utilise l'IA et les articles crawlés pour recommander un produit spécifique pour une étape de routine, et génère un QR code d'achat.",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Produit recommandé avec QR code' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.RecommendProductDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "recommendProduct", null);
__decorate([
    (0, common_1.Get)('active/:type'),
    (0, swagger_1.ApiOperation)({
        summary: 'Routines actives par type',
        description: "Récupère les routines actives d'un type spécifique",
    }),
    (0, swagger_1.ApiParam)({ name: 'type', enum: ['AM', 'PM', 'weekly'] }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Routines actives retournées' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "getActiveByType", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Détail routine',
        description: 'Récupère une routine spécifique',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la routine' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Routine trouvée' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Routine non trouvée' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateRoutineDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "toggleActive", null);
__decorate([
    (0, common_1.Patch)(':id/steps/:stepOrder/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('stepOrder')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(3, (0, common_1.Body)('isCompleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "completeStep", null);
__decorate([
    (0, common_1.Post)(':id/reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "resetSteps", null);
__decorate([
    (0, common_1.Post)(':id/steps'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "addStep", null);
__decorate([
    (0, common_1.Delete)(':id/steps/:stepOrder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('stepOrder')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "removeStep", null);
__decorate([
    (0, common_1.Patch)(':id/reorder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)('newOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "reorderSteps", null);
__decorate([
    (0, common_1.Post)(':id/advise'),
    (0, swagger_1.ApiOperation)({
        summary: 'Avis IA sur modification',
        description: "Obtient un avis expert de l'IA sur une modification de routine",
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la routine' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Avis IA retourné' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.AdviseRoutineDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "adviseOnChange", null);
__decorate([
    (0, common_1.Post)(':id/duplicate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "duplicate", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    (0, swagger_1.ApiOperation)({
        summary: 'Partager une routine',
        description: 'Partage une routine comme un post social',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la routine' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Routine partagée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Routine non trouvée' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.ShareRoutineDto]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "shareRoutine", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: "Routines d'un utilisateur spécifique",
        description: "Récupère toutes les routines d'un utilisateur spécifique",
    }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoutineController.prototype, "remove", null);
exports.RoutineController = RoutineController = __decorate([
    (0, swagger_1.ApiTags)('Routines'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('routines'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [routine_service_1.RoutineService])
], RoutineController);
//# sourceMappingURL=routine.controller.js.map