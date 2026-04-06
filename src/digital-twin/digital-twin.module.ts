import { Module } from '@nestjs/common';
import { DigitalTwinService } from './digital-twin.service';
import { DigitalTwinController } from './digital-twin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DigitalTwinController],
  providers: [DigitalTwinService],
  exports: [DigitalTwinService],
})
export class DigitalTwinModule {}
