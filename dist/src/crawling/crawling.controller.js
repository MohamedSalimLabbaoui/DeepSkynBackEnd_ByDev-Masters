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
var CrawlingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const crawling_service_1 = require("./crawling.service");
const dto_1 = require("./dto");
let CrawlingController = CrawlingController_1 = class CrawlingController {
    constructor(crawlingService) {
        this.crawlingService = crawlingService;
        this.logger = new common_1.Logger(CrawlingController_1.name);
    }
    async triggerCrawl(crawlDto) {
        this.logger.log(`🕷️ Crawl déclenché manuellement - source: ${crawlDto.source || 'all'}`);
        const result = await this.crawlingService.crawlBySource(crawlDto.source, crawlDto.keywords);
        return {
            message: 'Crawl terminé',
            saved: result.saved,
            skipped: result.skipped,
            errors: result.errors,
        };
    }
    async searchArticles(searchDto) {
        return this.crawlingService.searchArticles({
            query: searchDto.query,
            source: searchDto.source,
            category: searchDto.category,
            limit: searchDto.limit,
            offset: searchDto.offset,
        });
    }
    async getArticle(id) {
        const article = await this.crawlingService.getArticle(id);
        if (!article) {
            return { message: 'Article non trouvé' };
        }
        return article;
    }
    async getRelevantArticles(query, limit) {
        return this.crawlingService.getRelevantArticles(query, limit || 5);
    }
    async getStatistics() {
        return this.crawlingService.getStatistics();
    }
};
exports.CrawlingController = CrawlingController;
__decorate([
    (0, common_1.Post)('crawl'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lancer le crawling des articles dermatologiques',
        description: 'Crawler les sites médicaux (Healthline, DermNet, AAD, Medical News Today) pour récupérer des articles sur les conditions de peau.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Crawl terminé avec succès' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CrawlArticlesDto]),
    __metadata("design:returntype", Promise)
], CrawlingController.prototype, "triggerCrawl", null);
__decorate([
    (0, common_1.Get)('articles'),
    (0, swagger_1.ApiOperation)({
        summary: 'Rechercher des articles dermatologiques',
        description: 'Rechercher dans la base de connaissances dermatologiques par mot-clé, source ou catégorie.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des articles trouvés' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SearchArticlesDto]),
    __metadata("design:returntype", Promise)
], CrawlingController.prototype, "searchArticles", null);
__decorate([
    (0, common_1.Get)('articles/:id'),
    (0, swagger_1.ApiOperation)({
        summary: "Obtenir le contenu complet d'un article",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article trouvé' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrawlingController.prototype, "getArticle", null);
__decorate([
    (0, common_1.Get)('relevant'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les articles pertinents pour une question',
        description: 'Utilisé en interne par le chatbot AI pour enrichir ses réponses avec des connaissances dermatologiques récentes.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Articles pertinents' }),
    __param(0, (0, common_1.Query)('query')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], CrawlingController.prototype, "getRelevantArticles", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({
        summary: 'Statistiques de la base de connaissances dermatologiques',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistiques' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrawlingController.prototype, "getStatistics", null);
exports.CrawlingController = CrawlingController = CrawlingController_1 = __decorate([
    (0, swagger_1.ApiTags)('Crawling - Articles Dermatologiques'),
    (0, common_1.Controller)('crawling'),
    __metadata("design:paramtypes", [crawling_service_1.CrawlingService])
], CrawlingController);
//# sourceMappingURL=crawling.controller.js.map