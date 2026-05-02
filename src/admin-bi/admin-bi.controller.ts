import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminBiService } from './admin-bi.service';

@ApiTags('Admin BI')
@Controller('admin-bi')
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles('admin', 'ADMIN', 'realm-admin', 'super_admin', 'administrator')
@ApiBearerAuth('JWT-auth')
export class AdminBiController {
  constructor(private readonly adminBiService: AdminBiService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Advanced BI dashboard data',
    description:
      'Returns aggregated business metrics for the admin BI dashboard.',
  })
  @ApiResponse({ status: 200, description: 'BI dashboard payload returned' })
  async getDashboard() {
    return this.adminBiService.getDashboardData();
  }
}
