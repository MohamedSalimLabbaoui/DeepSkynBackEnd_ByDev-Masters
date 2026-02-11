import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule, // Pour GeminiService
    SkinProfileModule,
    SubscriptionModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
