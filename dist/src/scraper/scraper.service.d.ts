export interface Product {
    name: string;
    link: string;
    image: string;
    attributes: {
        [key: string]: string | string[];
    };
}
export declare class ScraperService {
    private readonly logger;
    private outputDir;
    constructor();
    scrapeDermaceutic(): Promise<Product[]>;
    private saveToJson;
    getScrapedData(): Promise<string[]>;
    getScrapedProductsById(fileName: string): Promise<any>;
}
