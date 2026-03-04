import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalysisService, AnalysisStats } from './analysis.service';
import { GeminiAnalysisResult } from './services/gemini.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RealTimeScanDto } from './dto/real-time-scan.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Analysis } from '@prisma/client';

@ApiTags('Analyses')
@ApiBearerAuth('JWT-auth')
@Controller('analyses')
@UseGuards(KeycloakAuthGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiOperation({
    summary: 'Upload et analyse',
    description: "Upload d'images et création d'une analyse IA (max 5 images)",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        questionnaire: { type: 'string', description: 'Questionnaire JSON' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Analyse créée avec succès' })
  @ApiResponse({ status: 400, description: 'Images invalides' })
  async createWithUpload(
    @CurrentUser('userId') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('questionnaire') questionnaire?: string,
  ): Promise<Analysis> {
    const parsedQuestionnaire = questionnaire
      ? JSON.parse(questionnaire)
      : undefined;
    return this.analysisService.createWithImages(
      userId,
      files,
      parsedQuestionnaire,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Créer analyse depuis URLs',
    description: "Crée une analyse à partir d'URLs d'images existantes",
  })
  @ApiResponse({ status: 201, description: 'Analyse créée' })
  @ApiResponse({ status: 400, description: 'URLs invalides' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createAnalysisDto: CreateAnalysisDto,
  ): Promise<Analysis> {
    return this.analysisService.create(userId, createAnalysisDto);
  }

  /**
   * Process real-time face scan
   */
  @Post('scan')
  async realTimeScan(
    @CurrentUser('userId') userId: string,
    @Body() realTimeScanDto: RealTimeScanDto,
  ): Promise<GeminiAnalysisResult> {
    return this.analysisService.processRealTimeScan(userId, realTimeScanDto);
  }

  /**
   * Get all analyses for current user
   */
  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ analyses: Analysis[]; total: number }> {
    return this.analysisService.findAllByUser(userId, page, limit);
  }

  /**
   * Get user's analysis statistics
   */
  @Get('stats')
  async getUserStats(@CurrentUser('userId') userId: string): Promise<{
    totalAnalyses: number;
    averageHealthScore: number;
    healthScoreHistory: { date: Date; score: number }[];
    commonConditions: string[];
  }> {
    return this.analysisService.getUserStats(userId);
  }

  /**
   * Get personalized skincare advice
   */
  @Get('advice')
  async getAdvice(
    @CurrentUser('userId') userId: string,
  ): Promise<{ advice: string }> {
    const advice = await this.analysisService.getAdvice(userId);
    return { advice };
  }

  /**
   * Get latest analysis
   */
  @Get('latest')
  async getLatest(
    @CurrentUser('userId') userId: string,
  ): Promise<Analysis | null> {
    return this.analysisService.findLatest(userId);
  }

  /**
   * Get admin statistics (Admin only)
   */
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStatistics(): Promise<AnalysisStats> {
    return this.analysisService.getStatistics();
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('skinType') skinType?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('status') status?: string,
  ) {
    return this.analysisService.findAllForAdmin({
      page,
      limit,
      fromDate,
      toDate,
      skinType,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      maxScore: maxScore ? parseInt(maxScore, 10) : undefined,
      status,
    });
  }

  /**
   * Compare two analyses
   */
  @Get('compare')
  async compareAnalyses(
    @CurrentUser('userId') userId: string,
    @Query('id1') analysisId1: string,
    @Query('id2') analysisId2: string,
  ): Promise<{
    analysis1: Analysis;
    analysis2: Analysis;
    comparison: {
      healthScoreChange: number;
      skinAgeChange: number;
      newConditions: string[];
      resolvedConditions: string[];
    };
  }> {
    return this.analysisService.compareAnalyses(
      userId,
      analysisId1,
      analysisId2,
    );
  }

  /**
   * Get analysis by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<Analysis> {
    return this.analysisService.findById(id, userId);
  }

  /**
   * Retry failed analysis
   */
  @Post(':id/retry')
  async retryAnalysis(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<Analysis> {
    return this.analysisService.retryAnalysis(id, userId);
  }

  @Post('admin/:id/retry')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async retryAnalysisForAdmin(@Param('id') id: string): Promise<Analysis> {
    return this.analysisService.retryAnalysisForAdmin(id);
  }

  /**
   * Delete analysis
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.analysisService.remove(id, userId);
  }
}
