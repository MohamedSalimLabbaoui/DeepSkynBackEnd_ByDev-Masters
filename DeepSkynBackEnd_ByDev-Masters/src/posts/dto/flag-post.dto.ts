import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FlagPostDto {
  @IsBoolean()
  flagged!: boolean;

  @IsOptional()
  @IsBoolean()
  remove?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
