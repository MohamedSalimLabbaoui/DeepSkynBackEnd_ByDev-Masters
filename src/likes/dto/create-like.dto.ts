import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLikeDto {
  @ApiProperty({ description: 'ID du post à liker', example: 'uuid-du-post' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}
