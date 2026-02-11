import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  PREMIUM_YEARLY = 'premium_yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export class CreateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Plan d\'abonnement',
    enum: SubscriptionPlan,
    default: 'free',
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan = SubscriptionPlan.FREE;

  @ApiPropertyOptional({
    description: 'Statut de l\'abonnement',
    enum: SubscriptionStatus,
    default: 'active',
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @ApiPropertyOptional({
    description: 'Montant de l\'abonnement',
    example: 29.99,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Devise',
    default: 'TND',
    example: 'TND',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'TND';

  @ApiPropertyOptional({
    description: 'Date de début de l\'abonnement',
    example: '2026-02-04T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de l\'abonnement',
    example: '2026-03-04T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
