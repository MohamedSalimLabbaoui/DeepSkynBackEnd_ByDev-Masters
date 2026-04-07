import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PredictiveRoutineController } from './predictive-routine.controller';
import { PredictiveRoutineService } from './predictive-routine.service';
import { DigitalTwinModule } from '../digital-twin/digital-twin.module';

@Module({
  imports: [PrismaModule, ConfigModule, DigitalTwinModule],
  controllers: [PredictiveRoutineController],
  providers: [PredictiveRoutineService],
  exports: [PredictiveRoutineService],
})
export class PredictiveRoutineModule {}
