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

  @ApiPropertyOptional({
    description: 'URL du média (image/vidéo)',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  media?: string;
}
