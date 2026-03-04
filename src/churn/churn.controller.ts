import {
  Controller,
  Get,
  Post,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChurnService } from './churn.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Churn Prediction')
@Controller('churn')
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class ChurnController {
  constructor(private readonly churnService: ChurnService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Dashboard churn',
    description: 'Statistiques globales du churn (admin uniquement)',
  })
  @ApiResponse({ status: 200, description: 'Statistiques retournées' })
  async getStats() {
    return this.churnService.getChurnStats();
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Lancer l'analyse de churn",
    description:
      'Analyse tous les utilisateurs actifs et met à jour les scores de risque (admin uniquement)',
  })
  @ApiResponse({ status: 200, description: 'Analyse terminée' })
  async analyzeAll() {
    const result = await this.churnService.analyzeAllUsers();
    return {
      message: 'Analyse de churn terminée',
      totalUsers: result.totalUsers,
      atRiskCount: result.atRiskCount,
      criticalCount: result.criticalCount,
    };
  }

  @Get('at-risk')
  @ApiOperation({
    summary: 'Utilisateurs à risque',
    description:
      'Liste des utilisateurs avec un risque de churn élevé ou critique',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre max de résultats (défaut: 20)',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs à risque' })
  async getAtRiskUsers(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return this.churnService.getAtRiskUsers(numLimit);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: "Risque de churn d'un utilisateur",
    description: 'Analyse le risque de churn pour un utilisateur spécifique',
  })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Prédiction retournée' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async predictUser(@Param('userId') userId: string) {
    const result = await this.churnService.predictSingleUser(userId);
    if (!result) {
      return { error: 'Utilisateur non trouvé' };
    }
    return result;
  }

  @Post('send-emails')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer les emails de re-engagement',
    description:
      'Envoie manuellement les emails de re-engagement aux utilisateurs à risque (admin uniquement)',
  })
  @ApiResponse({ status: 200, description: "Résultat de l'envoi" })
  async sendEmails() {
    const result = await this.churnService.sendReEngagementEmails();
    return {
      message: 'Envoi des emails de re-engagement terminé',
      ...result,
    };
  }
}
