import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisTestController } from './analysis-test.controller';
import { GeminiService } from './services/gemini.service';
import { GrokService } from './services/grok.service';
import { SupabaseService } from './services/supabase.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SkinProfileModule,
    NotificationModule,
    SubscriptionModule,
  ],
  controllers: [AnalysisController, AnalysisTestController],
  providers: [AnalysisService, GeminiService, GrokService, SupabaseService],
  exports: [AnalysisService, GeminiService, GrokService, SupabaseService],
})
export class AnalysisModule {}
