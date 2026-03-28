import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from './create-subscription.dto';

export class CreateStripeCheckoutDto {
  @ApiProperty({
    description: 'Plan Stripe à souscrire via Checkout',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PREMIUM,
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
