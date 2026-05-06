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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateChatDto = exports.ChatMessageDto = exports.MessageRole = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "user";
    MessageRole["ASSISTANT"] = "assistant";
    MessageRole["SYSTEM"] = "system";
})(MessageRole || (exports.MessageRole = MessageRole = {}));
class ChatMessageDto {
}
exports.ChatMessageDto = ChatMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Rôle de l'auteur du message",
        enum: MessageRole,
        example: 'user',
    }),
    (0, class_validator_1.IsEnum)(MessageRole),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Contenu du message',
        example: "Quels sont les meilleurs ingrédients pour l'acné ?",
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Horodatage du message',
        example: '2026-02-04T10:30:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "timestamp", void 0);
class CreateChatDto {
}
exports.CreateChatDto = CreateChatDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Liste des messages de la conversation',
        type: [ChatMessageDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ChatMessageDto),
    __metadata("design:type", Array)
], CreateChatDto.prototype, "messages", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Contexte additionnel (profil de peau, préférences)',
        example: { skinType: 'oily', concerns: ['acne'] },
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateChatDto.prototype, "context", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Utilisateur premium (accès à plus de fonctionnalités)',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateChatDto.prototype, "isPremium", void 0);
//# sourceMappingURL=create-chat.dto.js.map