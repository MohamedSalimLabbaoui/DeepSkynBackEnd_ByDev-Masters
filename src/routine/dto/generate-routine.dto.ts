import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoutineType } from './create-routine.dto';

export class GenerateRoutineDto {
  @ApiProperty({
    description: 'Type de routine à générer',
    enum: RoutineType,
    example: 'AM',
  })
  @IsEnum(RoutineType)
  type: RoutineType;

  @ApiPropertyOptional({
    description: 'Type de peau pour personnaliser la routine',
    example: 'combination',
  })
  @IsString()
  @IsOptional()
  skinType?: string;

  @ApiPropertyOptional({
    description: 'Préoccupations cutanées à cibler',
    type: [String],
    example: ['acne', 'dark_spots'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  concerns?: string[];

  @ApiPropertyOptional({
    description: 'Sensibilités à prendre en compte',
    type: [String],
    example: ['fragrance', 'alcohol'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sensitivities?: string[];

  @ApiPropertyOptional({
    description: 'Budget pour les produits',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  @IsString()
  @IsOptional()
  budget?: string; // low, medium, high

  @ApiPropertyOptional({
    description: 'Marques préférées',
    example: 'CeraVe, La Roche-Posay, The Ordinary',
  })
  @IsString()
  @IsOptional()
  preferredBrands?: string;

  @ApiPropertyOptional({
    description: "Notes additionnelles pour l'IA",
    example: 'Je préfère les produits naturels',
  })
  @IsString()
  @IsOptional()
  additionalNotes?: string;
}
