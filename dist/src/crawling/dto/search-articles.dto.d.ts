import { CrawlSource } from './crawl-articles.dto';
export declare class SearchArticlesDto {
    query?: string;
    source?: CrawlSource;
    category?: string;
    limit?: number;
    offset?: number;
}
