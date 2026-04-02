import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WeatherAlertQueryDto {
  @ApiProperty({
    description: 'Latitude de la position',
    example: 48.8566,
  })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude de la position',
    example: 2.3522,
  })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Nom de la ville (optionnel)',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Pays (optionnel)',
    example: 'France',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
