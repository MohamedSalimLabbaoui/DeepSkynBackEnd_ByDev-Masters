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
exports.StoriesController = void 0;
const common_1 = require("@nestjs/common");
const stories_service_1 = require("./stories.service");
const create_story_dto_1 = require("./dto/create-story.dto");
const swagger_1 = require("@nestjs/swagger");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
let StoriesController = class StoriesController {
    constructor(storiesService) {
        this.storiesService = storiesService;
    }
    resolveUserId(req) {
        const direct = req.user?.id || req.user?.sub;
        if (direct)
            return direct;
        const authHeader = req.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const parts = token.split('.');
            if (parts.length >= 2) {
                try {
                    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
                    const payload = JSON.parse(payloadJson);
                    return payload.sub || payload.id || payload.userId;
                }
                catch {
                }
            }
        }
        return undefined;
    }
    create(req, createStoryDto) {
        const userId = createStoryDto.userId ||
            this.resolveUserId(req) ||
            '89324390-127f-48c4-b382-2aef40f76add';
        return this.storiesService.create(userId, createStoryDto);
    }
    findAll(req) {
        const userId = this.resolveUserId(req);
        return this.storiesService.findAllActive(userId);
    }
    getUserStories(userId) {
        return this.storiesService.getUserStories(userId);
    }
    toggleLike(req, storyId) {
        const userId = this.resolveUserId(req);
        return this.storiesService.toggleLike(storyId, userId);
    }
    addComment(req, storyId, body) {
        const userId = this.resolveUserId(req);
        return this.storiesService.addComment(userId, {
            storyId,
            comment: body.comment,
        });
    }
    getComments(storyId) {
        return this.storiesService.getComments(storyId);
    }
    deleteComment(req, commentId) {
        const userId = this.resolveUserId(req);
        return this.storiesService.deleteComment(commentId, userId);
    }
    getUserHighlights(userId) {
        return this.storiesService.getUserHighlights(userId);
    }
    saveAsHighlight(req, storyId, body) {
        const userId = this.resolveUserId(req);
        return this.storiesService.saveStoryAsHighlight(storyId, userId, body.highlightTitle);
    }
    removeFromHighlight(req, storyId) {
        const userId = this.resolveUserId(req);
        return this.storiesService.removeFromHighlight(storyId, userId);
    }
    getFreeMusic() {
        return this.storiesService.getFreeMusic();
    }
    searchFreeMusic(query) {
        return this.storiesService.getFreeMusic(query || 'royalty free', 10);
    }
};
exports.StoriesController = StoriesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer une nouvelle story' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_story_dto_1.CreateStoryDto]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les stories actives' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stories for a specific user' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "getUserStories", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle like on a story' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "toggleLike", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Add a comment to a story' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "addComment", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comments for a story' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "getComments", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a story comment' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Get)('highlights/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get story highlights for a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "getUserHighlights", null);
__decorate([
    (0, common_1.Post)(':id/highlight'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a story as highlight' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "saveAsHighlight", null);
__decorate([
    (0, common_1.Delete)(':id/highlight'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Remove story from highlights' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "removeFromHighlight", null);
__decorate([
    (0, common_1.Get)('music/free'),
    (0, swagger_1.ApiOperation)({ summary: 'Get free royalty-free music for stories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "getFreeMusic", null);
__decorate([
    (0, common_1.Get)('music/search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search for free music' }),
    __param(0, (0, common_1.Param)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoriesController.prototype, "searchFreeMusic", null);
exports.StoriesController = StoriesController = __decorate([
    (0, swagger_1.ApiTags)('Stories'),
    (0, common_1.Controller)('stories'),
    __metadata("design:paramtypes", [stories_service_1.StoriesService])
], StoriesController);
//# sourceMappingURL=stories.controller.js.map