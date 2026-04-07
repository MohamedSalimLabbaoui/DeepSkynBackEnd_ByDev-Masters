import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RoutineType {
  AM = 'AM',
  PM = 'PM',
  WEEKLY = 'weekly',
}

export class RoutineStepDto {
  @ApiProperty({
    description: "Ordre de l'étape dans la routine",
    example: 1,
  })
  @IsNumber()
  order: number;

  @ApiProperty({
    description: "Nom de l'étape",
    example: 'Nettoyage',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Nom du produit',
    example: 'CeraVe Hydrating Cleanser',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'CeraVe',
  })
  @IsString()
  @IsOptional()
  productBrand?: string;

  @ApiPropertyOptional({
    description: "URL de l'image du produit",
    example: 'https://example.com/product.jpg',
  })
  @IsString()
  @IsOptional()
  productImage?: string;

  @ApiPropertyOptional({
    description: "Description de l'étape",
    example: 'Appliquer sur peau humide et masser doucement',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Durée de l'étape en secondes",
    example: 60,
  })
  @IsNumber()
  @IsOptional()
  duration?: number; // en secondes

  @ApiPropertyOptional({
    description: 'Catégorie du produit',
    example: 'cleanser',
    enum: [
      'cleanser',
      'toner',
      'serum',
      'moisturizer',
      'sunscreen',
      'treatment',
      'mask',
    ],
  })
  @IsString()
  @IsOptional()
  category?: string; // cleanser, toner, serum, moisturizer, sunscreen, etc.

  @ApiPropertyOptional({
    description: 'Étape complétée ou non',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}

export class CreateRoutineDto {
  @ApiProperty({
    description: 'Nom de la routine',
    example: 'Ma routine matinale',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type de routine',
    enum: RoutineType,
    example: 'AM',
  })
  @IsEnum(RoutineType)
  type: RoutineType;

  @ApiProperty({
    description: 'Liste des étapes de la routine',
    type: [RoutineStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineStepDto)
  steps: RoutineStepDto[];

  @ApiPropertyOptional({
    description: 'Notes personnelles sur la routine',
    example: 'Routine adaptée pour peau sensible',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Routine active ou non',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
