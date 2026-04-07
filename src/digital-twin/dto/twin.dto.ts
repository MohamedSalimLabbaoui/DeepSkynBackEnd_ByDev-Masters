import { IsString, IsInt, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSnapshotDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  healthScore: number;

  @IsOptional()
  @IsInt()
  skinAge?: number;

  @IsOptional()
  conditions?: Record<string, any>;

  @IsOptional()
  metrics?: Record<string, any>;

  @IsOptional()
  environmental?: Record<string, any>;

  @IsOptional()
  lifestyle?: Record<string, any>;

  @IsOptional()
  productsUsed?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  isBaseline?: boolean;
}

export class SimulateProductDto {
  @IsString()
  productName: string;

  @IsString()
  productCategory: string; // cleanser, serum, moisturizer, sunscreen

  @IsArray()
  productIngredients: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  simulationPeriod?: number; // Default 14 days

  @IsOptional()
  notes?: string;
}

export class GetPredictionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  daysAhead?: number; // Default 7 days
}

export class UpdateSimulationDto {
  @IsString()
  status: 'TESTING' | 'CONFIRMED' | 'REJECTED';

  @IsOptional()
  actualResults?: Record<string, any>;

  @IsOptional()
  @IsString()
  feedback?: string;
}
