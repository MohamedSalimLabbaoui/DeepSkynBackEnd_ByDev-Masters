import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContextualAnalysisController } from './contextual-analysis.controller';
import { ContextualAnalysisService } from './contextual-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ContextualAnalysisController],
  providers: [ContextualAnalysisService],
  exports: [ContextualAnalysisService],
})
export class ContextualAnalysisModule {}
