import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from './create-subscription.dto';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: 'Plan vers lequel upgrader',
    enum: SubscriptionPlan,
    example: 'premium',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Méthode de paiement (pour intégration future)',
    example: 'card_visa_4242',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string; // Pour intégration future avec un système de paiement

  @ApiPropertyOptional({
    description: 'Code promotionnel',
    example: 'DEEPSKYN20',
  })
  @IsString()
  @IsOptional()
  promoCode?: string;
}
