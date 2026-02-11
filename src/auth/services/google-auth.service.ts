import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

export interface GoogleAuthResult {
  user: Partial<User>;
  isNewUser: boolean;
  accessToken?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly oauthClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.oauthClient = new OAuth2Client(this.googleClientId);
  }

  /**
   * Vérifier et authentifier via Google ID Token (pour mobile/SPA)
   * Le client envoie le idToken obtenu depuis Google Sign-In
   */
  async authenticateWithIdToken(idToken: string): Promise<GoogleAuthResult> {
    try {
      // Vérifier le token Google
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Token Google invalide');
      }

      const { sub: googleId, email, name, picture, email_verified } = payload;

      if (!email) {
        throw new UnauthorizedException('Email non disponible dans le token Google');
      }

      // Chercher ou créer l'utilisateur
      return this.findOrCreateUser({
        googleId,
        email,
        name: name || email.split('@')[0],
        avatar: picture || null,
        emailVerified: email_verified || false,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Google authentication failed', error);
      throw new UnauthorizedException('Échec de l\'authentification Google');
    }
  }

  /**
   * Authentifier via le callback OAuth2 (pour web redirect flow)
   */
  async authenticateWithProfile(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
    emailVerified: boolean;
  }): Promise<GoogleAuthResult> {
    return this.findOrCreateUser(profile);
  }

  /**
   * Trouver ou créer un utilisateur basé sur les infos Google
   */
  private async findOrCreateUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string | null;
    emailVerified: boolean;
  }): Promise<GoogleAuthResult> {
    // 1. Chercher par googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (user) {
      // Utilisateur existant trouvé par googleId - mettre à jour les infos
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: profile.avatar || user.avatar,
          lastActivity: new Date(),
        },
      });

      return {
        user: this.sanitizeUser(user),
        isNewUser: false,
      };
    }

    // 2. Chercher par email (l'utilisateur a peut-être un compte classique)
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingByEmail) {
      // Lier le compte Google au compte existant
      user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          avatar: profile.avatar || existingByEmail.avatar,
          emailVerified: true,
          lastActivity: new Date(),
        },
      });

      return {
        user: this.sanitizeUser(user),
        isNewUser: false,
      };
    }

    // 3. Créer un nouvel utilisateur
    user = await this.prisma.user.create({
      data: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        emailVerified: profile.emailVerified,
        onboardingComplete: false,
        role: 'user',
      },
    });

    this.logger.log(`New user created via Google: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      isNewUser: true,
    };
  }

  /**
   * Supprimer les champs sensibles de l'utilisateur
   */
  private sanitizeUser(user: User): Partial<User> {
    const { password, refreshToken, twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }
}
