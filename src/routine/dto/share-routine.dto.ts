import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShareRoutineDto {
  @ApiPropertyOptional({
    description: 'ID de la routine à partager (peut être obtenu du paramètre d\'URL)',
    example: 'uuid-of-routine',
  })
  @IsUUID()
  @IsOptional()
  routineId?: string;

  @ApiPropertyOptional({
    description: 'Message personnalisé à ajouter au post',
    example: 'Voici ma routine du matin! 💕',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customMessage?: string;

  @ApiPropertyOptional({
    description: 'Image de couverture pour le post',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;
}
