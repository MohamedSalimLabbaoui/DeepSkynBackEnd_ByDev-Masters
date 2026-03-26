import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateStoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}
