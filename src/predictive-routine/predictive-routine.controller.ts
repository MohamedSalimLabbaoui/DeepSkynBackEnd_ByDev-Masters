import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PredictiveRoutineService } from './predictive-routine.service';
import {
  UpdateRoutineStatusDto,
  GetUserRoutinesQueryDto,
} from './dto/routine-status.dto';

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

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validateRoutine(
    @CurrentUser('id') userId: string,
    @Param('id') routineId: string,
  ) {
    return this.service.validateAndActivateRoutine(userId, routineId);
  }

  /**
   * 🎯 NEW UX ENDPOINTS FOR PROFESSIONAL WORKFLOW
   */

  // Get pending routines (main dashboard view)
  @Get('pending')
  async getPendingRoutines(@CurrentUser('id') userId: string) {
    return this.service.getPendingRoutines(userId);
  }

  // Get routine history with optional filtering
  @Get()
  async getUserRoutines(
    @CurrentUser('id') userId: string,
    @Query() query: GetUserRoutinesQueryDto,
  ) {
    return this.service.getUserRoutines(
      userId,
      query.status,
      query.includeExpired,
    );
  }

  // Update routine status (core UX interaction)
  @Patch(':id/status')
  async updateRoutineStatus(
    @CurrentUser('id') userId: string,
    @Param('id') routineId: string,
    @Body() dto: UpdateRoutineStatusDto,
  ) {
    return this.service.updateRoutineStatus(userId, routineId, dto);
  }

  // Quick actions for better UX
  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  async markAsViewed(
    @CurrentUser('id') userId: string,
    @Param('id') routineId: string,
  ) {
    return this.service.markAsViewed(userId, routineId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRoutine(
    @CurrentUser('id') userId: string,
    @Param('id') routineId: string,
    @Body('implement') implement: boolean = false,
  ) {
    return this.service.acceptRoutine(userId, routineId, implement);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissRoutine(
    @CurrentUser('id') userId: string,
    @Param('id') routineId: string,
  ) {
    return this.service.dismissRoutine(userId, routineId);
  }
}
