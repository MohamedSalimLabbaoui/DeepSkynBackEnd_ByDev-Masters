import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChangeType {
  REORDER = 'reorder',
  ADD_STEP = 'add_step',
  REMOVE_STEP = 'remove_step',
}

export class AdviseRoutineDto {
  @ApiProperty({
    description: 'Type of change made to the routine',
    enum: ChangeType,
    example: 'reorder',
  })
  @IsEnum(ChangeType)
  changeType: ChangeType;

  @ApiProperty({
    description: 'Current steps after the change (name list)',
    type: [String],
    example: ['Cleanser', 'Vitamin C Serum', 'SPF'],
  })
  @IsArray()
  @IsString({ each: true })
  currentSteps: string[];

  @ApiPropertyOptional({
    description: 'Description of the change made',
    example: 'Moved Vitamin C before SPF',
  })
  @IsString()
  @IsOptional()
  changeDescription?: string;

  @ApiPropertyOptional({
    description: 'Name of the step that was added',
    example: 'Niacinamide Serum',
  })
  @IsString()
  @IsOptional()
  addedStepName?: string;
}
