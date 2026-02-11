import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ChurnService } from './churn.service';
import { ChurnController } from './churn.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [ChurnController],
  providers: [ChurnService],
  exports: [ChurnService],
})
export class ChurnModule {}
