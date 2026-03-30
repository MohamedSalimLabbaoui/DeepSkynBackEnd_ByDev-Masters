import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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
  @IsString()
  planCode?: string;
}
