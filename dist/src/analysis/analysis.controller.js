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
exports.AnalysisController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const analysis_service_1 = require("./analysis.service");
const create_analysis_dto_1 = require("./dto/create-analysis.dto");
const real_time_scan_dto_1 = require("./dto/real-time-scan.dto");
const keycloak_auth_guard_1 = require("../auth/guards/keycloak-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let AnalysisController = class AnalysisController {
    constructor(analysisService) {
        this.analysisService = analysisService;
    }
    async createWithUpload(userId, files, questionnaire, preocupent, saveAnalysis) {
        const parsedQuestionnaire = questionnaire
            ? JSON.parse(questionnaire)
            : undefined;
        let parsedPreocupent;
        if (preocupent) {
            try {
                const payload = JSON.parse(preocupent);
                if (!Array.isArray(payload)) {
                    throw new common_1.BadRequestException('preocupent must be a JSON array');
                }
                parsedPreocupent = payload;
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new common_1.BadRequestException('preocupent must be a valid JSON array');
            }
        }
        const shouldSaveAnalysis = typeof saveAnalysis === 'string'
            ? saveAnalysis.trim().toLowerCase() !== 'false'
            : true;
        return this.analysisService.createWithImages(userId, files, parsedQuestionnaire, parsedPreocupent, shouldSaveAnalysis);
    }
    async create(userId, createAnalysisDto) {
        return this.analysisService.create(userId, createAnalysisDto);
    }
    async realTimeScan(userId, realTimeScanDto) {
        return this.analysisService.processRealTimeScan(userId, realTimeScanDto);
    }
    async findAll(userId, page, limit) {
        return this.analysisService.findAllByUser(userId, page, limit);
    }
    async getUserStats(userId) {
        return this.analysisService.getUserStats(userId);
    }
    async getAdvice(userId) {
        const advice = await this.analysisService.getAdvice(userId);
        return { advice };
    }
    async getLatest(userId) {
        return this.analysisService.findLatest(userId);
    }
    async getStatistics() {
        return this.analysisService.getStatistics();
    }
    async getAllForAdmin(page, limit, fromDate, toDate, skinType, minScore, maxScore, status) {
        return this.analysisService.findAllForAdmin({
            page,
            limit,
            fromDate,
            toDate,
            skinType,
            minScore: minScore ? parseInt(minScore, 10) : undefined,
            maxScore: maxScore ? parseInt(maxScore, 10) : undefined,
            status,
        });
    }
    async compareAnalyses(userId, analysisId1, analysisId2) {
        return this.analysisService.compareAnalyses(userId, analysisId1, analysisId2);
    }
    async findOne(id, userId) {
        return this.analysisService.findById(id, userId);
    }
    async retryAnalysis(id, userId) {
        return this.analysisService.retryAnalysis(id, userId);
    }
    async retryAnalysisForAdmin(id) {
        return this.analysisService.retryAnalysisForAdmin(id);
    }
    async remove(id, userId) {
        await this.analysisService.remove(id, userId);
    }
    async hairRecommendation(userId, image, mimeType) {
        return this.analysisService.recommendHair(userId, image, mimeType);
    }
};
exports.AnalysisController = AnalysisController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 5)),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload et analyse',
        description: "Upload d'images et création d'une analyse IA (max 5 images)",
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                images: { type: 'array', items: { type: 'string', format: 'binary' } },
                questionnaire: { type: 'string', description: 'Questionnaire JSON' },
                preocupent: {
                    type: 'string',
                    description: 'JSON array of selected face zones (ex: ["nez","joues"])',
                },
                saveAnalysis: {
                    type: 'string',
                    description: "Optional boolean string. Set to 'false' to analyze upload without persisting in database.",
                    example: 'false',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Analyse créée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Images invalides' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)('questionnaire')),
    __param(3, (0, common_1.Body)('preocupent')),
    __param(4, (0, common_1.Body)('saveAnalysis')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "createWithUpload", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer analyse depuis URLs',
        description: "Crée une analyse à partir d'URLs d'images existantes",
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Analyse créée' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'URLs invalides' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_analysis_dto_1.CreateAnalysisDto]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('scan'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, real_time_scan_dto_1.RealTimeScanDto]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "realTimeScan", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)('advice'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getAdvice", null);
__decorate([
    (0, common_1.Get)('latest'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('fromDate')),
    __param(3, (0, common_1.Query)('toDate')),
    __param(4, (0, common_1.Query)('skinType')),
    __param(5, (0, common_1.Query)('minScore')),
    __param(6, (0, common_1.Query)('maxScore')),
    __param(7, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getAllForAdmin", null);
__decorate([
    (0, common_1.Get)('compare'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('id1')),
    __param(2, (0, common_1.Query)('id2')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "compareAnalyses", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/retry'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "retryAnalysis", null);
__decorate([
    (0, common_1.Post)('admin/:id/retry'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "retryAnalysisForAdmin", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('hair-recommendation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)('image')),
    __param(2, (0, common_1.Body)('mimeType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "hairRecommendation", null);
exports.AnalysisController = AnalysisController = __decorate([
    (0, swagger_1.ApiTags)('Analyses'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('analyses'),
    (0, common_1.UseGuards)(keycloak_auth_guard_1.KeycloakAuthGuard),
    __metadata("design:paramtypes", [analysis_service_1.AnalysisService])
], AnalysisController);
//# sourceMappingURL=analysis.controller.js.map