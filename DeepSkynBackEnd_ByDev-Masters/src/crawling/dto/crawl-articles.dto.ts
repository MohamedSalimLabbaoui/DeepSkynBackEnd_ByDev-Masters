import { IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CrawlSource {
  HEALTHLINE = 'healthline',
  DERMNET = 'dermnet',
  AAD = 'aad',
  MEDICAL_NEWS_TODAY = 'medicalnewstoday',
  ALL = 'all',
}

export class CrawlArticlesDto {
  @ApiPropertyOptional({
    enum: CrawlSource,
    default: CrawlSource.ALL,
    description: 'Source à crawler (ou toutes)',
  })
  @IsOptional()
  @IsEnum(CrawlSource)
  source?: CrawlSource = CrawlSource.ALL;

  @ApiPropertyOptional({
    description: 'Mots-clés pour filtrer les articles',
    type: [String],
    example: ['acne', 'eczema', 'psoriasis'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
