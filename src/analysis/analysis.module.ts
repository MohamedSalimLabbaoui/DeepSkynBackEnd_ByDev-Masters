import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisTestController } from './analysis-test.controller';
import { GeminiService } from './services/gemini.service';
import { SupabaseService } from './services/supabase.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SkinProfileModule,
    NotificationModule,
  ],
  controllers: [AnalysisController, AnalysisTestController],
  providers: [AnalysisService, GeminiService, SupabaseService],
  exports: [AnalysisService, GeminiService, SupabaseService],
})
export class AnalysisModule {}
