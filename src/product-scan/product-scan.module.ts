import { Module } from '@nestjs/common';
import { ProductScanService } from './product-scan.service';
import { ProductScanController } from './product-scan.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [AnalysisModule],
  providers: [ProductScanService, PrismaService],
  controllers: [ProductScanController],
  exports: [ProductScanService],
})
export class ProductScanModule {}
