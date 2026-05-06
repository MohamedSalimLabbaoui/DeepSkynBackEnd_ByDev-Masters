import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from '@prisma/client';
interface AuthenticatedSocket extends Socket {
    userId?: string;
}
export declare class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private userSockets;
    afterInit(server: Server): void;
    handleConnection(client: AuthenticatedSocket): void;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoin(client: AuthenticatedSocket, data: {
        userId: string;
    }): void;
    handleLeave(client: AuthenticatedSocket, data: {
        userId: string;
    }): void;
    sendNotificationToUser(userId: string, notification: Notification): void;
    sendNotificationReadStatus(userId: string, notificationId: string, isRead: boolean): void;
    sendAllNotificationsRead(userId: string): void;
    sendNotificationDeleted(userId: string, notificationId: string): void;
    sendAllNotificationsDeleted(userId: string): void;
    broadcastNotification(notification: Partial<Notification>): void;
    getOnlineUsersCount(): number;
    isUserOnline(userId: string): boolean;
    getOnlineUserIds(): string[];
}
export {};
