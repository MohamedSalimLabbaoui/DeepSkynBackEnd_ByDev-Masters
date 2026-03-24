import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecommendProductDto {
  @ApiProperty({
    description: 'Nom de l\'étape de routine (ex: Nettoyant, Sérum)',
    example: 'Sérum Vitamine C',
  })
  @IsString()
  stepName: string;

  @ApiProperty({
    description: 'Catégorie du step (cleanser, serum, moisturizer, etc.)',
    example: 'serum',
  })
  @IsString()
  stepCategory: string;

  @ApiProperty({
    description: 'Description optionnelle du step',
    required: false,
    example: 'Protection antioxydante',
  })
  @IsOptional()
  @IsString()
  stepDescription?: string;

  @ApiProperty({
    description: 'Type de peau de l\'utilisateur',
    required: false,
    example: 'combination',
  })
  @IsOptional()
  @IsString()
  skinType?: string;

  @ApiProperty({
    description: 'Préoccupations cutanées séparées par virgule',
    required: false,
    example: 'acne,hyperpigmentation',
  })
  @IsOptional()
  @IsString()
  concerns?: string;
}

export interface ProductRecommendation {
  productName: string;
  brand: string;
  description: string;
  keyIngredients: string[];
  whyRecommended: string;
  estimatedPrice: string;
  purchaseUrl: string;
  qrCodeDataUrl: string;
  rating: 'excellent' | 'good' | 'alternative';
  sourceArticles: { title: string; url: string }[];
}
