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
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const posts_service_1 = require("./posts.service");
const dto_1 = require("./dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let PostsController = class PostsController {
    constructor(postsService) {
        this.postsService = postsService;
    }
    async create(userId, createPostDto) {
        return this.postsService.create(userId, createPostDto);
    }
    async findAll(userId, page, limit) {
        return this.postsService.findAll(page || 1, limit || 20, userId);
    }
    async findAllLegacy(userId, page, limit) {
        return this.postsService.findAll(page || 1, limit || 20, userId);
    }
    async findByUser(currentUserId, userId, page, limit) {
        return this.postsService.findByUser(userId, page || 1, limit || 20, currentUserId);
    }
    async findMyPosts(userId, page, limit) {
        return this.postsService.findByUser(userId, page || 1, limit || 20, userId);
    }
    async findArchives(userId, page, limit) {
        return this.postsService.findArchives(userId, page || 1, limit || 20);
    }
    async findAllForAdmin(page, limit, reported, userId) {
        return this.postsService.findAllForAdmin(page || 1, limit || 20, {
            reported: reported === 'true',
            userId,
        });
    }
    async flagPost(id, flagDto) {
        return this.postsService.moderatePost(id, flagDto);
    }
    async findOne(userId, id) {
        return this.postsService.findOne(id, userId);
    }
    async update(userId, id, updatePostDto) {
        return this.postsService.update(id, userId, updatePostDto);
    }
    async remove(userId, id) {
        return this.postsService.remove(id, userId);
    }
    async toggleArchive(userId, id) {
        return this.postsService.toggleArchive(id, userId);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer un post',
        description: 'Publie un nouveau post dans le feed',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post créé avec succès' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer le feed',
        description: 'Récupère tous les posts paginés',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des posts' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('feed/all'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer le feed (legacy)',
        description: 'Alias rétrocompatible vers /posts',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des posts' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findAllLegacy", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: "Posts d'un utilisateur",
        description: "Récupère les posts d'un utilisateur spécifique",
    }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: "ID de l'utilisateur" }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mes posts',
        description: "Récupère les posts de l'utilisateur connecté",
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findMyPosts", null);
__decorate([
    (0, common_1.Get)('archives'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mes archives',
        description: 'Récupère les posts archivés de l’utilisateur',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findArchives", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('reported')),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findAllForAdmin", null);
__decorate([
    (0, common_1.Patch)('admin/:id/flag'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.FlagPostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "flagPost", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: "Détail d'un post",
        description: 'Récupère un post par son ID',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détail du post' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Post non trouvé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Modifier un post',
        description: 'Modifie un post existant (propriétaire uniquement)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post modifié' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Non autorisé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer un post',
        description: 'Supprime un post (propriétaire uniquement)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Post supprimé' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Non autorisé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/archive'),
    (0, swagger_1.ApiOperation)({
        summary: 'Archiver / Désarchiver un post',
        description: 'Archive ou désarchive un post (propriétaire uniquement)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut du post mis à jour' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleArchive", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)('Posts'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('posts'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map