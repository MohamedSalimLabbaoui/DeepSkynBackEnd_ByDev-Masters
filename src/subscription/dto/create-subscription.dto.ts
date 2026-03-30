import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export class CreateSubscriptionDto {
  @ApiPropertyOptional({
    description: "Code du plan d'abonnement",
    default: 'free',
  })
  @IsString()
  @IsOptional()
  plan?: string = 'free';

  @ApiPropertyOptional({
    description: 'Alias rétro-compatible (préférer plan)',
    default: 'free',
  })
  @IsString()
  @IsOptional()
  planCode?: string;

  @ApiPropertyOptional({
    description: "Statut de l'abonnement",
    enum: SubscriptionStatus,
    default: 'active',
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @ApiPropertyOptional({
    description: "Montant de l'abonnement",
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
    description: "Date de début de l'abonnement",
    example: '2026-02-04T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: "Date de fin de l'abonnement",
    example: '2026-03-04T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
