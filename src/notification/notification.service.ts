import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationGateway } from './notification.gateway';
import { Notification } from '@prisma/client';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationWithCount {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Create a new notification and send it in real-time
   */
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: createNotificationDto.userId,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type || 'info',
        actionUrl: createNotificationDto.actionUrl,
      },
    });

    // Send real-time notification via WebSocket
    this.notificationGateway.sendNotificationToUser(
      createNotificationDto.userId,
      notification,
    );

    return notification;
  }

  /**
   * Create multiple notifications at once
   */
  async createMany(
    notifications: CreateNotificationDto[],
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        actionUrl: n.actionUrl,
      })),
    });

    // Send real-time notifications
    for (const notif of notifications) {
      const created = await this.prisma.notification.findFirst({
        where: {
          userId: notif.userId,
          title: notif.title,
          message: notif.message,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (created) {
        this.notificationGateway.sendNotificationToUser(notif.userId, created);
      }
    }

    return result;
  }

  /**
   * Send notification to all users (broadcast)
   */
  async broadcast(
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string,
  ): Promise<{ count: number }> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      actionUrl,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
    });

    // Broadcast via WebSocket
    this.notificationGateway.broadcastNotification({
      title,
      message,
      type,
      actionUrl,
      createdAt: new Date(),
    });

    return result;
  }

  /**
   * Get all notifications for a user with pagination
   */
  async findAllByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<NotificationWithCount> {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Get a single notification by ID
   */
  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id, userId);

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    // Notify client about the read status change
    this.notificationGateway.sendNotificationReadStatus(userId, id, true);

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Notify client about all notifications being read
    this.notificationGateway.sendAllNotificationsRead(userId);

    return result;
  }

  /**
   * Update a notification
   */
  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: { id },
      data: updateNotificationDto,
    });
  }

  /**
   * Delete a notification
   */
  async remove(id: string, userId: string): Promise<Notification> {
    await this.findOne(id, userId);

    const deleted = await this.prisma.notification.delete({
      where: { id },
    });

    // Notify client about deletion
    this.notificationGateway.sendNotificationDeleted(userId, id);

    return deleted;
  }

  /**
   * Delete all notifications for a user
   */
  async removeAll(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Notify client about all deletions
    this.notificationGateway.sendAllNotificationsDeleted(userId);

    return result;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(
    daysOld: number = 30,
  ): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });
  }
}
