import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlingService } from './crawling.service';
import { CrawlingController } from './crawling.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [CrawlingController],
  providers: [CrawlingService],
  exports: [CrawlingService],
})
export class CrawlingModule {}
