import { Module } from '@nestjs/common';
import { FaceVerificationController } from './face-verification.controller';
import { FaceVerificationService } from './face-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [PrismaModule, AnalysisModule],
  controllers: [FaceVerificationController],
  providers: [FaceVerificationService],
  exports: [FaceVerificationService],
})
export class FaceVerificationModule {}
