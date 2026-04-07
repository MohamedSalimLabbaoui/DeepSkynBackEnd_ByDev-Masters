import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>(
        'MAIL_FROM',
        '"DeepSkyn" <noreply@deepskyn.com>',
      ),
      to,
      subject: 'DeepSkyn - Réinitialisation de votre mot de passe',
      html: this.getPasswordResetTemplate(userName, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de réinitialisation envoyé à ${to}`);
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'email à ${to}`,
        error.stack,
      );
      throw new Error("Impossible d'envoyer l'email de réinitialisation");
    }
  }

  /**
   * Envoyer un email de confirmation de changement de mot de passe
   */
  async sendPasswordChangedEmail(to: string, userName: string): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>(
        'MAIL_FROM',
        '"DeepSkyn" <noreply@deepskyn.com>',
      ),
      to,
      subject: 'DeepSkyn - Votre mot de passe a été modifié',
      html: this.getPasswordChangedTemplate(userName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email de confirmation de changement de mot de passe envoyé à ${to}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'email de confirmation à ${to}`,
        error.stack,
      );
    }
  }

  /**
   * Envoyer un email de re-engagement pour les utilisateurs à risque de churn
   */
  async sendReEngagementEmail(
    to: string,
    userName: string,
    riskLevel: 'high' | 'critical',
  ): Promise<void> {
    const subject =
      riskLevel === 'critical'
        ? 'DeepSkyn - Votre peau a besoin de vous ! 🌿'
        : 'DeepSkyn - Vous nous manquez ! ✨';

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>(
        'MAIL_FROM',
        '"DeepSkyn" <noreply@deepskyn.com>',
      ),
      to,
      subject,
      html: this.getReEngagementTemplate(userName, riskLevel),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email de re-engagement envoyé à ${to} (risque: ${riskLevel})`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'email de re-engagement à ${to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Template HTML pour l'email de réinitialisation
   */
  private getPasswordResetTemplate(userName: string, resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌿 DeepSkyn</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Votre expert skincare intelligent</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 16px; font-size: 22px;">Réinitialisation de mot de passe</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Bonjour <strong>${userName || 'utilisateur'}</strong>,
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                  <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                    Réinitialiser mon mot de passe
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
              Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            <p style="color: #aaa; font-size: 12px; line-height: 1.5;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 DeepSkyn. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML pour la confirmation de changement de mot de passe
   */
  private getPasswordChangedTemplate(userName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌿 DeepSkyn</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Votre expert skincare intelligent</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 16px; font-size: 22px;">✅ Mot de passe modifié</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Bonjour <strong>${userName || 'utilisateur'}</strong>,
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <p style="color: #e74c3c; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
              ⚠️ Si vous n'avez pas effectué ce changement, veuillez contacter notre support immédiatement.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 DeepSkyn. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML pour l'email de re-engagement (churn prevention)
   */
  private getReEngagementTemplate(
    userName: string,
    riskLevel: 'high' | 'critical',
  ): string {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const isCritical = riskLevel === 'critical';

    const heroGradient = isCritical
      ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

    const heroEmoji = isCritical ? '💜' : '✨';
    const heroTitle = isCritical
      ? 'Votre peau a besoin de vous !'
      : 'Vous nous manquez !';

    const mainMessage = isCritical
      ? `Cela fait un moment que vous n'avez pas pris soin de votre peau avec DeepSkyn. Votre routine skincare est en pause, mais votre peau continue de changer chaque jour.`
      : `Nous avons remarqué que vous n'avez pas utilisé DeepSkyn récemment. Votre parcours skincare est important, et nous sommes là pour vous accompagner.`;

    const tips = isCritical
      ? [
          {
            emoji: '📸',
            title: 'Nouvelle analyse IA',
            desc: 'Découvrez comment votre peau a évolué depuis votre dernière visite',
          },
          {
            emoji: '🧴',
            title: 'Routine personnalisée',
            desc: 'Obtenez une routine adaptée à votre type de peau actuel',
          },
          {
            emoji: '💬',
            title: "Conseils d'experts",
            desc: 'Notre IA dermatologue est prête à répondre à vos questions',
          },
          {
            emoji: '🎁',
            title: 'Surprise pour vous',
            desc: "Un cadeau vous attend dans l'application pour votre retour",
          },
        ]
      : [
          {
            emoji: '🌟',
            title: 'Suivez vos progrès',
            desc: "Voyez l'évolution de votre peau au fil du temps",
          },
          {
            emoji: '📊',
            title: 'Analyse mise à jour',
            desc: "Notre IA s'est améliorée ! Testez une nouvelle analyse",
          },
          {
            emoji: '🤝',
            title: 'Communauté active',
            desc: 'Rejoignez les discussions et partagez vos expériences',
          },
        ];

    const tipsHtml = tips
      .map(
        (tip) => `
      <tr>
        <td style="padding: 12px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="width: 50px; vertical-align: top; font-size: 28px;">${tip.emoji}</td>
              <td style="vertical-align: top;">
                <p style="color: #333; font-size: 15px; font-weight: 600; margin: 0 0 4px;">${tip.title}</p>
                <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.4;">${tip.desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
        <!-- Hero Header -->
        <tr>
          <td style="background: ${heroGradient}; padding: 50px 30px; text-align: center;">
            <p style="font-size: 48px; margin: 0 0 12px;">${heroEmoji}</p>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌿 DeepSkyn</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">${heroTitle}</p>
          </td>
        </tr>
        <!-- Main Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="color: #555; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
              Bonjour <strong>${userName}</strong>,
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
              ${mainMessage}
            </p>

            <!-- Tips Section -->
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #f8f9ff; border-radius: 12px; padding: 20px;">
              <tr>
                <td style="padding: 20px;">
                  <p style="color: #333; font-size: 16px; font-weight: 700; margin: 0 0 16px;">Ce qui vous attend :</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                    ${tipsHtml}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 36px auto;">
              <tr>
                <td style="background: ${heroGradient}; border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  <a href="${frontendUrl}" target="_blank" style="display: inline-block; padding: 18px 48px; color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; letter-spacing: 0.5px;">
                    Reprendre ma routine ✨
                  </a>
                </td>
              </tr>
            </table>

            <p style="color: #888; font-size: 14px; line-height: 1.6; text-align: center; margin: 24px 0 0;">
              Votre peau vous remerciera 💕
            </p>
          </td>
        </tr>
        <!-- Motivational Quote -->
        <tr>
          <td style="padding: 0 30px 30px;">
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="color: #e65100; font-size: 14px; font-style: italic; margin: 0; line-height: 1.5;">
                    "La beauté de la peau commence par un engagement quotidien envers soi-même. Chaque petit geste compte."
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0 0 8px;">
              © 2026 DeepSkyn. Tous droits réservés.
            </p>
            <p style="color: #bbb; font-size: 11px; margin: 0;">
              Vous recevez cet email car vous avez un compte DeepSkyn.
              <a href="${frontendUrl}/settings/notifications" style="color: #667eea;">Gérer mes préférences</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
}
