import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService, KeycloakTokenResponse, KeycloakUserInfo, LoginResponse } from './auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { GoogleAuthService } from './services/google-auth.service';
import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { LoginDto } from './dto/login.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { GoogleTokenDto } from './dto/google-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetService } from './services/password-reset.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur', description: 'Authentifie un utilisateur via Keycloak avec support 2FA. Si le 2FA est activé et qu\'aucun code n\'est fourni, retourne requiresTwoFactor: true' })
  @ApiResponse({ status: 200, description: 'Connexion réussie ou 2FA requis' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides ou code 2FA invalide' })
  async login(@Body() loginDto: Login2faDto): Promise<LoginResponse> {
    return this.authService.login(loginDto.username, loginDto.password, loginDto.twoFactorCode);
  }

  // ==================== 2FA Endpoints ====================

  @Post('2fa/generate')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Générer le secret 2FA', description: 'Génère un secret TOTP et un QR code pour configurer l\'application d\'authentification' })
  @ApiResponse({ status: 200, description: 'Secret et QR code générés' })
  @ApiResponse({ status: 400, description: '2FA déjà activé' })
  async generate2fa(@CurrentUser('sub') userId: string) {
    return this.twoFactorService.generateTwoFactorSecret(userId);
  }

  @Post('2fa/enable')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activer le 2FA', description: 'Active le 2FA après vérification du code TOTP' })
  @ApiResponse({ status: 200, description: '2FA activé avec succès' })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide' })
  async enable2fa(
    @CurrentUser('sub') userId: string,
    @Body() enable2faDto: Enable2faDto,
  ) {
    return this.twoFactorService.enable(userId, enable2faDto.code);
  }

  @Post('2fa/disable')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver le 2FA', description: 'Désactive le 2FA après vérification du code' })
  @ApiResponse({ status: 200, description: '2FA désactivé' })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide' })
  async disable2fa(
    @CurrentUser('sub') userId: string,
    @Body() verify2faDto: Verify2faDto,
  ) {
    return this.twoFactorService.disable(userId, verify2faDto.code);
  }

  @Post('2fa/verify')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier un code 2FA', description: 'Vérifie un code TOTP' })
  @ApiResponse({ status: 200, description: 'Résultat de la vérification' })
  async verify2fa(
    @CurrentUser('sub') userId: string,
    @Body() verify2faDto: Verify2faDto,
  ) {
    const valid = await this.twoFactorService.verifyCode(userId, verify2faDto.code);
    return { valid };
  }

  @Get('2fa/status')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Statut du 2FA', description: 'Vérifie si le 2FA est activé pour l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Statut du 2FA' })
  async get2faStatus(@CurrentUser('sub') userId: string) {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token', description: 'Obtient un nouveau access token à partir du refresh token' })
  @ApiResponse({ status: 200, description: 'Nouveau token généré' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<KeycloakTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion', description: 'Invalide la session utilisateur sur Keycloak' })
  @ApiResponse({ status: 204, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 400, description: 'Erreur lors de la déconnexion' })
  async logout(@Body() logoutDto: LogoutDto): Promise<void> {
    return this.authService.logout(logoutDto.refresh_token);
  }

  @Get('profile')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Profil utilisateur', description: 'Récupère les informations du profil depuis Keycloak' })
  @ApiResponse({ status: 200, description: 'Profil retourné avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@Request() req): Promise<KeycloakUserInfo> {
    const token = this.extractTokenFromRequest(req);
    return this.authService.getUserInfo(token);
  }

  @Get('roles')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rôles utilisateur', description: 'Récupère les rôles de l\'utilisateur depuis le token' })
  @ApiResponse({ status: 200, description: 'Rôles retournés' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getRoles(@Request() req): Promise<{ roles: string[] }> {
    const token = this.extractTokenFromRequest(req);
    const roles = this.authService.getRolesFromToken(token);
    return { roles };
  }

  @Get('validate')
  @UseGuards(KeycloakAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Valider le token', description: 'Vérifie si le token JWT est valide' })
  @ApiResponse({ status: 200, description: 'Token valide' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async validateToken(@Request() req): Promise<{ valid: boolean; user: any }> {
    const token = this.extractTokenFromRequest(req);
    const valid = await this.authService.validateToken(token);
    const decoded = this.authService.decodeToken(token);
    return {
      valid,
      user: decoded
        ? {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            preferred_username: decoded.preferred_username,
          }
        : null,
    };
  }

  @Get('admin')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin only', description: 'Endpoint réservé aux administrateurs' })
  @ApiResponse({ status: 200, description: 'Accès autorisé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle admin requis' })
  async adminOnly(): Promise<{ message: string }> {
    return { message: 'Welcome, admin!' };
  }

  // ==================== Forgot / Reset Password ====================

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description: 'Envoie un email avec un lien de réinitialisation du mot de passe',
  })
  @ApiResponse({ status: 200, description: 'Email envoyé (si le compte existe)' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec le token reçu par email',
  })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé avec succès' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Get('reset-password/validate')
  @ApiOperation({
    summary: 'Valider un token de réinitialisation',
    description: 'Vérifie si un token de réinitialisation est encore valide',
  })
  @ApiResponse({ status: 200, description: 'Résultat de la validation' })
  async validateResetToken(@Req() req) {
    const token = req.query.token as string;
    if (!token) {
      return { valid: false };
    }
    return this.passwordResetService.validateResetToken(token);
  }

  // ==================== Google OAuth Endpoints ====================

  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion/Inscription via Google (Mobile/SPA)',
    description: 'Authentifie un utilisateur avec un Google ID Token. Crée automatiquement le compte si l\'utilisateur est nouveau.',
  })
  @ApiResponse({ status: 200, description: 'Authentification réussie' })
  @ApiResponse({ status: 401, description: 'Token Google invalide' })
  async googleTokenAuth(@Body() googleTokenDto: GoogleTokenDto) {
    return this.googleAuthService.authenticateWithIdToken(googleTokenDto.idToken);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Connexion via Google (Web Redirect)',
    description: 'Redirige vers la page de connexion Google',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers Google' })
  async googleAuth() {
    // Le guard redirige automatiquement vers Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req, @Res() res) {
    const result = await this.googleAuthService.authenticateWithProfile(req.user);

    // Rediriger vers le frontend avec les infos utilisateur
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const params = new URLSearchParams({
      userId: result.user.id as string,
      email: result.user.email as string,
      name: result.user.name as string,
      isNewUser: String(result.isNewUser),
    });

    return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  }

  private extractTokenFromRequest(req: any): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return '';
  }
}
