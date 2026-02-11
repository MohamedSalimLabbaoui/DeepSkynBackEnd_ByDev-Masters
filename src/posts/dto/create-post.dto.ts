import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'Contenu/caption du post', example: 'Ma routine du matin !' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'URL du média (image/vidéo)', example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  media?: string;
}
