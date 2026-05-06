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
exports.SearchArticlesDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const crawl_articles_dto_1 = require("./crawl-articles.dto");
class SearchArticlesDto {
    constructor() {
        this.limit = 20;
        this.offset = 0;
    }
}
exports.SearchArticlesDto = SearchArticlesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Terme de recherche',
        example: 'acne treatment',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchArticlesDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: crawl_articles_dto_1.CrawlSource, description: 'Filtrer par source' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(crawl_articles_dto_1.CrawlSource),
    __metadata("design:type", String)
], SearchArticlesDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Catégorie', example: 'acne' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchArticlesDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20, minimum: 1, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SearchArticlesDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 0, minimum: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SearchArticlesDto.prototype, "offset", void 0);
//# sourceMappingURL=search-articles.dto.js.map