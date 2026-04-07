import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class TranslateTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  language?: string = 'fr';
}
