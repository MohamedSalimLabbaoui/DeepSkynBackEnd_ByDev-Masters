import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  code: string;

  @ApiProperty({ enum: ['percentage', 'fixed'], example: 'percentage' })
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 'TND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;

  @ApiPropertyOptional({ type: [String], example: ['premium', 'premium_yearly'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPlans?: string[];

  @ApiPropertyOptional({ example: 'promo_123456789' })
  @IsOptional()
  @IsString()
  // Optional manual override. If omitted, backend auto-creates Stripe promo code.
  stripePromotionCodeId?: string;
}
