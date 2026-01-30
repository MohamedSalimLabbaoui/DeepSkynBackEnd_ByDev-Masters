import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import keycloakConfig from './config/keycloak.config';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
    load: [keycloakConfig],
  }), AuthModule, ScraperModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
