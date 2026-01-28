import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import keycloakConfig from './config/keycloak.config';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
    load: [keycloakConfig],
  }), AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
