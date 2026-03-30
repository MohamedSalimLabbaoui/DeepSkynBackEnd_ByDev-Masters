import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: "Nouveau code du plan d'abonnement",
    example: 'premium_yearly',
  })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({
    description: 'Alias rétro-compatible (préférer plan)',
    example: 'premium_yearly',
  })
  @IsString()
  @IsOptional()
  planCode?: string;

  @ApiPropertyOptional({
    description: "Nouveau statut de l'abonnement",
    enum: SubscriptionStatus,
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Nouveau montant',
    example: 49.99,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Nouvelle devise',
    example: 'EUR',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Nouvelle date de fin',
    example: '2027-02-04T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
