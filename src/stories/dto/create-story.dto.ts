import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  musicTitle?: string;
}

export class CreateStoryCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storyId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment: string;
}
