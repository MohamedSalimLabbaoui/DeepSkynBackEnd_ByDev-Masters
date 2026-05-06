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
var CrawlingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("axios");
const cheerio = require("cheerio");
const dto_1 = require("./dto");
let CrawlingService = CrawlingService_1 = class CrawlingService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CrawlingService_1.name);
        this.SKIN_CATEGORIES = [
            'acne',
            'eczema',
            'psoriasis',
            'rosacea',
            'dermatitis',
            'melanoma',
            'skin-cancer',
            'hyperpigmentation',
            'wrinkles',
            'aging',
            'dry-skin',
            'oily-skin',
            'sensitive-skin',
            'sunburn',
            'skincare-routine',
            'moisturizer',
            'sunscreen',
            'retinol',
            'vitamin-c',
            'fungal-infections',
        ];
        this.HTTP_HEADERS = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        };
    }
    async handleScheduledCrawl() {
        this.logger.log('🕷️ Démarrage du crawl automatique planifié...');
        try {
            const results = await this.crawlAll();
            this.logger.log(`✅ Crawl planifié terminé: ${results.saved} articles sauvegardés, ${results.skipped} dupliqués ignorés`);
        }
        catch (error) {
            this.logger.error('❌ Erreur lors du crawl planifié', error.message);
        }
    }
    async crawlAll(keywords) {
        const allArticles = [];
        const errors = [];
        const sources = [
            { name: 'Healthline', fn: () => this.crawlHealthline(keywords) },
            { name: 'DermNet', fn: () => this.crawlDermNet(keywords) },
            { name: 'AAD', fn: () => this.crawlAAD(keywords) },
            {
                name: 'Medical News Today',
                fn: () => this.crawlMedicalNewsToday(keywords),
            },
        ];
        for (const source of sources) {
            try {
                this.logger.log(`📥 Crawling ${source.name}...`);
                const articles = await source.fn();
                allArticles.push(...articles);
                this.logger.log(`  → ${articles.length} articles trouvés sur ${source.name}`);
            }
            catch (error) {
                const msg = `Erreur crawl ${source.name}: ${error.message}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }
        const { saved, skipped } = await this.saveArticles(allArticles);
        return { saved, skipped, errors };
    }
    async crawlBySource(source, keywords) {
        if (source === dto_1.CrawlSource.ALL) {
            return this.crawlAll(keywords);
        }
        let articles = [];
        const errors = [];
        try {
            switch (source) {
                case dto_1.CrawlSource.HEALTHLINE:
                    articles = await this.crawlHealthline(keywords);
                    break;
                case dto_1.CrawlSource.DERMNET:
                    articles = await this.crawlDermNet(keywords);
                    break;
                case dto_1.CrawlSource.AAD:
                    articles = await this.crawlAAD(keywords);
                    break;
                case dto_1.CrawlSource.MEDICAL_NEWS_TODAY:
                    articles = await this.crawlMedicalNewsToday(keywords);
                    break;
            }
        }
        catch (error) {
            errors.push(error.message);
        }
        const { saved, skipped } = await this.saveArticles(articles);
        return { saved, skipped, errors };
    }
    async crawlHealthline(keywords) {
        const articles = [];
        const categoriesToCrawl = keywords?.length
            ? keywords
            : [
                'skin-care',
                'skin-health',
                'acne',
                'eczema',
                'psoriasis',
                'dermatitis',
            ];
        for (const category of categoriesToCrawl) {
            try {
                const url = `https://www.healthline.com/health/${category}`;
                const { data: html } = await axios_1.default.get(url, {
                    headers: this.HTTP_HEADERS,
                    timeout: 15000,
                });
                const $ = cheerio.load(html);
                const articleLinks = [];
                $('a[href*="/health/"]').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href &&
                        !href.includes('#') &&
                        !articleLinks.includes(href) &&
                        href.startsWith('/health/')) {
                        articleLinks.push(`https://www.healthline.com${href}`);
                    }
                });
                const uniqueLinks = [...new Set(articleLinks)].slice(0, 10);
                for (const link of uniqueLinks) {
                    try {
                        const article = await this.scrapeHealthlineArticle(link, category);
                        if (article)
                            articles.push(article);
                        await this.delay(1500);
                    }
                    catch {
                    }
                }
            }
            catch {
                this.logger.warn(`Healthline: impossible de crawler la catégorie ${category}`);
            }
        }
        return articles;
    }
    async scrapeHealthlineArticle(url, category) {
        try {
            const { data: html } = await axios_1.default.get(url, {
                headers: this.HTTP_HEADERS,
                timeout: 15000,
            });
            const $ = cheerio.load(html);
            const title = $('h1').first().text().trim();
            if (!title)
                return null;
            const paragraphs = [];
            $('article p, .article-body p, [class*="content"] p').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 30)
                    paragraphs.push(text);
            });
            const content = paragraphs.join('\n\n');
            if (content.length < 100)
                return null;
            const summary = paragraphs.slice(0, 2).join(' ').substring(0, 500);
            const imageUrl = $('article img, .article-body img').first().attr('src') || undefined;
            const tags = this.extractTags($, content);
            return {
                title,
                url,
                source: 'healthline',
                summary,
                content,
                category: this.normalizeCategory(category),
                tags,
                imageUrl,
            };
        }
        catch {
            return null;
        }
    }
    async crawlDermNet(keywords) {
        const articles = [];
        const topics = keywords?.length
            ? keywords
            : [
                'acne',
                'eczema',
                'psoriasis',
                'rosacea',
                'dermatitis',
                'melanoma',
                'fungal',
            ];
        for (const topic of topics) {
            try {
                const url = `https://dermnetnz.org/topics/${topic}`;
                const article = await this.scrapeDermNetArticle(url, topic);
                if (article)
                    articles.push(article);
                await this.delay(2000);
            }
            catch {
                this.logger.warn(`DermNet: impossible de crawler le topic ${topic}`);
            }
        }
        try {
            const listUrl = 'https://dermnetnz.org/topics';
            const { data: html } = await axios_1.default.get(listUrl, {
                headers: this.HTTP_HEADERS,
                timeout: 15000,
            });
            const $ = cheerio.load(html);
            const topicLinks = [];
            $('a[href*="/topics/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !topicLinks.includes(href)) {
                    const fullUrl = href.startsWith('http')
                        ? href
                        : `https://dermnetnz.org${href}`;
                    topicLinks.push(fullUrl);
                }
            });
            const limitedLinks = topicLinks.slice(0, 20);
            for (const link of limitedLinks) {
                try {
                    const topicName = link.split('/topics/')[1] || 'general';
                    const article = await this.scrapeDermNetArticle(link, topicName);
                    if (article)
                        articles.push(article);
                    await this.delay(2000);
                }
                catch {
                }
            }
        }
        catch {
            this.logger.warn('DermNet: impossible de crawler la liste des topics');
        }
        return articles;
    }
    async scrapeDermNetArticle(url, topic) {
        try {
            const { data: html } = await axios_1.default.get(url, {
                headers: this.HTTP_HEADERS,
                timeout: 15000,
            });
            const $ = cheerio.load(html);
            const title = $('h1').first().text().trim();
            if (!title)
                return null;
            const paragraphs = [];
            $('article p, .topic__content p, main p, .content p').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 30)
                    paragraphs.push(text);
            });
            const content = paragraphs.join('\n\n');
            if (content.length < 100)
                return null;
            const summary = paragraphs.slice(0, 2).join(' ').substring(0, 500);
            const imageUrl = $('article img, main img').first().attr('src') || undefined;
            const tags = this.extractTags($, content);
            return {
                title,
                url,
                source: 'dermnet',
                summary,
                content,
                category: this.normalizeCategory(topic),
                tags,
                imageUrl,
            };
        }
        catch {
            return null;
        }
    }
    async crawlAAD(keywords) {
        const articles = [];
        const conditions = keywords?.length
            ? keywords
            : [
                'acne',
                'eczema',
                'psoriasis',
                'rosacea',
                'skin-cancer',
                'hair-loss',
                'nail-fungus',
            ];
        for (const condition of conditions) {
            try {
                const url = `https://www.aad.org/public/diseases/${condition}`;
                const article = await this.scrapeAADArticle(url, condition);
                if (article)
                    articles.push(article);
                await this.delay(2000);
            }
            catch {
                this.logger.warn(`AAD: impossible de crawler ${condition}`);
            }
        }
        return articles;
    }
    async scrapeAADArticle(url, condition) {
        try {
            const { data: html } = await axios_1.default.get(url, {
                headers: this.HTTP_HEADERS,
                timeout: 15000,
            });
            const $ = cheerio.load(html);
            const title = $('h1').first().text().trim();
            if (!title)
                return null;
            const paragraphs = [];
            $('article p, .field-item p, main p, .content p').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 30)
                    paragraphs.push(text);
            });
            const content = paragraphs.join('\n\n');
            if (content.length < 50)
                return null;
            const summary = paragraphs.slice(0, 2).join(' ').substring(0, 500);
            const imageUrl = $('article img, main img').first().attr('src') || undefined;
            const tags = this.extractTags($, content);
            return {
                title,
                url,
                source: 'aad',
                summary,
                content,
                category: this.normalizeCategory(condition),
                tags,
                imageUrl,
            };
        }
        catch {
            return null;
        }
    }
    async crawlMedicalNewsToday(keywords) {
        const articles = [];
        const topics = keywords?.length
            ? keywords
            : ['acne', 'eczema', 'psoriasis', 'rosacea', 'skin-care', 'dermatology'];
        for (const topic of topics) {
            try {
                const url = `https://www.medicalnewstoday.com/articles/${topic}`;
                const article = await this.scrapeMNTArticle(url, topic);
                if (article)
                    articles.push(article);
                await this.delay(2000);
                const searchUrl = `https://www.medicalnewstoday.com/search?q=${encodeURIComponent(topic)}`;
                const { data: searchHtml } = await axios_1.default.get(searchUrl, {
                    headers: this.HTTP_HEADERS,
                    timeout: 15000,
                });
                const $ = cheerio.load(searchHtml);
                const links = [];
                $('a[href*="/articles/"]').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href && !links.includes(href)) {
                        const fullUrl = href.startsWith('http')
                            ? href
                            : `https://www.medicalnewstoday.com${href}`;
                        links.push(fullUrl);
                    }
                });
                for (const link of links.slice(0, 5)) {
                    try {
                        const art = await this.scrapeMNTArticle(link, topic);
                        if (art)
                            articles.push(art);
                        await this.delay(1500);
                    }
                    catch {
                    }
                }
            }
            catch {
                this.logger.warn(`MNT: impossible de crawler ${topic}`);
            }
        }
        return articles;
    }
    async scrapeMNTArticle(url, topic) {
        try {
            const { data: html } = await axios_1.default.get(url, {
                headers: this.HTTP_HEADERS,
                timeout: 15000,
            });
            const $ = cheerio.load(html);
            const title = $('h1').first().text().trim();
            if (!title)
                return null;
            const paragraphs = [];
            $('article p, .article-body p, main p').each((_, el) => {
                const text = $(el).text().trim();
                if (text.length > 30)
                    paragraphs.push(text);
            });
            const content = paragraphs.join('\n\n');
            if (content.length < 100)
                return null;
            const summary = paragraphs.slice(0, 2).join(' ').substring(0, 500);
            const imageUrl = $('article img, main img').first().attr('src') || undefined;
            const tags = this.extractTags($, content);
            return {
                title,
                url,
                source: 'medicalnewstoday',
                summary,
                content,
                category: this.normalizeCategory(topic),
                tags,
                imageUrl,
            };
        }
        catch {
            return null;
        }
    }
    async saveArticles(articles) {
        let saved = 0;
        let skipped = 0;
        for (const article of articles) {
            try {
                const existing = await this.prisma.dermatologyArticle.findUnique({
                    where: { url: article.url },
                });
                if (existing) {
                    skipped++;
                    continue;
                }
                await this.prisma.dermatologyArticle.create({
                    data: {
                        title: article.title,
                        url: article.url,
                        source: article.source,
                        summary: article.summary,
                        content: article.content,
                        category: article.category,
                        tags: article.tags,
                        imageUrl: article.imageUrl,
                        publishedAt: article.publishedAt,
                    },
                });
                saved++;
            }
            catch (error) {
                this.logger.warn(`Erreur sauvegarde article "${article.title}": ${error.message}`);
                skipped++;
            }
        }
        return { saved, skipped };
    }
    async searchArticles(params) {
        const { query, source, category, limit = 20, offset = 0 } = params;
        const where = {};
        if (source && source !== 'all') {
            where.source = source;
        }
        if (category) {
            where.category = { contains: category, mode: 'insensitive' };
        }
        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { summary: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { tags: { has: query.toLowerCase() } },
            ];
        }
        const [articles, total] = await Promise.all([
            this.prisma.dermatologyArticle.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { crawledAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    url: true,
                    source: true,
                    summary: true,
                    category: true,
                    tags: true,
                    imageUrl: true,
                    crawledAt: true,
                },
            }),
            this.prisma.dermatologyArticle.count({ where }),
        ]);
        return { articles, total, limit, offset };
    }
    async getArticle(id) {
        return this.prisma.dermatologyArticle.findUnique({ where: { id } });
    }
    async getRelevantArticles(query, limit = 5) {
        const keywords = query
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
        if (keywords.length === 0)
            return [];
        const orConditions = keywords.flatMap((keyword) => [
            { title: { contains: keyword, mode: 'insensitive' } },
            { tags: { has: keyword } },
            { category: { contains: keyword, mode: 'insensitive' } },
        ]);
        const articles = await this.prisma.dermatologyArticle.findMany({
            where: { OR: orConditions },
            take: limit,
            orderBy: { crawledAt: 'desc' },
            select: {
                title: true,
                summary: true,
                source: true,
                url: true,
            },
        });
        return articles;
    }
    async getStatistics() {
        const total = await this.prisma.dermatologyArticle.count();
        const bySource = await this.prisma.dermatologyArticle.groupBy({
            by: ['source'],
            _count: { id: true },
        });
        const byCategory = await this.prisma.dermatologyArticle.groupBy({
            by: ['category'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 15,
        });
        const latest = await this.prisma.dermatologyArticle.findFirst({
            orderBy: { crawledAt: 'desc' },
            select: { crawledAt: true },
        });
        return {
            totalArticles: total,
            bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
            topCategories: byCategory.map((c) => ({
                category: c.category,
                count: c._count.id,
            })),
            lastCrawlAt: latest?.crawledAt || null,
        };
    }
    extractTags($, content) {
        const tags = [];
        const metaKeywords = $('meta[name="keywords"]').attr('content');
        if (metaKeywords) {
            tags.push(...metaKeywords
                .split(',')
                .map((k) => k.trim().toLowerCase())
                .filter((k) => k.length > 2));
        }
        const skinConditions = [
            'acne',
            'eczema',
            'psoriasis',
            'rosacea',
            'dermatitis',
            'melanoma',
            'vitiligo',
            'hives',
            'urticaria',
            'seborrhea',
            'keratosis',
            'fungal',
            'warts',
            'moles',
            'sunburn',
            'hyperpigmentation',
            'melasma',
            'wrinkles',
            'aging',
            'dry skin',
            'oily skin',
            'sensitive skin',
            'combination skin',
            'retinol',
            'hyaluronic acid',
            'salicylic acid',
            'benzoyl peroxide',
            'niacinamide',
            'vitamin c',
            'spf',
            'sunscreen',
            'moisturizer',
        ];
        const lowerContent = content.toLowerCase();
        for (const condition of skinConditions) {
            if (lowerContent.includes(condition) && !tags.includes(condition)) {
                tags.push(condition);
            }
        }
        return [...new Set(tags)].slice(0, 20);
    }
    normalizeCategory(raw) {
        return raw
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.CrawlingService = CrawlingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrawlingService.prototype, "handleScheduledCrawl", null);
exports.CrawlingService = CrawlingService = CrawlingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrawlingService);
//# sourceMappingURL=crawling.service.js.map