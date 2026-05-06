"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let MailService = MailService_1 = class MailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MailService_1.name);
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('MAIL_HOST', 'smtp.gmail.com'),
            port: this.configService.get('MAIL_PORT', 587),
            secure: false,
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASSWORD'),
            },
        });
    }
    async sendPasswordResetEmail(to, userName, resetToken) {
        const frontendUrl = (this.configService.get('FRONTEND_URL', 'http://localhost:5173') ||
            'http://localhost:5173').replace(/\/+$/, '');
        const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
        const mailOptions = {
            from: this.configService.get('MAIL_FROM', '"DeepSkyn" <noreply@deepskyn.com>'),
            to,
            subject: 'DeepSkyn - Réinitialisation de votre mot de passe',
            html: this.getPasswordResetTemplate(userName, resetUrl),
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email de réinitialisation envoyé à ${to}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de l'email à ${to}`, error.stack);
            throw new Error("Impossible d'envoyer l'email de réinitialisation");
        }
    }
    async sendPasswordChangedEmail(to, userName) {
        const mailOptions = {
            from: this.configService.get('MAIL_FROM', '"DeepSkyn" <noreply@deepskyn.com>'),
            to,
            subject: 'DeepSkyn - Votre mot de passe a été modifié',
            html: this.getPasswordChangedTemplate(userName),
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email de confirmation de changement de mot de passe envoyé à ${to}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de l'email de confirmation à ${to}`, error.stack);
        }
    }
    async sendReEngagementEmail(to, userName, riskLevel) {
        const subject = riskLevel === 'critical'
            ? 'DeepSkyn - Votre peau a besoin de vous ! 🌿'
            : 'DeepSkyn - Vous nous manquez ! ✨';
        const mailOptions = {
            from: this.configService.get('MAIL_FROM', '"DeepSkyn" <noreply@deepskyn.com>'),
            to,
            subject,
            html: this.getReEngagementTemplate(userName, riskLevel),
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email de re-engagement envoyé à ${to} (risque: ${riskLevel})`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de l'email de re-engagement à ${to}`, error.stack);
            throw error;
        }
    }
    async sendSignupVerificationCode(to, userName, code, expiresInMinutes) {
        const mailOptions = {
            from: this.configService.get('MAIL_FROM', '"DeepSkyn" <noreply@deepskyn.com>'),
            to,
            subject: 'DeepSkyn - Code de verification inscription',
            html: this.getSignupVerificationTemplate(userName, code, expiresInMinutes),
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Code de verification inscription envoye a ${to}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi du code de verification a ${to}`, error.stack);
            throw new Error("Impossible d'envoyer le code de verification");
        }
    }
    async sendReclamationProcessedEmail(to, userName) {
        const mailOptions = {
            from: this.configService.get('MAIL_FROM', '"DeepSkyn" <noreply@deepskyn.com>'),
            to,
            subject: 'DeepSkyn - Votre reclamation a ete traitee',
            html: this.getReclamationProcessedTemplate(userName),
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email de traitement reclamation envoye a ${to}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de l'envoi de l'email reclamation a ${to}`, error.stack);
            throw new Error("Impossible d'envoyer l'email de reclamation");
        }
    }
    getPasswordResetTemplate(userName, resetUrl) {
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
    getSignupVerificationTemplate(userName, code, expiresInMinutes) {
        return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 36px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">DeepSkyn</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 14px;">Verification de votre inscription</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 34px 30px;">
            <h2 style="color: #111827; margin: 0 0 12px; font-size: 22px;">Code de verification</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Bonjour <strong>${userName || 'utilisateur'}</strong>,
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Utilisez le code ci-dessous pour finaliser votre inscription DeepSkyn.
            </p>
            <div style="text-align:center; margin: 0 0 24px;">
              <span style="display:inline-block; letter-spacing: 8px; font-size: 34px; font-weight: 800; color:#0f172a; background:#f8fafc; border:1px solid #dbeafe; border-radius: 12px; padding: 12px 20px;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              Ce code expire dans <strong>${expiresInMinutes} minutes</strong>. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">2026 DeepSkyn. Tous droits reserves.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
    }
    getPasswordChangedTemplate(userName) {
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
    getReEngagementTemplate(userName, riskLevel) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
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
            .map((tip) => `
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
      </tr>`)
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
    getReclamationProcessedTemplate(userName) {
        return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding:36px 30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700;">DeepSkyn</h1>
            <p style="color:rgba(255,255,255,0.95); margin:8px 0 0; font-size:14px;">Suivi reclamation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 30px;">
            <h2 style="color:#111827; margin:0 0 14px; font-size:22px;">Votre reclamation a ete traitee</h2>
            <p style="color:#4b5563; font-size:16px; line-height:1.6; margin:0 0 18px;">
              Bonjour <strong>${userName || 'utilisateur'}</strong>,
            </p>
            <p style="color:#4b5563; font-size:16px; line-height:1.6; margin:0;">
              Nous vous confirmons que votre reclamation a ete traitee par notre equipe.
            </p>
            <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:18px 0 0;">
              Merci pour votre patience et votre confiance.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc; padding:20px 30px; text-align:center;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">2026 DeepSkyn. Tous droits reserves.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map