import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNumber, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PredictiveRoutineService } from './predictive-routine.service';

class AnalysisResultDto {
  @IsString()
  condition: string;

  @IsArray()
  @IsString({ each: true })
  detectedIssues: string[];

  @IsString()
  skinType: string;
}

class GenerateRoutineDto {
  @IsString()
  analysisId: string;

  @ValidateNested()
  @Type(() => AnalysisResultDto)
  @IsObject()
  analysisResult: AnalysisResultDto;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude: number;
}

@Controller('predictive-routine')
@UseGuards(KeycloakAuthGuard)
export class PredictiveRoutineController {
  constructor(private readonly service: PredictiveRoutineService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateRoutine(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateRoutineDto,
  ) {
    return this.service.generatePredictiveRoutine(
      userId,
      dto.analysisId,
      dto.analysisResult,
      dto.latitude,
      dto.longitude,
    );
  }
}
