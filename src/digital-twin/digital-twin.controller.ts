import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DigitalTwinService } from './digital-twin.service';
import {
  CreateSnapshotDto,
  SimulateProductDto,
  GetPredictionDto,
  UpdateSimulationDto,
} from './dto/twin.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';

@Controller('digital-twin')
@UseGuards(KeycloakAuthGuard)
export class DigitalTwinController {
  constructor(private readonly twinService: DigitalTwinService) {}

  // 🎯 GET /digital-twin - Récupérer l'état complet du jumeau numérique
  @Get()
  async getTwin(@Req() req) {
    return this.twinService.getTwinState(req.user.userId);
  }

  // 📸 POST /digital-twin/snapshot - Capturer un snapshot de peau
  @Post('snapshot')
  async captureSnapshot(@Req() req, @Body() dto: CreateSnapshotDto) {
    return this.twinService.captureSnapshot(req.user.userId, dto);
  }

  // 📜 GET /digital-twin/snapshots - Récupérer l'historique des snapshots
  @Get('snapshots')
  async getSnapshots(@Req() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.twinService.getSnapshots(req.user.userId, limitNum);
  }

  // 🔍 GET /digital-twin/snapshots/compare - Comparer deux snapshots
  @Get('snapshots/compare')
  async compareSnapshots(
    @Req() req,
    @Query('id1') id1: string,
    @Query('id2') id2: string,
  ) {
    return this.twinService.compareSnapshots(req.user.userId, id1, id2);
  }

  // 🔮 GET /digital-twin/predict - Générer prédiction future
  @Get('predict')
  async predictFuture(@Req() req, @Query() query: GetPredictionDto) {
    const daysAhead = query.daysAhead || 7;
    return this.twinService.predictFuture(req.user.userId, daysAhead);
  }

  // 🧪 POST /digital-twin/simulate-product - Simuler effet d'un produit
  @Post('simulate-product')
  async simulateProduct(@Req() req, @Body() dto: SimulateProductDto) {
    return this.twinService.simulateProduct(req.user.userId, dto);
  }

  // ✅ PATCH /digital-twin/simulations/:id - Mettre à jour simulation avec résultats
  @Patch('simulations/:id')
  async updateSimulation(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateSimulationDto,
  ) {
    return this.twinService.updateSimulation(req.user.userId, id, dto);
  }

  // 🔄 POST /digital-twin/sync - Forcer mise à jour du twin
  @Post('sync')
  async syncTwin(@Req() req) {
    await this.twinService.updateTwinFromSnapshot(req.user.userId);
    return { message: 'Digital Twin synchronized successfully' };
  }
}
