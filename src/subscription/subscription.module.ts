import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [SubscriptionController, StripeWebhookController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
