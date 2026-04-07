import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class TranslateVideoPostDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsString()
  @IsOptional()
  language?: string = 'fr';
}
