import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CrawlSource } from './crawl-articles.dto';

export class SearchArticlesDto {
  @ApiPropertyOptional({ description: 'Terme de recherche', example: 'acne treatment' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: CrawlSource, description: 'Filtrer par source' })
  @IsOptional()
  @IsEnum(CrawlSource)
  source?: CrawlSource;

  @ApiPropertyOptional({ description: 'Catégorie', example: 'acne' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
