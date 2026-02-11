import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SkinProfileService, SkinProfileStats } from './skin-profile.service';
import { CreateSkinProfileDto } from './dto/create-skin-profile.dto';
import { UpdateSkinProfileDto } from './dto/update-skin-profile.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkinProfile } from '@prisma/client';

@ApiTags('Skin Profiles')
@ApiBearerAuth('JWT-auth')
@Controller('skin-profiles')
@UseGuards(KeycloakAuthGuard)
export class SkinProfileController {
  constructor(private readonly skinProfileService: SkinProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un profil de peau', description: 'Crée un nouveau profil de peau pour l\'utilisateur connecté' })
  @ApiResponse({ status: 201, description: 'Profil créé avec succès' })
  @ApiResponse({ status: 400, description: 'Profil déjà existant' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createSkinProfileDto: CreateSkinProfileDto,
  ): Promise<SkinProfile> {
    return this.skinProfileService.create(userId, createSkinProfileDto);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Créer ou mettre à jour', description: 'Crée ou met à jour le profil de peau (upsert)' })
  @ApiResponse({ status: 200, description: 'Profil créé ou mis à jour' })
  async upsert(
    @CurrentUser('userId') userId: string,
    @Body() createSkinProfileDto: CreateSkinProfileDto,
  ): Promise<SkinProfile> {
    return this.skinProfileService.upsert(userId, createSkinProfileDto);
  }

  /**
   * Get all skin profiles (Admin only)
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ profiles: SkinProfile[]; total: number }> {
    return this.skinProfileService.findAll(page, limit);
  }

  /**
   * Get skin profile statistics (Admin only)
   */
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStatistics(): Promise<SkinProfileStats> {
    return this.skinProfileService.getStatistics();
  }

  /**
   * Get profiles by skin type (Admin only)
   */
  @Get('by-skin-type/:skinType')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findBySkinType(
    @Param('skinType') skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive',
  ): Promise<SkinProfile[]> {
    return this.skinProfileService.findBySkinType(skinType);
  }

  /**
   * Get profiles by concern (Admin only)
   */
  @Get('by-concern/:concern')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findByConcern(@Param('concern') concern: string): Promise<SkinProfile[]> {
    return this.skinProfileService.findByConcern(concern);
  }

  /**
   * Get profiles by Fitzpatrick type (Admin only)
   */
  @Get('by-fitzpatrick/:type')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findByFitzpatrickType(
    @Param('type', ParseIntPipe) type: number,
  ): Promise<SkinProfile[]> {
    return this.skinProfileService.findByFitzpatrickType(type);
  }

  /**
   * Get current user's skin profile
   */
  @Get('me')
  async getMyProfile(@CurrentUser('userId') userId: string): Promise<SkinProfile> {
    return this.skinProfileService.findByUserId(userId);
  }

  /**
   * Check if current user has a skin profile
   */
  @Get('me/exists')
  async hasProfile(@CurrentUser('userId') userId: string): Promise<{ exists: boolean }> {
    const exists = await this.skinProfileService.hasProfile(userId);
    return { exists };
  }

  /**
   * Get skin profile by ID (Admin only)
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findById(@Param('id') id: string): Promise<SkinProfile> {
    return this.skinProfileService.findById(id);
  }

  /**
   * Update current user's skin profile
   */
  @Patch('me')
  async updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateSkinProfileDto: UpdateSkinProfileDto,
  ): Promise<SkinProfile> {
    return this.skinProfileService.update(userId, updateSkinProfileDto);
  }

  /**
   * Update concerns for current user
   */
  @Patch('me/concerns')
  async updateConcerns(
    @CurrentUser('userId') userId: string,
    @Body('concerns') concerns: string[],
  ): Promise<SkinProfile> {
    return this.skinProfileService.updateConcerns(userId, concerns);
  }

  /**
   * Add a concern
   */
  @Post('me/concerns/:concern')
  async addConcern(
    @CurrentUser('userId') userId: string,
    @Param('concern') concern: string,
  ): Promise<SkinProfile> {
    return this.skinProfileService.addConcern(userId, concern);
  }

  /**
   * Remove a concern
   */
  @Delete('me/concerns/:concern')
  async removeConcern(
    @CurrentUser('userId') userId: string,
    @Param('concern') concern: string,
  ): Promise<SkinProfile> {
    return this.skinProfileService.removeConcern(userId, concern);
  }

  /**
   * Update sensitivities for current user
   */
  @Patch('me/sensitivities')
  async updateSensitivities(
    @CurrentUser('userId') userId: string,
    @Body('sensitivities') sensitivities: string[],
  ): Promise<SkinProfile> {
    return this.skinProfileService.updateSensitivities(userId, sensitivities);
  }

  /**
   * Add a sensitivity
   */
  @Post('me/sensitivities/:sensitivity')
  async addSensitivity(
    @CurrentUser('userId') userId: string,
    @Param('sensitivity') sensitivity: string,
  ): Promise<SkinProfile> {
    return this.skinProfileService.addSensitivity(userId, sensitivity);
  }

  /**
   * Remove a sensitivity
   */
  @Delete('me/sensitivities/:sensitivity')
  async removeSensitivity(
    @CurrentUser('userId') userId: string,
    @Param('sensitivity') sensitivity: string,
  ): Promise<SkinProfile> {
    return this.skinProfileService.removeSensitivity(userId, sensitivity);
  }

  /**
   * Update health score
   */
  @Patch('me/health-score')
  async updateHealthScore(
    @CurrentUser('userId') userId: string,
    @Body('healthScore', ParseIntPipe) healthScore: number,
  ): Promise<SkinProfile> {
    return this.skinProfileService.updateHealthScore(userId, healthScore);
  }

  /**
   * Update skin age
   */
  @Patch('me/skin-age')
  async updateSkinAge(
    @CurrentUser('userId') userId: string,
    @Body('skinAge', ParseIntPipe) skinAge: number,
  ): Promise<SkinProfile> {
    return this.skinProfileService.updateSkinAge(userId, skinAge);
  }

  /**
   * Update last analysis timestamp
   */
  @Patch('me/last-analysis')
  async updateLastAnalysis(@CurrentUser('userId') userId: string): Promise<SkinProfile> {
    return this.skinProfileService.updateLastAnalysis(userId);
  }

  /**
   * Delete current user's skin profile
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyProfile(@CurrentUser('userId') userId: string): Promise<void> {
    await this.skinProfileService.remove(userId);
  }
}
