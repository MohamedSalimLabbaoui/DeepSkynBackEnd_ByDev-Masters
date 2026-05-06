import { ScraperService } from './scraper.service';
export declare class ScraperController {
    private readonly scraperService;
    constructor(scraperService: ScraperService);
    scrapeDermaceutic(): Promise<any>;
    getScrapedFiles(): Promise<any>;
    getScrapedData(fileName: string): Promise<any>;
}
