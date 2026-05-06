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
exports.CrawlArticlesDto = exports.CrawlSource = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var CrawlSource;
(function (CrawlSource) {
    CrawlSource["HEALTHLINE"] = "healthline";
    CrawlSource["DERMNET"] = "dermnet";
    CrawlSource["AAD"] = "aad";
    CrawlSource["MEDICAL_NEWS_TODAY"] = "medicalnewstoday";
    CrawlSource["ALL"] = "all";
})(CrawlSource || (exports.CrawlSource = CrawlSource = {}));
class CrawlArticlesDto {
    constructor() {
        this.source = CrawlSource.ALL;
    }
}
exports.CrawlArticlesDto = CrawlArticlesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: CrawlSource,
        default: CrawlSource.ALL,
        description: 'Source à crawler (ou toutes)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CrawlSource),
    __metadata("design:type", String)
], CrawlArticlesDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Mots-clés pour filtrer les articles',
        type: [String],
        example: ['acne', 'eczema', 'psoriasis'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CrawlArticlesDto.prototype, "keywords", void 0);
//# sourceMappingURL=crawl-articles.dto.js.map