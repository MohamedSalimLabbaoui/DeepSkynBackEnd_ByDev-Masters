import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './services/two-factor.service';
import { GoogleAuthService } from './services/google-auth.service';
import { FacebookAuthService } from './services/facebook-auth.service';
import { RecaptchaService } from './services/recaptcha.service';
import { PasswordResetService } from './services/password-reset.service';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { SocialJwtStrategy } from './strategies/social-jwt.strategy';
import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'keycloak' }),
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRATION') || '7d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    GoogleAuthService,
    FacebookAuthService,
    RecaptchaService,
    PasswordResetService,
    KeycloakStrategy,
    GoogleStrategy,
    FacebookStrategy,
    SocialJwtStrategy,
    KeycloakAuthGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    TwoFactorService,
    GoogleAuthService,
    FacebookAuthService,
    RecaptchaService,
    PasswordResetService,
    KeycloakAuthGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    SocialJwtStrategy,
    RolesGuard,
  ],
})
export class AuthModule { }
