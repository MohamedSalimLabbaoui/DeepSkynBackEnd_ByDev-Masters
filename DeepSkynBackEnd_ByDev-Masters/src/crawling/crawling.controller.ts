import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CrawlingService } from './crawling.service';
import { CrawlArticlesDto, SearchArticlesDto } from './dto';
// Auth guard commenté temporairement comme dans les autres controllers
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Crawling - Articles Dermatologiques')
@Controller('crawling')
export class CrawlingController {
  private readonly logger = new Logger(CrawlingController.name);

  constructor(private readonly crawlingService: CrawlingService) {}

  // ─── Lancer un crawl manuellement ───
  @Post('crawl')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lancer le crawling des articles dermatologiques',
    description:
      'Crawler les sites médicaux (Healthline, DermNet, AAD, Medical News Today) pour récupérer des articles sur les conditions de peau.',
  })
  @ApiResponse({ status: 201, description: 'Crawl terminé avec succès' })
  async triggerCrawl(@Body() crawlDto: CrawlArticlesDto) {
    this.logger.log(`🕷️ Crawl déclenché manuellement - source: ${crawlDto.source || 'all'}`);
    const result = await this.crawlingService.crawlBySource(
      crawlDto.source,
      crawlDto.keywords,
    );
    return {
      message: 'Crawl terminé',
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors,
    };
  }

  // ─── Rechercher des articles ───
  @Get('articles')
  @ApiOperation({
    summary: 'Rechercher des articles dermatologiques',
    description:
      'Rechercher dans la base de connaissances dermatologiques par mot-clé, source ou catégorie.',
  })
  @ApiResponse({ status: 200, description: 'Liste des articles trouvés' })
  async searchArticles(@Query() searchDto: SearchArticlesDto) {
    return this.crawlingService.searchArticles({
      query: searchDto.query,
      source: searchDto.source,
      category: searchDto.category,
      limit: searchDto.limit,
      offset: searchDto.offset,
    });
  }

  // ─── Obtenir un article par ID ───
  @Get('articles/:id')
  @ApiOperation({
    summary: "Obtenir le contenu complet d'un article",
  })
  @ApiResponse({ status: 200, description: 'Article trouvé' })
  @ApiResponse({ status: 404, description: 'Article non trouvé' })
  async getArticle(@Param('id') id: string) {
    const article = await this.crawlingService.getArticle(id);
    if (!article) {
      return { message: 'Article non trouvé' };
    }
    return article;
  }

  // ─── Articles pertinents pour une question ───
  @Get('relevant')
  @ApiOperation({
    summary: 'Obtenir les articles pertinents pour une question',
    description:
      "Utilisé en interne par le chatbot AI pour enrichir ses réponses avec des connaissances dermatologiques récentes.",
  })
  @ApiResponse({ status: 200, description: 'Articles pertinents' })
  async getRelevantArticles(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.crawlingService.getRelevantArticles(query, limit || 5);
  }

  // ─── Statistiques du crawling ───
  @Get('statistics')
  @ApiOperation({
    summary: 'Statistiques de la base de connaissances dermatologiques',
  })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics() {
    return this.crawlingService.getStatistics();
  }
}
