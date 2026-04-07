import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // Ensure auth module is available if needed, though we imported Guards from it
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
    imports: [PrismaModule, AnalysisModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
