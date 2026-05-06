"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const two_factor_service_1 = require("./services/two-factor.service");
const google_auth_service_1 = require("./services/google-auth.service");
const facebook_auth_service_1 = require("./services/facebook-auth.service");
const recaptcha_service_1 = require("./services/recaptcha.service");
const password_reset_service_1 = require("./services/password-reset.service");
const signup_verification_service_1 = require("./services/signup-verification.service");
const keycloak_strategy_1 = require("./strategies/keycloak.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const facebook_strategy_1 = require("./strategies/facebook.strategy");
const social_jwt_strategy_1 = require("./strategies/social-jwt.strategy");
const keycloak_auth_guard_1 = require("./guards/keycloak-auth.guard");
const google_auth_guard_1 = require("./guards/google-auth.guard");
const facebook_auth_guard_1 = require("./guards/facebook-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const prisma_module_1 = require("../prisma/prisma.module");
const mail_module_1 = require("../mail/mail.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'keycloak' }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: (config.get('JWT_EXPIRATION') || '7d'),
                    },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            two_factor_service_1.TwoFactorService,
            google_auth_service_1.GoogleAuthService,
            facebook_auth_service_1.FacebookAuthService,
            recaptcha_service_1.RecaptchaService,
            password_reset_service_1.PasswordResetService,
            signup_verification_service_1.SignupVerificationService,
            keycloak_strategy_1.KeycloakStrategy,
            google_strategy_1.GoogleStrategy,
            facebook_strategy_1.FacebookStrategy,
            social_jwt_strategy_1.SocialJwtStrategy,
            keycloak_auth_guard_1.KeycloakAuthGuard,
            google_auth_guard_1.GoogleAuthGuard,
            facebook_auth_guard_1.FacebookAuthGuard,
            roles_guard_1.RolesGuard,
        ],
        exports: [
            auth_service_1.AuthService,
            two_factor_service_1.TwoFactorService,
            google_auth_service_1.GoogleAuthService,
            facebook_auth_service_1.FacebookAuthService,
            recaptcha_service_1.RecaptchaService,
            password_reset_service_1.PasswordResetService,
            signup_verification_service_1.SignupVerificationService,
            keycloak_auth_guard_1.KeycloakAuthGuard,
            google_auth_guard_1.GoogleAuthGuard,
            facebook_auth_guard_1.FacebookAuthGuard,
            social_jwt_strategy_1.SocialJwtStrategy,
            roles_guard_1.RolesGuard,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map