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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const users_service_1 = require("./users.service");
const supabase_service_1 = require("../analysis/services/supabase.service");
const update_user_dto_1 = require("./dto/update-user.dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const admin_users_query_dto_1 = require("./dto/admin-users-query.dto");
const update_user_status_dto_1 = require("./dto/update-user-status.dto");
let UsersController = class UsersController {
    constructor(usersService, supabaseService) {
        this.usersService = usersService;
        this.supabaseService = supabaseService;
    }
    async getProfile(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(email, updateUserDto) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.usersService.update(user.id, updateUserDto);
    }
    async uploadAvatar3D(email, file) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier fourni');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        }
        const result = await this.supabaseService.upload3DModel(file, user.id);
        return this.usersService.update(user.id, { avatar3D: result.url });
    }
    async getAllForAdmin(query) {
        return this.usersService.findAllForAdmin(query);
    }
    async getOneForAdmin(id) {
        const user = await this.usersService.findOneForAdmin(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async getSuggestions(userId) {
        return this.usersService.findSuggestions(userId);
    }
    async searchCommunityProfiles(viewerId, q, page, limit) {
        return this.usersService.searchCommunityProfiles(viewerId, q || '', Number(page) || 1, Number(limit) || 20);
    }
    async toggleFollow(followerId, followingId) {
        return this.usersService.toggleFollow(followerId, followingId);
    }
    async updateStatusForAdmin(id, dto) {
        return this.usersService.updateStatus(id, dto.isActive);
    }
    async findOne(id, viewerId) {
        const user = await this.usersService.findByIdWithFollowStatus(id, viewerId);
        if (!user) {
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        }
        return user;
    }
    async getUserStats(id) {
        return this.usersService.getUserStats(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('avatar3d'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('email')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadAvatar3D", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_users_query_dto_1.AdminUsersQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllForAdmin", null);
__decorate([
    (0, common_1.Get)('admin/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getOneForAdmin", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSuggestions", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "searchCommunityProfiles", null);
__decorate([
    (0, common_1.Post)('follow/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleFollow", null);
__decorate([
    (0, common_1.Patch)('admin/:id/status'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_status_dto_1.UpdateUserStatusDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateStatusForAdmin", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserStats", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        supabase_service_1.SupabaseService])
], UsersController);
//# sourceMappingURL=users.controller.js.map