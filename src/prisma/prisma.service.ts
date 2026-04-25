import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly interactionActions = new Set([
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
  ]);

  constructor() {
    super({
      log:
        process.env.NODE_ENV !== 'production'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    this.$use(async (params, next) => {
      if (
        !params.model ||
        params.model === 'User' ||
        !this.interactionActions.has(params.action)
      ) {
        return next(params);
      }

      const userIds = this.extractUserIdsFromParams(params);
      const result = await next(params);
      this.collectUserIdsFromValue(result, userIds);

      if (userIds.size > 0) {
        await Promise.all(
          [...userIds].map((userId) => this.incrementUserInteraction(userId)),
        );
      }

      return result;
    });
  }

  private extractUserIdsFromParams(params: Prisma.MiddlewareParams): Set<string> {
    const ids = new Set<string>();

    const payloads: unknown[] = [];
    if (params.args?.data) payloads.push(params.args.data);
    if (params.args?.where) payloads.push(params.args.where);
    if (params.args?.create) payloads.push(params.args.create);
    if (params.args?.update) payloads.push(params.args.update);

    for (const payload of payloads) {
      this.collectUserIdsFromValue(payload, ids);
    }

    return ids;
  }

  private collectUserIdsFromValue(
    value: unknown,
    ids: Set<string>,
    depth = 0,
  ): void {
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

    const record = value as Record<string, unknown>;

    const userId = record.userId;
    if (typeof userId === 'string' && userId.trim().length > 0) {
      ids.add(userId);
    }

    const user = record.user as Record<string, unknown> | undefined;
    const connect = user?.connect as Record<string, unknown> | undefined;
    if (connect && typeof connect.id === 'string' && connect.id.trim().length > 0) {
      ids.add(connect.id);
    }

    for (const nestedValue of Object.values(record)) {
      this.collectUserIdsFromValue(nestedValue, ids, depth + 1);
    }
  }

  private async incrementUserInteraction(userId: string): Promise<void> {
    try {
      await this.user.updateMany({
        where: { id: userId },
        data: {
          interactionCount: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to increment interactionCount for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
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

    // Suppression dans l'ordre inverse des dépendances
    await this.dermatologyArticle.deleteMany();
    await this.subscription.deleteMany();
    await this.chatHistory.deleteMany();
    await this.routine.deleteMany();
    await this.analysis.deleteMany();
    await this.skinProfile.deleteMany();
    await this.notification.deleteMany();
    await this.user.deleteMany();
  }
}
