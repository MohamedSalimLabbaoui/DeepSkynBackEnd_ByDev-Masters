import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto';

@ApiTags('Coupons')
@ApiBearerAuth('JWT-auth')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @UseGuards(KeycloakAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @CurrentUser('userId') userId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.validateCouponForCheckout(
      userId,
      dto.couponCode,
      dto.planCode,
    );
  }

  @Get('admin')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminListCoupons() {
    return this.couponsService.adminListCoupons();
  }

  @Post('admin')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('user')
  async adminCreateCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.adminCreateCoupon(dto);
  }

  @Patch('admin/:id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminUpdateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.adminUpdateCoupon(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async adminDeleteCoupon(@Param('id') id: string) {
    return this.couponsService.adminDeleteCoupon(id);
  }
}
