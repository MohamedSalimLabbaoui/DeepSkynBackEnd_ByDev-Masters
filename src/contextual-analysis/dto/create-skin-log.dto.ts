import { IsNumber, IsString, IsOptional, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkinLogDto {
  @ApiProperty({
    description: 'Score de condition de la peau (1-10)',
    example: 7,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1, { message: 'Le score doit être au minimum 1' })
  @Max(10, { message: 'Le score doit être au maximum 10' })
  conditionScore: number;

  @ApiPropertyOptional({
    description: 'Notes supplémentaires sur la condition de la peau',
    example: 'Légère sécheresse après exposition au soleil',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Liste des problèmes de peau observés',
    example: ['dryness', 'redness'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concerns?: string[];
}
