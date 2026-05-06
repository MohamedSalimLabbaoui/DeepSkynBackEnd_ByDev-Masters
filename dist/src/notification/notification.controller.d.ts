import { NotificationService, NotificationWithCount } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { Notification } from '@prisma/client';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    create(createNotificationDto: CreateNotificationDto): Promise<Notification>;
    broadcast(broadcastDto: BroadcastNotificationDto): Promise<{
        count: number;
    }>;
    findAll(userId: string, page: number, limit: number, unreadOnly: boolean): Promise<NotificationWithCount>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    findOne(id: string, userId: string): Promise<Notification>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<{
        count: number;
    }>;
    update(id: string, userId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification>;
    remove(id: string, userId: string): Promise<void>;
    removeAll(userId: string): Promise<{
        count: number;
    }>;
    cleanup(days: number): Promise<{
        count: number;
    }>;
}
