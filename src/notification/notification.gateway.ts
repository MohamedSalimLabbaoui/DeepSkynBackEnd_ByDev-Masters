import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this for production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from user's socket set
    if (client.userId) {
      const userSocketIds = this.userSockets.get(client.userId);
      if (userSocketIds) {
        userSocketIds.delete(client.id);
        if (userSocketIds.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }
  }

  /**
   * Handle user authentication/joining their notification room
   */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    if (!userId) {
      client.emit('error', { message: 'User ID is required' });
      return;
    }

    client.userId = userId;
    client.join(`user:${userId}`);

    // Track user's socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    this.logger.log(`User ${userId} joined notification room`);

    client.emit('joined', {
      message: 'Successfully joined notification channel',
      userId,
    });
  }

  /**
   * Handle user leaving their notification room
   */
  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    if (userId) {
      client.leave(`user:${userId}`);
      client.userId = undefined;

      const userSocketIds = this.userSockets.get(userId);
      if (userSocketIds) {
        userSocketIds.delete(client.id);
        if (userSocketIds.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      this.logger.log(`User ${userId} left notification room`);
    }

    client.emit('left', { message: 'Successfully left notification channel' });
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user ${userId}`);
  }

  /**
   * Send notification read status update
   */
  sendNotificationReadStatus(userId: string, notificationId: string, isRead: boolean) {
    this.server.to(`user:${userId}`).emit('notificationRead', {
      notificationId,
      isRead,
    });
  }

  /**
   * Send all notifications read event
   */
  sendAllNotificationsRead(userId: string) {
    this.server.to(`user:${userId}`).emit('allNotificationsRead', {
      timestamp: new Date(),
    });
  }

  /**
   * Send notification deleted event
   */
  sendNotificationDeleted(userId: string, notificationId: string) {
    this.server.to(`user:${userId}`).emit('notificationDeleted', {
      notificationId,
    });
  }

  /**
   * Send all notifications deleted event
   */
  sendAllNotificationsDeleted(userId: string) {
    this.server.to(`user:${userId}`).emit('allNotificationsDeleted', {
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification: Partial<Notification>) {
    this.server.emit('broadcast', notification);
    this.logger.log('Broadcast notification sent to all users');
  }

  /**
   * Get count of online users
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
