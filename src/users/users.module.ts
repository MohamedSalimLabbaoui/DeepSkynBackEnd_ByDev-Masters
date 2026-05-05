import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserJourneyController } from './user-journey.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { DigitalTwinModule } from '../digital-twin/digital-twin.module';
import { PredictiveRoutineModule } from '../predictive-routine/predictive-routine.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule,
    DigitalTwinModule,
    PredictiveRoutineModule,
  ],
  controllers: [UsersController, UserJourneyController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
