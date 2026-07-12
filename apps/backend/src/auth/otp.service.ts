import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  OTP_PROVIDER_TOKEN,
  OtpProvider,
  VerifyResult,
} from './providers/otp-provider.interface';

const OTP_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OTP_PROVIDER_TOKEN) private readonly provider: OtpProvider,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const recent = await this.prisma.otpSession.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: { gt: new Date() },
        createdAt: {
          gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000),
        },
      },
    });

    if (recent) {
      throw new HttpException(
        `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting a new code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      const devCode = this.config.get<string>('DEV_OTP_CODE') ?? '000000';
      const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES') ?? 5;
      await this.prisma.otpSession.create({
        data: {
          phone,
          code: devCode,
          providerRequestId: devCode,
          expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        },
      });
      return { message: `[DEV] OTP bypass active. Use code: ${devCode}` };
    }

    // checkSendAbility: returns null if the number can't receive on this channel
    const checkRequestId = await this.provider.checkSendAbility(phone);
    if (checkRequestId === null) {
      throw new HttpException(
        {
          error: 'PHONE_NOT_ON_TELEGRAM',
          message:
            'This phone number cannot receive Telegram messages. Please use a different contact method.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const result = await this.provider.send(phone, { checkRequestId });

    await this.prisma.otpSession.create({
      data: {
        phone,
        code: result.code ?? null,
        providerRequestId: result.requestId,
        expiresAt: new Date(Date.now() + result.ttlSeconds * 1000),
      },
    });

    return { message: 'Verification code sent.' };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ sessionId: string; isNewUser: boolean }> {
    const session = await this.prisma.otpSession.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException(
        'No active verification session found. Request a new code.',
      );
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many incorrect attempts. Request a new code.',
      );
    }

    // Dev bypass: short-circuit regardless of active provider
    const isDev = this.config.get('NODE_ENV') !== 'production';
    const devCode = this.config.get<string>('DEV_OTP_CODE') ?? '000000';
    let verifyResult: VerifyResult;

    if (isDev && code === devCode) {
      verifyResult = 'valid';
    } else {
      // providerRequestId is the key passed to verify:
      //   - WhatsApp sessions: contains the locally generated code
      //   - Telegram sessions: contains the Telegram request_id
      //   - Legacy sessions (pre-migration): fall back to code column
      const key = session.providerRequestId ?? session.code ?? '';
      verifyResult = await this.provider.verify(key, code);
    }

    if (verifyResult === 'valid') {
      await this.prisma.otpSession.update({
        where: { id: session.id },
        data: { verified: true },
      });
      const existingUser = await this.prisma.user.findUnique({ where: { phone } });
      return { sessionId: session.id, isNewUser: !existingUser };
    }

    if (verifyResult === 'expired') {
      throw new BadRequestException(
        'Verification code has expired. Request a new code.',
      );
    }

    if (verifyResult === 'max_attempts_exceeded') {
      throw new BadRequestException(
        'Too many incorrect attempts. Request a new code.',
      );
    }

    // 'invalid' — increment local attempt counter and report remaining tries
    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - session.attempts - 1;
    throw new BadRequestException(
      `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    );
  }

  async consumeSession(sessionId: string, phone: string): Promise<void> {
    const session = await this.prisma.otpSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.verified || session.phone !== phone) {
      throw new BadRequestException('Invalid or expired verification session.');
    }

    await this.prisma.otpSession.delete({ where: { id: sessionId } });
  }
}
