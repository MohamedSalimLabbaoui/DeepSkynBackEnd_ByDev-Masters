import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'Contenu/caption du post',
    example: 'Ma routine du matin mise à jour !',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  media?: string;

  @ApiPropertyOptional({
    description: 'Statut du post',
    example: 'published',
    enum: ['published', 'archived', 'deleted'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
