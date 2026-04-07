import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'premium' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Premium Monthly' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 19.99 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 'TND', default: 'TND' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 30, description: 'Durée en jours (-1 = illimité)' })
  @IsInt()
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Unlimited analyses', 'Unlimited AI chat'],
  })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ example: 'price_123' })
  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
