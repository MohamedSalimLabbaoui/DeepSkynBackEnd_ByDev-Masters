import { Controller, Get, Param, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('scrape-dermaceutic')
  async scrapeDermaceutic(): Promise<any> {
    try {
      const products = await this.scraperService.scrapeDermaceutic();
      return {
        success: true,
        message: `${products.length} produits scrapés avec succès`,
        totalProducts: products.length,
        data: products,
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors du scraping: ${error.message}`,
        error: error.message,
      };
    }
  }

  @Get('files')
  async getScrapedFiles(): Promise<any> {
    const files = await this.scraperService.getScrapedData();
    return {
      success: true,
      files,
      totalFiles: files.length,
    };
  }

  @Get('data/:fileName')
  async getScrapedData(@Param('fileName') fileName: string): Promise<any> {
    try {
      const data = await this.scraperService.getScrapedProductsById(fileName);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: `Fichier non trouvé: ${fileName}`,
        error: error.message,
      };
    }
  }
}
