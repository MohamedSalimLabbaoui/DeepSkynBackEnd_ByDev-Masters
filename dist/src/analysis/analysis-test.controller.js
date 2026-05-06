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
exports.AnalysisTestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const analysis_service_1 = require("./analysis.service");
const gemini_service_1 = require("./services/gemini.service");
const supabase_service_1 = require("./services/supabase.service");
const real_time_scan_dto_1 = require("./dto/real-time-scan.dto");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalysisTestController = class AnalysisTestController {
    constructor(analysisService, geminiService, supabaseService, prisma) {
        this.analysisService = analysisService;
        this.geminiService = geminiService;
        this.supabaseService = supabaseService;
        this.prisma = prisma;
    }
    async onModuleInit() {
        const testEmail = 'test@deepskyn.com';
        let testUser = await this.prisma.user.findUnique({
            where: { email: testEmail },
        });
        if (!testUser) {
            testUser = await this.prisma.user.create({
                data: {
                    email: testEmail,
                    name: 'Test User',
                    emailVerified: true,
                    role: 'user',
                },
            });
            console.log(`Test user created with ID: ${testUser.id}`);
        }
        this.testUserId = testUser.id;
        console.log(`Using test user ID: ${this.testUserId}`);
    }
    async testUploadImage(file) {
        return this.supabaseService.uploadImage(file, this.testUserId, 'test');
    }
    async testUploadImages(files) {
        return this.supabaseService.uploadMultipleImages(files, this.testUserId, 'test');
    }
    async testAnalyze(files, questionnaire) {
        const parsedQuestionnaire = questionnaire
            ? JSON.parse(questionnaire)
            : undefined;
        return this.analysisService.createWithImages(this.testUserId, files, parsedQuestionnaire);
    }
    async testGeminiAnalysis(imageUrls, questionnaire) {
        return this.geminiService.analyzeSkinImages(imageUrls, questionnaire);
    }
    async testRealTimeScan(realTimeScanDto) {
        return this.analysisService.processRealTimeScan(this.testUserId, {
            ...realTimeScanDto,
            saveImage: false,
            saveAnalysis: false,
        });
    }
    async testGeminiPing() {
        try {
            const advice = await this.geminiService.getSkincareAdvice(['test'], ['test']);
            return {
                status: 'success',
                message: `Gemini is working. Response: ${advice.substring(0, 100)}...`,
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: error.message,
            };
        }
    }
};
exports.AnalysisTestController = AnalysisTestController;
__decorate([
    (0, common_1.Post)('upload-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testUploadImage", null);
__decorate([
    (0, common_1.Post)('upload-images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 5)),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testUploadImages", null);
__decorate([
    (0, common_1.Post)('analyze'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 5)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('questionnaire')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testAnalyze", null);
__decorate([
    (0, common_1.Post)('gemini'),
    __param(0, (0, common_1.Body)('imageUrls')),
    __param(1, (0, common_1.Body)('questionnaire')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testGeminiAnalysis", null);
__decorate([
    (0, common_1.Post)('scan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [real_time_scan_dto_1.RealTimeScanDto]),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testRealTimeScan", null);
__decorate([
    (0, common_1.Post)('ping'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisTestController.prototype, "testGeminiPing", null);
exports.AnalysisTestController = AnalysisTestController = __decorate([
    (0, common_1.Controller)('test/analyses'),
    __metadata("design:paramtypes", [analysis_service_1.AnalysisService,
        gemini_service_1.GeminiService,
        supabase_service_1.SupabaseService,
        prisma_service_1.PrismaService])
], AnalysisTestController);
//# sourceMappingURL=analysis-test.controller.js.map