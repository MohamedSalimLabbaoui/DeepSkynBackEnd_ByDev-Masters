import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly RESET_TOKEN_EXPIRY_HOURS = 1; // Token valide pendant 1 heure

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Demander la réinitialisation du mot de passe
   * Génère un token et envoie un email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // On retourne toujours le même message pour ne pas révéler si l'email existe
    if (!user) {
      this.logger.warn(`Tentative de reset pour un email inexistant: ${email}`);
      return {
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      };
    }

    // Vérifier si l'utilisateur a un mot de passe (pas un compte Google-only)
    if (!user.password && user.googleId) {
      this.logger.warn(`Tentative de reset pour un compte Google-only: ${email}`);
      return {
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      };
    }

    // Générer un token de réinitialisation sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RESET_TOKEN_EXPIRY_HOURS);

    // Sauvegarder le token hashé en base
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt,
      },
    });

    // Envoyer l'email avec le token non-hashé
    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.name || user.email,
        resetToken,
      );
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email de reset', error.stack);
      // On ne révèle pas l'erreur à l'utilisateur
    }

    return {
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  /**
   * Réinitialiser le mot de passe avec le token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hasher le token reçu pour le comparer avec celui en base
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Chercher l'utilisateur avec ce token et vérifier l'expiration
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(), // Le token ne doit pas être expiré
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.',
      );
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe et supprimer le token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Envoyer un email de confirmation
    try {
      await this.mailService.sendPasswordChangedEmail(
        user.email,
        user.name || user.email,
      );
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email de confirmation', error.stack);
    }

    this.logger.log(`Mot de passe réinitialisé pour l'utilisateur ${user.id}`);

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  /**
   * Vérifier si un token de réinitialisation est valide (sans le consommer)
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
      select: { email: true },
    });

    if (!user) {
      return { valid: false };
    }

    return { valid: true, email: user.email };
  }
}
