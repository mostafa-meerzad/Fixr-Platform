import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const OTP_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    // Enforce cooldown: block if a non-expired, recent session exists
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
    const code = isDev
      ? (this.config.get<string>('DEV_OTP_CODE') ?? '000000')
      : this.generateCode();

    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES', 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.prisma.otpSession.create({
      data: { phone, code, expiresAt },
    });

    if (isDev) {
      return { message: `[DEV] OTP bypass active. Use code: ${code}` };
    }

    await this.sendWhatsAppMessage(phone, code);

    return { message: 'Verification code sent via WhatsApp.' };
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
      throw new BadRequestException('No active verification session found. Request a new code.');
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Request a new code.');
    }

    if (session.code !== code) {
      await this.prisma.otpSession.update({
        where: { id: session.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - session.attempts - 1;
      throw new BadRequestException(
        `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    const existingUser = await this.prisma.user.findUnique({ where: { phone } });

    return { sessionId: session.id, isNewUser: !existingUser };
  }

  async consumeSession(sessionId: string, phone: string): Promise<void> {
    const session = await this.prisma.otpSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.verified || session.phone !== phone) {
      throw new BadRequestException('Invalid or expired verification session.');
    }

    // Delete so it cannot be reused
    await this.prisma.otpSession.delete({ where: { id: sessionId } });
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // private async sendWhatsAppMessage(phone: string, code: string): Promise<void> {
  //   const apiUrl = this.config.getOrThrow<string>('WHATSAPP_API_URL');
  //   const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
  //   const accessToken = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');

  //   try {
  //     await axios.post(
  //       `${apiUrl}/${phoneNumberId}/messages`,
  //       {
  //         messaging_product: 'whatsapp',
  //         to: phone,
  //         type: 'template',
  //         template: {
  //           name: 'fixr_otp',
  //           language: { code: 'fa' },
  //           components: [
  //             {
  //               type: 'body',
  //               parameters: [{ type: 'text', text: code }],
  //             },
  //           ],
  //         },
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${accessToken}`,
  //           'Content-Type': 'application/json',
  //         },
  //       },
  //     );
  //   } catch (err: unknown) {
  //     const message =
  //       err instanceof Error ? err.message : 'Unknown error';
  //     throw new InternalServerErrorException(
  //       `Failed to send WhatsApp message: ${message}`,
  //     );
  //   }
  // }
  
  private async sendWhatsAppMessage(phone: string, code: string): Promise<void> {
  const apiUrl = this.config.getOrThrow<string>('WHATSAPP_API_URL'); // Ensure .env uses v25.0
  const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');

  // Strip all non-numeric characters (removes +, spaces, hyphens)
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: 'hello_world', // Verify this template exists or use Meta's default testing name
          language: { code: 'en_US' }, // Meta requires this to match your approved template language exactly
          
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err: any) {
    // Log the exact error object returned from Meta's servers for debugging
    const metaError = err.response?.data?.error?.message || err.message;
    throw new InternalServerErrorException(
      `Failed to send WhatsApp message: ${metaError}`,
    );
  }
}

}
