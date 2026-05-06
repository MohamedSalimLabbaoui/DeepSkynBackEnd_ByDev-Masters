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
exports.SignTranslationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sign_translation_service_1 = require("./sign-translation.service");
const dto_1 = require("./dto");
let SignTranslationController = class SignTranslationController {
    constructor(signTranslationService) {
        this.signTranslationService = signTranslationService;
    }
    async translateText(dto) {
        const result = await this.signTranslationService.translateText(dto);
        return {
            ...result,
            status: 'success',
        };
    }
    async translateVideoPost(postId, dto) {
        return this.signTranslationService.translateVideoPost(postId, dto);
    }
    async getVideoPostTranslation(postId) {
        return this.signTranslationService.getVideoPostTranslation(postId);
    }
};
exports.SignTranslationController = SignTranslationController;
__decorate([
    (0, common_1.Post)('translate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Translate text to sign language' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully translated text',
        type: dto_1.SignResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid language or missing lexicon',
    }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Service unavailable' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TranslateTextDto]),
    __metadata("design:returntype", Promise)
], SignTranslationController.prototype, "translateText", null);
__decorate([
    (0, common_1.Post)('videopost/:postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Translate and save video post transcript' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Translation saved successfully',
        type: dto_1.SignTranslationResultDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid language or translation failed',
    }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Service unavailable' }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.TranslateVideoPostDto]),
    __metadata("design:returntype", Promise)
], SignTranslationController.prototype, "translateVideoPost", null);
__decorate([
    (0, common_1.Get)('videopost/:postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get video post translation' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Translation retrieved successfully',
        type: dto_1.SignTranslationResultDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Translation not found' }),
    __param(0, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SignTranslationController.prototype, "getVideoPostTranslation", null);
exports.SignTranslationController = SignTranslationController = __decorate([
    (0, swagger_1.ApiTags)('sign-translation'),
    (0, common_1.Controller)('sign-translation'),
    __metadata("design:paramtypes", [sign_translation_service_1.SignTranslationService])
], SignTranslationController);
//# sourceMappingURL=sign-translation.controller.js.map