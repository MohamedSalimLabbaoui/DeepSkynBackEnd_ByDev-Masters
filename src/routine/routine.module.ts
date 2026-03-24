import { Module } from '@nestjs/common';
import { RoutineService } from './routine.service';
import { RoutineController } from './routine.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { NotificationModule } from '../notification/notification.module';
import { CrawlingModule } from '../crawling/crawling.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule,
    SkinProfileModule,
    NotificationModule,
    CrawlingModule,
  ],
  controllers: [RoutineController],
  providers: [RoutineService],
  exports: [RoutineService],
})
export class RoutineModule {}
