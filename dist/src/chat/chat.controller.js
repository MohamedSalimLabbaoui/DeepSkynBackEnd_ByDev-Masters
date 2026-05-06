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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const dto_1 = require("./dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
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
                    const tokenUserId = payload.sub || payload.id || payload.userId;
                    if (tokenUserId)
                        return tokenUserId;
                }
                catch {
                }
            }
        }
        return '89324390-127f-48c4-b382-2aef40f76add';
    }
    async sendMessage(req, sendMessageDto) {
        const userId = this.resolveUserId(req);
        return this.chatService.sendMessage(userId, sendMessageDto);
    }
    async getMyChats(req, limit, offset) {
        const userId = this.resolveUserId(req);
        return this.chatService.findAllByUser(userId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getChat(req, id) {
        const userId = this.resolveUserId(req);
        return this.chatService.findOne(id, userId);
    }
    async deleteChat(req, id) {
        const userId = this.resolveUserId(req);
        await this.chatService.remove(id, userId);
    }
    async deleteAllChats(req) {
        const userId = this.resolveUserId(req);
        const count = await this.chatService.removeAll(userId);
        return { deletedCount: count };
    }
    async getStatistics() {
        return this.chatService.getStatistics();
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Envoyer un message',
        description: 'Envoie un message au chatbot IA skincare et reçoit une réponse',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Réponse du chatbot' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Message invalide' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Historique des chats',
        description: "Récupère l'historique des conversations",
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: 'number',
        description: 'Nombre max de résultats',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'offset',
        required: false,
        type: 'number',
        description: 'Offset pour pagination',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des conversations' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMyChats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChat", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteChat", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteAllChats", null);
__decorate([
    (0, common_1.Get)('admin/statistics'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getStatistics", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map