import { PrismaService } from '../prisma/prisma.service';
import { CrawlSource } from './dto';
export interface CrawledArticle {
    title: string;
    url: string;
    source: string;
    summary: string;
    content: string;
    category: string;
    tags: string[];
    imageUrl?: string;
    publishedAt?: Date;
}
export declare class CrawlingService {
    private readonly prisma;
    private readonly logger;
    private readonly SKIN_CATEGORIES;
    private readonly HTTP_HEADERS;
    constructor(prisma: PrismaService);
    handleScheduledCrawl(): Promise<void>;
    crawlAll(keywords?: string[]): Promise<{
        saved: number;
        skipped: number;
        errors: string[];
    }>;
    crawlBySource(source: CrawlSource, keywords?: string[]): Promise<{
        saved: number;
        skipped: number;
        errors: string[];
    }>;
    private crawlHealthline;
    private scrapeHealthlineArticle;
    private crawlDermNet;
    private scrapeDermNetArticle;
    private crawlAAD;
    private scrapeAADArticle;
    private crawlMedicalNewsToday;
    private scrapeMNTArticle;
    private saveArticles;
    searchArticles(params: {
        query?: string;
        source?: string;
        category?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
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
    private extractTags;
    private normalizeCategory;
    private delay;
}
