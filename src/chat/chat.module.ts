import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CrawlingModule } from '../crawling/crawling.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule, // Pour GeminiService
    SkinProfileModule,
    SubscriptionModule,
    CrawlingModule, // Pour enrichir le chatbot avec des articles dermatologiques
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
