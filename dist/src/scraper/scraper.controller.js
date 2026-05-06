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
exports.ScraperController = void 0;
const common_1 = require("@nestjs/common");
const scraper_service_1 = require("./scraper.service");
let ScraperController = class ScraperController {
    constructor(scraperService) {
        this.scraperService = scraperService;
    }
    async scrapeDermaceutic() {
        try {
            const products = await this.scraperService.scrapeDermaceutic();
            return {
                success: true,
                message: `${products.length} produits scrapés avec succès`,
                totalProducts: products.length,
                data: products,
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Erreur lors du scraping: ${error.message}`,
                error: error.message,
            };
        }
    }
    async getScrapedFiles() {
        const files = await this.scraperService.getScrapedData();
        return {
            success: true,
            files,
            totalFiles: files.length,
        };
    }
    async getScrapedData(fileName) {
        try {
            const data = await this.scraperService.getScrapedProductsById(fileName);
            return {
                success: true,
                data,
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Fichier non trouvé: ${fileName}`,
                error: error.message,
            };
        }
    }
};
exports.ScraperController = ScraperController;
__decorate([
    (0, common_1.Post)('scrape-dermaceutic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "scrapeDermaceutic", null);
__decorate([
    (0, common_1.Get)('files'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "getScrapedFiles", null);
__decorate([
    (0, common_1.Get)('data/:fileName'),
    __param(0, (0, common_1.Param)('fileName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "getScrapedData", null);
exports.ScraperController = ScraperController = __decorate([
    (0, common_1.Controller)('scraper'),
    __metadata("design:paramtypes", [scraper_service_1.ScraperService])
], ScraperController);
//# sourceMappingURL=scraper.controller.js.map