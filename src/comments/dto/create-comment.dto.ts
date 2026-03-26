import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'ID du post à commenter',
    example: 'uuid-du-post',
  })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({
    description: 'Texte du commentaire',
    example: 'Super routine !',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;

  @ApiProperty({
    description: 'ID du commentaire parent (pour une réponse)',
    example: 'uuid-du-parent',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
