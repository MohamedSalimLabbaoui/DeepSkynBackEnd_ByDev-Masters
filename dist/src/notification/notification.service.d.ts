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
export declare class NotificationService {
    private readonly prisma;
    private readonly notificationGateway;
    constructor(prisma: PrismaService, notificationGateway: NotificationGateway);
    create(createNotificationDto: CreateNotificationDto): Promise<Notification>;
    createMany(notifications: CreateNotificationDto[]): Promise<{
        count: number;
    }>;
    broadcast(title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<{
        count: number;
    }>;
    findAllByUser(userId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<NotificationWithCount>;
    findOne(id: string, userId: string): Promise<Notification>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<{
        count: number;
    }>;
    update(id: string, userId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification>;
    remove(id: string, userId: string): Promise<Notification>;
    removeAll(userId: string): Promise<{
        count: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
    deleteOldNotifications(daysOld?: number): Promise<{
        count: number;
    }>;
}
