import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContextualAnalysisService, AlertResult } from './contextual-analysis.service';
import { CreateSkinLogDto, WeatherAlertQueryDto } from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Contextual Analysis')
@ApiBearerAuth()
@Controller('contextual-analysis')
@UseGuards(KeycloakAuthGuard)
export class ContextualAnalysisController {
  constructor(
    private readonly contextualAnalysisService: ContextualAnalysisService,
  ) {}

  @Get('weather-alert')
  @ApiOperation({
    summary: 'Obtenir une alerte météo pour la peau',
    description:
      "Récupère les données météo (UV, qualité de l'air) et génère une alerte personnalisée pour la peau si nécessaire",
  })
  @ApiResponse({
    status: 200,
    description: 'Alerte météo générée avec succès',
  })
  async getWeatherAlert(
    @CurrentUser('id') userId: string,
    @Query() query: WeatherAlertQueryDto,
  ): Promise<AlertResult> {
    return this.contextualAnalysisService.getWeatherAlert(userId, query);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Obtenir les alertes non lues',
    description: "Récupère toutes les alertes non lues de l'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des alertes non lues',
  })
  async getUnreadAlerts(@CurrentUser('id') userId: string) {
    return this.contextualAnalysisService.getUnreadAlerts(userId);
  }

  @Get('alerts/all')
  @ApiOperation({
    summary: 'Obtenir toutes les alertes',
    description:
      "Récupère toutes les alertes de l'utilisateur avec pagination",
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des alertes',
  })
  async getAllAlerts(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contextualAnalysisService.getAllAlerts(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('alerts/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marquer une alerte comme lue',
    description: "Marque une alerte spécifique comme lue",
  })
  @ApiResponse({
    status: 200,
    description: 'Alerte marquée comme lue',
  })
  @ApiResponse({
    status: 404,
    description: 'Alerte non trouvée',
  })
  async markAlertAsRead(
    @Param('id') alertId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contextualAnalysisService.markAlertAsRead(alertId, userId);
  }

  @Patch('alerts/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marquer toutes les alertes comme lues',
    description: "Marque toutes les alertes non lues de l'utilisateur comme lues",
  })
  @ApiResponse({
    status: 200,
    description: 'Toutes les alertes marquées comme lues',
  })
  async markAllAlertsAsRead(@CurrentUser('id') userId: string) {
    return this.contextualAnalysisService.markAllAlertsAsRead(userId);
  }

  @Get('seasonal-prediction')
  @ApiOperation({
    summary: 'Obtenir la prédiction saisonnière',
    description:
      "Analyse les patterns saisonniers de la peau et génère une prédiction basée sur l'historique",
  })
  @ApiResponse({
    status: 200,
    description: 'Prédiction saisonnière générée',
  })
  async getSeasonalPrediction(@CurrentUser('id') userId: string) {
    return this.contextualAnalysisService.getSeasonalPrediction(userId);
  }

  @Post('skin-log')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Logger la condition de peau du jour',
    description:
      'Enregistre le score de condition de peau et les notes pour construire les patterns saisonniers',
  })
  @ApiResponse({
    status: 201,
    description: 'Log créé avec succès',
  })
  async createSkinLog(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSkinLogDto,
  ) {
    return this.contextualAnalysisService.createSkinLog(userId, dto);
  }

  @Get('skin-logs')
  @ApiOperation({
    summary: 'Obtenir l\'historique des logs de peau',
    description:
      'Récupère les logs de condition de peau des X derniers jours',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Nombre de jours (défaut: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des logs',
  })
  async getSkinLogs(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    return this.contextualAnalysisService.getSkinLogs(
      userId,
      days ? Number(days) : 30,
    );
  }
}
