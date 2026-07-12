import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  OtpProvider,
  SendResult,
  VerifyResult,
} from './otp-provider.interface';

/**
 * WhatsApp Business API OTP provider.
 *
 * STATUS: Provider is fully implemented and type-safe, but requires:
 *   1. Meta business account verification
 *   2. An approved "authentication" message template (e.g. fixr_otp)
 * Until those are in place, switch to the Telegram provider via OTP_PROVIDER=telegram.
 *
 * checkSendAbility: WhatsApp has no equivalent API. This is a no-op that always
 * returns a synthetic requestId so the OtpService orchestration path stays uniform.
 * The returned value is passed into send() but ignored there.
 */
@Injectable()
export class WhatsAppOtpProvider implements OtpProvider, OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.config.get('NODE_ENV') === 'production') {
      this.config.getOrThrow('WHATSAPP_API_URL');
      this.config.getOrThrow('WHATSAPP_PHONE_NUMBER_ID');
      this.config.getOrThrow('WHATSAPP_ACCESS_TOKEN');
    }
  }

  // WhatsApp has no checkSendAbility equivalent. Return a synthetic ID so the
  // OtpService can follow the same code path regardless of active provider.
  async checkSendAbility(phone: string): Promise<string | null> {
    return `whatsapp:${phone}`;
  }

  async send(
    phone: string,
    _opts?: { checkRequestId?: string },
  ): Promise<SendResult> {
    const code = this.generateCode();
    const ttlSeconds = (this.config.get<number>('OTP_EXPIRY_MINUTES') ?? 5) * 60;

    await this.sendWhatsAppMessage(phone, code);

    return { requestId: code, ttlSeconds, code };
  }

  // requestId here is the locally generated OTP code stored in providerRequestId.
  async verify(requestId: string, code: string): Promise<VerifyResult> {
    return requestId === code ? 'valid' : 'invalid';
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async sendWhatsAppMessage(phone: string, code: string): Promise<void> {
    const apiUrl = this.config.getOrThrow<string>('WHATSAPP_API_URL');
    const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');

    const cleanPhone = phone.replace(/\D/g, '');

    try {
      await axios.post(
        `${apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'fixr_otp',
            language: { code: 'fa' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: code }],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: unknown) {
      const metaError =
        (err as any)?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : 'Unknown error');
      throw new InternalServerErrorException(
        `Failed to send WhatsApp message: ${metaError}`,
      );
    }
  }
}
