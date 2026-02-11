import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsIn,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSkinProfileDto {
  @ApiPropertyOptional({
    description: 'Type de peau',
    enum: ['dry', 'oily', 'combination', 'normal', 'sensitive'],
    example: 'oily',
  })
  @IsOptional()
  @IsString()
  @IsIn(['dry', 'oily', 'combination', 'normal', 'sensitive'], {
    message: 'Skin type must be one of: dry, oily, combination, normal, sensitive',
  })
  skinType?: string;

  @ApiPropertyOptional({
    description: 'Type de peau Fitzpatrick (1-6)',
    minimum: 1,
    maximum: 6,
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Fitzpatrick type must be between 1 and 6' })
  @Max(6, { message: 'Fitzpatrick type must be between 1 and 6' })
  fitzpatrickType?: number;

  @ApiPropertyOptional({
    description: 'Liste des préoccupations cutanées',
    type: [String],
    example: ['redness', 'dryness'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concerns?: string[];

  @ApiPropertyOptional({
    description: 'Liste des sensibilités',
    type: [String],
    example: ['retinol'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensitivities?: string[];

  @ApiPropertyOptional({
    description: 'Âge de la peau estimé',
    minimum: 0,
    maximum: 150,
    example: 32,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  skinAge?: number;

  @ApiPropertyOptional({
    description: 'Score de santé de la peau (0-100)',
    minimum: 0,
    maximum: 100,
    example: 82,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Health score must be between 0 and 100' })
  @Max(100, { message: 'Health score must be between 0 and 100' })
  healthScore?: number;

  @ApiPropertyOptional({
    description: 'Date de la dernière analyse',
    example: '2026-02-04T14:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  lastAnalysisAt?: string;
}
