import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
  Param,
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
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  UpgradeSubscriptionDto,
  SubscriptionPlan,
  SubscriptionStatus,
} from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Mon abonnement',
    description: "Récupère les détails de l'abonnement actuel",
  })
  @ApiResponse({ status: 200, description: "Détails de l'abonnement" })
  @ApiResponse({ status: 404, description: 'Aucun abonnement trouvé' })
  // @UseGuards(JwtAuthGuard)
  async getMySubscription(@Req() req: any) {
    // TODO: Utiliser req.user.id quand l'auth est configurée
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.getCurrentPlanDetails(userId);
  }

  @Get('me/premium')
  @ApiOperation({
    summary: 'Vérifier premium',
    description: "Vérifie si l'utilisateur a un abonnement premium actif",
  })
  @ApiResponse({ status: 200, description: 'Statut premium retourné' })
  // @UseGuards(JwtAuthGuard)
  async checkPremium(@Req() req: any) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    const isPremium = await this.subscriptionService.isPremium(userId);
    return { isPremium };
  }

  /**
   * Obtenir les plans disponibles
   */
  @Get('plans')
  getPlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  /**
   * Mettre à niveau mon abonnement
   */
  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async upgrade(@Req() req: any, @Body() upgradeDto: UpgradeSubscriptionDto) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.upgrade(userId, upgradeDto);
  }

  /**
   * Annuler mon abonnement
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.cancel(userId);
  }

  /**
   * Réactiver mon abonnement annulé
   */
  @Post('reactivate')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async reactivate(@Req() req: any) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.reactivate(userId);
  }

  /**
   * Renouveler mon abonnement expiré
   */
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async renew(@Req() req: any) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.renew(userId);
  }

  /**
   * Mettre à jour mon abonnement
   */
  @Patch('me')
  // @UseGuards(JwtAuthGuard)
  async updateMySubscription(
    @Req() req: any,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.subscriptionService.update(userId, updateDto);
  }

  // ========== ADMIN ENDPOINTS ==========

  /**
   * [ADMIN] Obtenir les statistiques des abonnements
   */
  @Get('admin/statistics')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getStatistics() {
    return this.subscriptionService.getStatistics();
  }

  /**
   * [ADMIN] Liste tous les abonnements
   */
  @Get('admin/all')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllSubscriptions(
    @Query('plan') plan?: SubscriptionPlan,
    @Query('status') status?: SubscriptionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.subscriptionService.findAll({
      plan,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * [ADMIN] Vérifier et expirer les abonnements (normalement appelé par un cron)
   */
  @Post('admin/check-expired')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async checkExpired() {
    const count = await this.subscriptionService.checkAndExpireSubscriptions();
    return { expiredCount: count };
  }

  /**
   * [ADMIN] Créer un abonnement pour un utilisateur
   */
  @Post('admin/create/:userId')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async createForUser(
    @Param('userId') userId: string,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.create(userId, createDto);
  }
}
