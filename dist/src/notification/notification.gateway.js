"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let NotificationGateway = NotificationGateway_1 = class NotificationGateway {
    constructor() {
        this.logger = new common_1.Logger(NotificationGateway_1.name);
        this.userSockets = new Map();
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
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
    handleJoin(client, data) {
        const { userId } = data;
        if (!userId) {
            client.emit('error', { message: 'User ID is required' });
            return;
        }
        client.userId = userId;
        client.join(`user:${userId}`);
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
    handleLeave(client, data) {
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
    sendNotificationToUser(userId, notification) {
        this.server.to(`user:${userId}`).emit('notification', notification);
        this.logger.log(`Notification sent to user ${userId}`);
    }
    sendNotificationReadStatus(userId, notificationId, isRead) {
        this.server.to(`user:${userId}`).emit('notificationRead', {
            notificationId,
            isRead,
        });
    }
    sendAllNotificationsRead(userId) {
        this.server.to(`user:${userId}`).emit('allNotificationsRead', {
            timestamp: new Date(),
        });
    }
    sendNotificationDeleted(userId, notificationId) {
        this.server.to(`user:${userId}`).emit('notificationDeleted', {
            notificationId,
        });
    }
    sendAllNotificationsDeleted(userId) {
        this.server.to(`user:${userId}`).emit('allNotificationsDeleted', {
            timestamp: new Date(),
        });
    }
    broadcastNotification(notification) {
        this.server.emit('broadcast', notification);
        this.logger.log('Broadcast notification sent to all users');
    }
    getOnlineUsersCount() {
        return this.userSockets.size;
    }
    isUserOnline(userId) {
        return (this.userSockets.has(userId) && this.userSockets.get(userId).size > 0);
    }
    getOnlineUserIds() {
        return Array.from(this.userSockets.keys());
    }
};
exports.NotificationGateway = NotificationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "handleLeave", null);
exports.NotificationGateway = NotificationGateway = NotificationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/notifications',
    })
], NotificationGateway);
//# sourceMappingURL=notification.gateway.js.map