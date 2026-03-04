import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiPropertyOptional({
    description: 'Texte du commentaire',
    example: 'Super routine mise à jour !',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
