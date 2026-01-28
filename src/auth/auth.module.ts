import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from '../user/auth.controller';

@Module({
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule { }
