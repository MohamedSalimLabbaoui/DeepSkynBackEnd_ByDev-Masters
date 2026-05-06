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
exports.SkinProfileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const skin_profile_service_1 = require("./skin-profile.service");
const create_skin_profile_dto_1 = require("./dto/create-skin-profile.dto");
const update_skin_profile_dto_1 = require("./dto/update-skin-profile.dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let SkinProfileController = class SkinProfileController {
    constructor(skinProfileService, prisma) {
        this.skinProfileService = skinProfileService;
        this.prisma = prisma;
    }
    async getPrismaUserId(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_2.NotFoundException('User not found in database');
        }
        return user.id;
    }
    async create(email, createSkinProfileDto) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.create(userId, createSkinProfileDto);
    }
    async upsert(email, createSkinProfileDto) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.upsert(userId, createSkinProfileDto);
    }
    async findAll(page, limit) {
        return this.skinProfileService.findAll(page, limit);
    }
    async getStatistics() {
        return this.skinProfileService.getStatistics();
    }
    async findBySkinType(skinType) {
        return this.skinProfileService.findBySkinType(skinType);
    }
    async findByConcern(concern) {
        return this.skinProfileService.findByConcern(concern);
    }
    async findByFitzpatrickType(type) {
        return this.skinProfileService.findByFitzpatrickType(type);
    }
    async getMyProfile(email) {
        const userId = await this.getPrismaUserId(email);
        const profile = await this.skinProfileService.findByUserIdOrNull(userId);
        return profile;
    }
    async hasProfile(email) {
        const userId = await this.getPrismaUserId(email);
        const exists = await this.skinProfileService.hasProfile(userId);
        return { exists };
    }
    async getOnboardingStatus(email) {
        const userId = await this.getPrismaUserId(email);
        const hasProfile = await this.skinProfileService.hasProfile(userId);
        return {
            onboardingComplete: hasProfile,
            hasProfile,
        };
    }
    async findById(id) {
        return this.skinProfileService.findById(id);
    }
    async updateMyProfile(email, updateSkinProfileDto) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.update(userId, updateSkinProfileDto);
    }
    async updateConcerns(email, concerns) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.updateConcerns(userId, concerns);
    }
    async addConcern(email, concern) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.addConcern(userId, concern);
    }
    async removeConcern(email, concern) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.removeConcern(userId, concern);
    }
    async updateSensitivities(email, sensitivities) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.updateSensitivities(userId, sensitivities);
    }
    async addSensitivity(email, sensitivity) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.addSensitivity(userId, sensitivity);
    }
    async removeSensitivity(email, sensitivity) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.removeSensitivity(userId, sensitivity);
    }
    async updateHealthScore(email, healthScore) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.updateHealthScore(userId, healthScore);
    }
    async updateSkinAge(email, skinAge) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.updateSkinAge(userId, skinAge);
    }
    async updateLastAnalysis(email) {
        const userId = await this.getPrismaUserId(email);
        return this.skinProfileService.updateLastAnalysis(userId);
    }
    async deleteMyProfile(email) {
        const userId = await this.getPrismaUserId(email);
        await this.skinProfileService.remove(userId);
    }
};
exports.SkinProfileController = SkinProfileController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer un profil de peau',
        description: "Crée un nouveau profil de peau pour l'utilisateur connecté",
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Profil créé avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Profil déjà existant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_skin_profile_dto_1.CreateSkinProfileDto]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upsert'),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer ou mettre à jour',
        description: 'Crée ou met à jour le profil de peau (upsert)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profil créé ou mis à jour' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_skin_profile_dto_1.CreateSkinProfileDto]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "upsert", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('by-skin-type/:skinType'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('skinType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "findBySkinType", null);
__decorate([
    (0, common_1.Get)('by-concern/:concern'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('concern')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "findByConcern", null);
__decorate([
    (0, common_1.Get)('by-fitzpatrick/:type'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('type', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "findByFitzpatrickType", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/exists'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "hasProfile", null);
__decorate([
    (0, common_1.Get)('me/onboarding-status'),
    (0, swagger_1.ApiOperation)({
        summary: "Statut d'onboarding",
        description: "Vérifie si l'utilisateur a complété l'onboarding",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut retourné' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "getOnboardingStatus", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_skin_profile_dto_1.UpdateSkinProfileDto]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Patch)('me/concerns'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)('concerns')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateConcerns", null);
__decorate([
    (0, common_1.Post)('me/concerns/:concern'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Param)('concern')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "addConcern", null);
__decorate([
    (0, common_1.Delete)('me/concerns/:concern'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Param)('concern')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "removeConcern", null);
__decorate([
    (0, common_1.Patch)('me/sensitivities'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)('sensitivities')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateSensitivities", null);
__decorate([
    (0, common_1.Post)('me/sensitivities/:sensitivity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Param)('sensitivity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "addSensitivity", null);
__decorate([
    (0, common_1.Delete)('me/sensitivities/:sensitivity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Param)('sensitivity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "removeSensitivity", null);
__decorate([
    (0, common_1.Patch)('me/health-score'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)('healthScore', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateHealthScore", null);
__decorate([
    (0, common_1.Patch)('me/skin-age'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)('skinAge', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateSkinAge", null);
__decorate([
    (0, common_1.Patch)('me/last-analysis'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "updateLastAnalysis", null);
__decorate([
    (0, common_1.Delete)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkinProfileController.prototype, "deleteMyProfile", null);
exports.SkinProfileController = SkinProfileController = __decorate([
    (0, swagger_1.ApiTags)('Skin Profiles'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('skin-profiles'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [skin_profile_service_1.SkinProfileService,
        prisma_service_1.PrismaService])
], SkinProfileController);
//# sourceMappingURL=skin-profile.controller.js.map