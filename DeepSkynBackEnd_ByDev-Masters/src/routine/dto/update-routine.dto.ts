import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoutineType, RoutineStepDto } from './create-routine.dto';

export class UpdateRoutineDto {
  @ApiPropertyOptional({
    description: 'Nouveau nom de la routine',
    example: 'Routine du soir hydratante',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type de routine',
    enum: RoutineType,
  })
  @IsOptional()
  @IsEnum(RoutineType)
  type?: RoutineType;

  @ApiPropertyOptional({
    description: 'Nouvelles étapes de la routine',
    type: [RoutineStepDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineStepDto)
  steps?: RoutineStepDto[];

  @ApiPropertyOptional({
    description: 'Notes personnelles',
    example: 'Ajouter masque le dimanche',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Activer ou désactiver la routine',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
