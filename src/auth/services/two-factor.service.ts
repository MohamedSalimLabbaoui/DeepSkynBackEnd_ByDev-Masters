import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { generateSecret, generateURI, verifySync, generateSync } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'DeepSkyn';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify a TOTP code against a secret
   */
  private verifyTOTP(token: string, secret: string): boolean {
    const result = verifySync({ token, secret }) as any;
    return result?.valid === true;
  }

  /**
   * Générer un secret 2FA et le QR code pour l'utilisateur
   */
  async generateTwoFactorSecret(userId: string): Promise<TwoFactorSetup> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Le 2FA est déjà activé pour ce compte');
    }

    // Générer un nouveau secret
    const secret = generateSecret();

    // Créer l'URL otpauth pour l'application d'authentification
    const otpauthUrl = generateURI({
      issuer: this.APP_NAME,
      label: user.email,
      secret,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });

    // Générer le QR code en data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Sauvegarder le secret temporairement (pas encore activé)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Activer le 2FA après vérification du code TOTP
   */
  async enable(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Le 2FA est déjà activé');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Veuillez d\'abord générer un secret 2FA');
    }

    // Vérifier le code TOTP
    const isValid = this.verifyTOTP(code, user.twoFactorSecret);

    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide');
    }

    // Activer le 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA activé avec succès' };
  }

  /**
   * Désactiver le 2FA après vérification du code
   */
  async disable(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Le 2FA n\'est pas activé');
    }

    // Vérifier le code TOTP
    const isValid = this.verifyTOTP(code, user.twoFactorSecret);

    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide');
    }

    // Désactiver le 2FA et supprimer le secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { message: '2FA désactivé avec succès' };
  }

  /**
   * Vérifier un code TOTP pour un utilisateur
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return this.verifyTOTP(code, user.twoFactorSecret);
  }

  /**
   * Vérifier si le 2FA est activé pour un utilisateur (par email)
   */
  async isTwoFactorEnabled(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Vérifier le code 2FA par email (pour le login)
   */
  async verifyCodeByEmail(email: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return this.verifyTOTP(code, user.twoFactorSecret);
  }

  /**
   * Obtenir le statut 2FA d'un utilisateur
   */
  async getStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return { enabled: user?.twoFactorEnabled ?? false };
  }
}
