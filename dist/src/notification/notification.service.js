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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_gateway_1 = require("./notification.gateway");
let NotificationService = class NotificationService {
    constructor(prisma, notificationGateway) {
        this.prisma = prisma;
        this.notificationGateway = notificationGateway;
    }
    async create(createNotificationDto) {
        const notification = await this.prisma.notification.create({
            data: {
                userId: createNotificationDto.userId,
                title: createNotificationDto.title,
                message: createNotificationDto.message,
                type: createNotificationDto.type || 'info',
                actionUrl: createNotificationDto.actionUrl,
            },
        });
        this.notificationGateway.sendNotificationToUser(createNotificationDto.userId, notification);
        return notification;
    }
    async createMany(notifications) {
        const result = await this.prisma.notification.createMany({
            data: notifications.map((n) => ({
                userId: n.userId,
                title: n.title,
                message: n.message,
                type: n.type || 'info',
                actionUrl: n.actionUrl,
            })),
        });
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
    async broadcast(title, message, type = 'info', actionUrl) {
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
        this.notificationGateway.broadcastNotification({
            title,
            message,
            type,
            actionUrl,
            createdAt: new Date(),
        });
        return result;
    }
    async findAllByUser(userId, page = 1, limit = 20, unreadOnly = false) {
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
    async findOne(id, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        return notification;
    }
    async markAsRead(id, userId) {
        const notification = await this.findOne(id, userId);
        const updated = await this.prisma.notification.update({
            where: { id: notification.id },
            data: { isRead: true },
        });
        this.notificationGateway.sendNotificationReadStatus(userId, id, true);
        return updated;
    }
    async markAllAsRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        this.notificationGateway.sendAllNotificationsRead(userId);
        return result;
    }
    async update(id, userId, updateNotificationDto) {
        await this.findOne(id, userId);
        return this.prisma.notification.update({
            where: { id },
            data: updateNotificationDto,
        });
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        const deleted = await this.prisma.notification.delete({
            where: { id },
        });
        this.notificationGateway.sendNotificationDeleted(userId, id);
        return deleted;
    }
    async removeAll(userId) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId },
        });
        this.notificationGateway.sendAllNotificationsDeleted(userId);
        return result;
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
    async deleteOldNotifications(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        return this.prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                isRead: true,
            },
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_gateway_1.NotificationGateway])
], NotificationService);
//# sourceMappingURL=notification.service.js.map