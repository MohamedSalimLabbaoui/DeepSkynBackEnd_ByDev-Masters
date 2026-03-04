import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChurnPredictionDto {
  @ApiProperty({ description: "ID de l'utilisateur" })
  id: string;

  @ApiProperty({
    description: 'Probabilité de churn (0.0 - 1.0)',
    example: 0.85,
  })
  churnProbability: number;

  @ApiProperty({
    description: 'Niveau de risque',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  riskLevel: string;

  @ApiProperty({ description: 'Est considéré comme churné' })
  isChurned: boolean;
}

export class ChurnReportDto {
  @ApiProperty({ description: "Total d'utilisateurs analysés" })
  totalUsers: number;

  @ApiProperty({ description: 'Utilisateurs à risque (high + critical)' })
  atRiskCount: number;

  @ApiProperty({ description: 'Utilisateurs en risque critique' })
  criticalCount: number;

  @ApiProperty({ type: [ChurnPredictionDto] })
  predictions: ChurnPredictionDto[];
}

export class ChurnStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  analyzedUsers: number;

  @ApiProperty()
  lowRisk: number;

  @ApiProperty()
  mediumRisk: number;

  @ApiProperty()
  highRisk: number;

  @ApiProperty()
  criticalRisk: number;

  @ApiProperty()
  emailsSentToday: number;

  @ApiProperty()
  lastAnalysis: string;
}
