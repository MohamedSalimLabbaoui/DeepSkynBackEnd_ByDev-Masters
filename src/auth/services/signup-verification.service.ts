import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { RequestSignupCodeDto } from '../dto/request-signup-code.dto';

interface PendingSignupVerification {
  email: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attemptsLeft: number;
  payload: RequestSignupCodeDto;
}

@Injectable()
export class SignupVerificationService {
  private readonly logger = new Logger(SignupVerificationService.name);
  private readonly CODE_TTL_MS = 10 * 60 * 1000;
  private readonly RESEND_COOLDOWN_MS = 60 * 1000;
  private readonly MAX_ATTEMPTS = 5;
  private readonly pendingVerifications = new Map<string, PendingSignupVerification>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async requestCode(payload: RequestSignupCodeDto): Promise<{ message: string; expiresInSeconds: number }> {
    const email = payload.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('Un compte avec cet email existe deja.');
    }

    const existingPending = this.pendingVerifications.get(email);
    if (existingPending && existingPending.resendAvailableAt.getTime() > Date.now()) {
      const retryAfter = Math.ceil(
        (existingPending.resendAvailableAt.getTime() - Date.now()) / 1000,
      );
      throw new HttpException(
        `Veuillez attendre ${retryAfter}s avant de redemander un code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateNumericCode();
    const codeHash = this.hashCode(code);
    const now = Date.now();

    this.pendingVerifications.set(email, {
      email,
      codeHash,
      attemptsLeft: this.MAX_ATTEMPTS,
      expiresAt: new Date(now + this.CODE_TTL_MS),
      resendAvailableAt: new Date(now + this.RESEND_COOLDOWN_MS),
      payload: {
        ...payload,
        email,
      },
    });

    try {
      await this.mailService.sendSignupVerificationCode(
        email,
        payload.name || email,
        code,
        Math.floor(this.CODE_TTL_MS / 60000),
      );
    } catch (error) {
      this.pendingVerifications.delete(email);
      this.logger.error(`Failed to send signup verification code to ${email}`, error?.stack);
      throw new BadRequestException("Impossible d'envoyer le code de verification pour le moment.");
    }

    return {
      message: 'Code de verification envoye par email.',
      expiresInSeconds: Math.floor(this.CODE_TTL_MS / 1000),
    };
  }

  verifyCodeAndConsume(emailInput: string, code: string): RequestSignupCodeDto {
    const email = emailInput.toLowerCase().trim();
    const pending = this.pendingVerifications.get(email);

    if (!pending) {
      throw new BadRequestException('Aucune demande de verification en cours pour cet email.');
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      this.pendingVerifications.delete(email);
      throw new BadRequestException('Le code de verification a expire.');
    }

    const providedHash = this.hashCode(code.trim());
    if (providedHash !== pending.codeHash) {
      pending.attemptsLeft -= 1;
      if (pending.attemptsLeft <= 0) {
        this.pendingVerifications.delete(email);
        throw new BadRequestException('Code incorrect. Veuillez redemander un nouveau code.');
      }

      throw new BadRequestException(
        `Code incorrect. Il vous reste ${pending.attemptsLeft} tentative(s).`,
      );
    }

    this.pendingVerifications.delete(email);
    return pending.payload;
  }

  private generateNumericCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
