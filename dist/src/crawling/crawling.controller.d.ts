import { CrawlingService } from './crawling.service';
import { CrawlArticlesDto, SearchArticlesDto } from './dto';
export declare class CrawlingController {
    private readonly crawlingService;
    private readonly logger;
    constructor(crawlingService: CrawlingService);
    triggerCrawl(crawlDto: CrawlArticlesDto): Promise<{
        message: string;
        saved: number;
        skipped: number;
        errors: string[];
    }>;
    searchArticles(searchDto: SearchArticlesDto): Promise<{
        articles: {
            id: string;
            title: string;
            imageUrl: string;
            source: string;
            summary: string;
            url: string;
            tags: string[];
            category: string;
            crawledAt: Date;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getArticle(id: string): Promise<{
        id: string;
        updatedAt: Date;
        title: string;
        imageUrl: string | null;
        source: string;
        summary: string;
        content: string;
        url: string;
        tags: string[];
        category: string;
        publishedAt: Date | null;
        crawledAt: Date;
    } | {
        message: string;
    }>;
    getRelevantArticles(query: string, limit?: number): Promise<{
        title: string;
        summary: string;
        source: string;
        url: string;
    }[]>;
    getStatistics(): Promise<{
        totalArticles: number;
        bySource: {
            source: string;
            count: number;
        }[];
        topCategories: {
            category: string;
            count: number;
        }[];
        lastCrawlAt: Date;
    }>;
}
