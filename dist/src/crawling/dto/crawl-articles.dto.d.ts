export declare enum CrawlSource {
    HEALTHLINE = "healthline",
    DERMNET = "dermnet",
    AAD = "aad",
    MEDICAL_NEWS_TODAY = "medicalnewstoday",
    ALL = "all"
}
export declare class CrawlArticlesDto {
    source?: CrawlSource;
    keywords?: string[];
}
