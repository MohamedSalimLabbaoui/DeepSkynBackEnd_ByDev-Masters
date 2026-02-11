import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './services/two-factor.service';
import { GoogleAuthService } from './services/google-auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'keycloak' }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    GoogleAuthService,
    PasswordResetService,
    KeycloakStrategy,
    GoogleStrategy,
    KeycloakAuthGuard,
    GoogleAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, TwoFactorService, GoogleAuthService, PasswordResetService, KeycloakAuthGuard, GoogleAuthGuard, RolesGuard],
})
export class AuthModule {}
