import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RoutineService, RoutineStep } from './routine.service';
import { CreateRoutineDto, UpdateRoutineDto, GenerateRoutineDto, RoutineType } from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Routine } from '@prisma/client';

@ApiTags('Routines')
@ApiBearerAuth('JWT-auth')
@Controller('routines')
@UseGuards(KeycloakAuthGuard)
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une routine manuelle', description: 'Crée une nouvelle routine de soins personnalisée' })
  @ApiResponse({ status: 201, description: 'Routine créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createRoutineDto: CreateRoutineDto,
  ): Promise<Routine> {
    return this.routineService.create(userId, createRoutineDto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Générer routine avec IA', description: 'Génère une routine personnalisée avec l\'IA Gemini' })
  @ApiResponse({ status: 201, description: 'Routine générée avec succès' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides' })
  async generateWithAI(
    @CurrentUser('sub') userId: string,
    @Body() generateRoutineDto: GenerateRoutineDto,
  ): Promise<Routine> {
    return this.routineService.generateWithAI(userId, generateRoutineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Mes routines', description: 'Récupère toutes les routines de l\'utilisateur' })
  @ApiQuery({ name: 'type', enum: ['AM', 'PM', 'weekly'], required: false })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false })
  @ApiQuery({ name: 'isAIGenerated', type: 'boolean', required: false })
  @ApiResponse({ status: 200, description: 'Liste des routines' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('type') type?: RoutineType,
    @Query('isActive') isActive?: string,
    @Query('isAIGenerated') isAIGenerated?: string,
  ): Promise<Routine[]> {
    return this.routineService.findAllByUser(userId, {
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isAIGenerated: isAIGenerated !== undefined ? isAIGenerated === 'true' : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques routines', description: 'Récupère les statistiques des routines' })
  @ApiResponse({ status: 200, description: 'Statistiques retournées' })
  async getStatistics(@CurrentUser('sub') userId: string) {
    return this.routineService.getStatistics(userId);
  }

  @Get('active/:type')
  @ApiOperation({ summary: 'Routines actives par type', description: 'Récupère les routines actives d\'un type spécifique' })
  @ApiParam({ name: 'type', enum: ['AM', 'PM', 'weekly'] })
  @ApiResponse({ status: 200, description: 'Routines actives retournées' })
  async getActiveByType(
    @CurrentUser('sub') userId: string,
    @Param('type') type: RoutineType,
  ): Promise<Routine[]> {
    return this.routineService.findAllByUser(userId, {
      type,
      isActive: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail routine', description: 'Récupère une routine spécifique' })
  @ApiParam({ name: 'id', description: 'ID de la routine' })
  @ApiResponse({ status: 200, description: 'Routine trouvée' })
  @ApiResponse({ status: 404, description: 'Routine non trouvée' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<Routine> {
    return this.routineService.findOne(id, userId);
  }

  /**
   * Update a routine
   * PATCH /routines/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateRoutineDto: UpdateRoutineDto,
  ): Promise<Routine> {
    return this.routineService.update(id, userId, updateRoutineDto);
  }

  /**
   * Toggle routine active status
   * PATCH /routines/:id/toggle
   */
  @Patch(':id/toggle')
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<Routine> {
    return this.routineService.toggleActive(id, userId);
  }

  /**
   * Update step completion
   * PATCH /routines/:id/steps/:stepOrder/complete
   */
  @Patch(':id/steps/:stepOrder/complete')
  async completeStep(
    @Param('id') id: string,
    @Param('stepOrder') stepOrder: string,
    @CurrentUser('sub') userId: string,
    @Body('isCompleted') isCompleted: boolean,
  ): Promise<Routine> {
    return this.routineService.updateStepCompletion(
      id,
      userId,
      parseInt(stepOrder, 10),
      isCompleted,
    );
  }

  /**
   * Reset all steps completion
   * POST /routines/:id/reset
   */
  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  async resetSteps(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<Routine> {
    return this.routineService.resetStepsCompletion(id, userId);
  }

  /**
   * Add step to routine
   * POST /routines/:id/steps
   */
  @Post(':id/steps')
  async addStep(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() step: RoutineStep,
  ): Promise<Routine> {
    return this.routineService.addStep(id, userId, step);
  }

  /**
   * Remove step from routine
   * DELETE /routines/:id/steps/:stepOrder
   */
  @Delete(':id/steps/:stepOrder')
  async removeStep(
    @Param('id') id: string,
    @Param('stepOrder') stepOrder: string,
    @CurrentUser('sub') userId: string,
  ): Promise<Routine> {
    return this.routineService.removeStep(id, userId, parseInt(stepOrder, 10));
  }

  /**
   * Reorder steps
   * PATCH /routines/:id/reorder
   */
  @Patch(':id/reorder')
  async reorderSteps(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('newOrder') newOrder: number[],
  ): Promise<Routine> {
    return this.routineService.reorderSteps(id, userId, newOrder);
  }

  /**
   * Duplicate a routine
   * POST /routines/:id/duplicate
   */
  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('name') newName?: string,
  ): Promise<Routine> {
    return this.routineService.duplicate(id, userId, newName);
  }

  /**
   * Delete a routine
   * DELETE /routines/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.routineService.remove(id, userId);
  }
}
