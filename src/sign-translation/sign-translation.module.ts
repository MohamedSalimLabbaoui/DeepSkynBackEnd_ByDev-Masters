import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { SignTranslationService } from './sign-translation.service';
import { SignTranslationController } from './sign-translation.controller';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [SignTranslationController],
  providers: [SignTranslationService],
  exports: [SignTranslationService],
})
export class SignTranslationModule {}
