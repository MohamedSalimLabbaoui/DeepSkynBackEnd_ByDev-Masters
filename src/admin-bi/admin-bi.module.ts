import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBiController } from './admin-bi.controller';
import { AdminBiService } from './admin-bi.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBiController],
  providers: [AdminBiService],
})
export class AdminBiModule {}
