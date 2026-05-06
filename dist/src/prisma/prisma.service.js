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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            log: process.env.NODE_ENV !== 'production'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.interactionActions = new Set([
            'create',
            'createMany',
            'update',
            'updateMany',
            'upsert',
            'delete',
            'deleteMany',
        ]);
        this.$use(async (params, next) => {
            if (!params.model ||
                params.model === 'User' ||
                !this.interactionActions.has(params.action)) {
                return next(params);
            }
            const userIds = this.extractUserIdsFromParams(params);
            const result = await next(params);
            this.collectUserIdsFromValue(result, userIds);
            if (userIds.size > 0) {
                await Promise.all([...userIds].map((userId) => this.incrementUserInteraction(userId)));
            }
            return result;
        });
    }
    extractUserIdsFromParams(params) {
        const ids = new Set();
        const payloads = [];
        if (params.args?.data)
            payloads.push(params.args.data);
        if (params.args?.where)
            payloads.push(params.args.where);
        if (params.args?.create)
            payloads.push(params.args.create);
        if (params.args?.update)
            payloads.push(params.args.update);
        for (const payload of payloads) {
            this.collectUserIdsFromValue(payload, ids);
        }
        return ids;
    }
    collectUserIdsFromValue(value, ids, depth = 0) {
        if (depth > 5 || value === null || value === undefined) {
            return;
        }
        if (typeof value === 'string') {
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                this.collectUserIdsFromValue(item, ids, depth + 1);
            }
            return;
        }
        if (typeof value !== 'object') {
            return;
        }
        const record = value;
        const userId = record.userId;
        if (typeof userId === 'string' && userId.trim().length > 0) {
            ids.add(userId);
        }
        const user = record.user;
        const connect = user?.connect;
        if (connect &&
            typeof connect.id === 'string' &&
            connect.id.trim().length > 0) {
            ids.add(connect.id);
        }
        for (const nestedValue of Object.values(record)) {
            this.collectUserIdsFromValue(nestedValue, ids, depth + 1);
        }
    }
    async incrementUserInteraction(userId) {
        try {
            await this.user.updateMany({
                where: { id: userId },
                data: {
                    interactionCount: { increment: 1 },
                },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to increment interactionCount for user ${userId}`, error instanceof Error ? error.stack : undefined);
        }
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDatabase is not allowed in production');
        }
        await this.dermatologyArticle.deleteMany();
        await this.subscription.deleteMany();
        await this.chatHistory.deleteMany();
        await this.routine.deleteMany();
        await this.analysis.deleteMany();
        await this.skinProfile.deleteMany();
        await this.notification.deleteMany();
        await this.user.deleteMany();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map