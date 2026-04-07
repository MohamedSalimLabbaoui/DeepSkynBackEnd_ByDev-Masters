import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateStripeCheckoutDto {
  @ApiProperty({
    description: 'Plan Stripe à souscrire via Checkout',
    example: 'premium',
  })
  @IsString()
  plan: string;

  @ApiPropertyOptional({
    description: 'Alias rétro-compatible (préférer plan)',
    example: 'premium',
  })
  @IsOptional()
  @IsString()
  planCode?: string;

  @ApiPropertyOptional({
    description: 'Code coupon à appliquer avant checkout',
    example: 'WELCOME20',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
