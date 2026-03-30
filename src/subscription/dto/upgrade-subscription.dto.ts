import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: 'Plan vers lequel upgrader',
    example: 'premium',
  })
  @IsString()
  plan: string;

  @ApiPropertyOptional({
    description: 'Alias rétro-compatible (préférer plan)',
    example: 'premium',
  })
  @IsString()
  @IsOptional()
  planCode?: string;

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
