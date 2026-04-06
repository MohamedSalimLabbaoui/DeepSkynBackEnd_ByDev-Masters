import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PredictiveRoutineStatus {
  PENDING = 'PENDING',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
  IMPLEMENTED = 'IMPLEMENTED',
  EXPIRED = 'EXPIRED',
}

export class UpdateRoutineStatusDto {
  @IsEnum(PredictiveRoutineStatus)
  status: PredictiveRoutineStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}

export class GetUserRoutinesQueryDto {
  @IsOptional()
  @IsEnum(PredictiveRoutineStatus)
  status?: PredictiveRoutineStatus;

  @IsOptional()
  includeExpired?: boolean = false;
}