import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV !== 'production'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
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
