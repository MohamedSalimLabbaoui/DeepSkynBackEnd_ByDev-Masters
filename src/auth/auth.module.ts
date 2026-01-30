import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from '../user/auth.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule { }
