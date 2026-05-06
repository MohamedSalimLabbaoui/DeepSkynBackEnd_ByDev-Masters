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
exports.LikesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const likes_service_1 = require("./likes.service");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let LikesController = class LikesController {
    constructor(likesService) {
        this.likesService = likesService;
    }
    async toggle(userId, postId, type) {
        return this.likesService.toggle(userId, postId, type || 'like');
    }
    async like(userId, postId) {
        return this.likesService.like(userId, postId);
    }
    async unlike(userId, postId) {
        return this.likesService.unlike(userId, postId);
    }
    async findByPost(postId, page, limit) {
        return this.likesService.findByPost(postId, page || 1, limit || 50);
    }
    async findReactionsLegacy(postId, page, limit) {
        return this.likesService.findByPost(postId, page || 1, limit || 50);
    }
    async hasLiked(userId, postId) {
        const liked = await this.likesService.hasLiked(userId, postId);
        return { liked };
    }
};
exports.LikesController = LikesController;
__decorate([
    (0, common_1.Post)(':postId/toggle'),
    (0, swagger_1.ApiOperation)({
        summary: 'Toggle like',
        description: 'Like ou unlike un post',
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiQuery)({
        name: 'type',
        required: false,
        description: 'Type de réaction (like, haha, love, etc.)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Like togglé' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Post non trouvé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "toggle", null);
__decorate([
    (0, common_1.Post)(':postId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Liker un post',
        description: 'Ajoute un like à un post',
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post liké' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Déjà liké' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "like", null);
__decorate([
    (0, common_1.Delete)(':postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Unliker un post',
        description: "Retire le like d'un post",
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Like retiré' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Like non trouvé' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "unlike", null);
__decorate([
    (0, common_1.Get)('post/:postId'),
    (0, swagger_1.ApiOperation)({
        summary: "Likes d'un post",
        description: "Récupère la liste des likes d'un post",
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "findByPost", null);
__decorate([
    (0, common_1.Get)('post/:postId/reactions'),
    (0, swagger_1.ApiOperation)({
        summary: "Réactions d'un post (legacy)",
        description: 'Alias rétrocompatible vers /likes/post/:postId',
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "findReactionsLegacy", null);
__decorate([
    (0, common_1.Get)('check/:postId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Vérifier le like',
        description: "Vérifie si l'utilisateur a liké un post",
    }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'ID du post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut du like' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "hasLiked", null);
exports.LikesController = LikesController = __decorate([
    (0, swagger_1.ApiTags)('Likes'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('likes'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [likes_service_1.LikesService])
], LikesController);
//# sourceMappingURL=likes.controller.js.map