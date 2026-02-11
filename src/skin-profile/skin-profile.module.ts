import { Module } from '@nestjs/common';
import { SkinProfileService } from './skin-profile.service';
import { SkinProfileController } from './skin-profile.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SkinProfileController],
  providers: [SkinProfileService],
  exports: [SkinProfileService],
})
export class SkinProfileModule {}
