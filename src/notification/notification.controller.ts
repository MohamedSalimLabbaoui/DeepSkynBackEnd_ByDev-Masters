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
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService, NotificationWithCount } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Notification } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(KeycloakAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Créer une notification', description: 'Créer une notification pour un utilisateur (Admin only)' })
  @ApiResponse({ status: 201, description: 'Notification créée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Broadcast notification', description: 'Envoyer une notification à tous les utilisateurs (Admin only)' })
  @ApiResponse({ status: 201, description: 'Notifications envoyées' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async broadcast(
    @Body() broadcastDto: BroadcastNotificationDto,
  ): Promise<{ count: number }> {
    return this.notificationService.broadcast(
      broadcastDto.title,
      broadcastDto.message,
      broadcastDto.type,
      broadcastDto.actionUrl,
    );
  }

  /**
   * Get all notifications for the current user
   */
  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly: boolean,
  ): Promise<NotificationWithCount> {
    return this.notificationService.findAllByUser(userId, page, limit, unreadOnly);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Get a single notification
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<Notification> {
    return this.notificationService.findOne(id, userId);
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, userId);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * Update a notification
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    return this.notificationService.update(id, userId, updateNotificationDto);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.notificationService.remove(id, userId);
  }

  /**
   * Delete all notifications
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async removeAll(
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    return this.notificationService.removeAll(userId);
  }

  /**
   * Cleanup old notifications (Admin only)
   */
  @Delete('cleanup/:days')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async cleanup(
    @Param('days', ParseIntPipe) days: number,
  ): Promise<{ count: number }> {
    return this.notificationService.deleteOldNotifications(days);
  }
}
