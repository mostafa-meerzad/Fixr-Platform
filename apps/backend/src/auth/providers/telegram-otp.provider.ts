import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  OtpProvider,
  SendResult,
  VerifyResult,
} from './otp-provider.interface';

const TELEGRAM_GATEWAY_BASE = 'https://gatewayapi.telegram.org';
const OTP_TTL_SECONDS = 300;

interface GatewayResponse<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

interface CheckSendAbilityResult {
  request_id: string;
}

interface SendVerificationResult {
  request_id: string;
  delivery_status?: string;
}

interface VerificationStatus {
  status:
    | 'code_valid'
    | 'code_invalid'
    | 'code_max_attempts_exceeded'
    | 'expired';
}

interface CheckVerificationStatusResult {
  verification_status: VerificationStatus;
}

@Injectable()
export class TelegramGatewayOtpProvider implements OtpProvider, OnModuleInit {
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.client = axios.create({ baseURL: TELEGRAM_GATEWAY_BASE });
  }

  onModuleInit(): void {
    if (this.config.get('NODE_ENV') === 'production') {
      this.config.getOrThrow('TELEGRAM_GATEWAY_TOKEN');
    }
  }

  async checkSendAbility(phone: string): Promise<string | null> {
    const token = this.config.getOrThrow<string>('TELEGRAM_GATEWAY_TOKEN');

    let data: GatewayResponse<CheckSendAbilityResult>;
    try {
      const resp = await this.client.post<GatewayResponse<CheckSendAbilityResult>>(
        '/checkSendAbility',
        { phone_number: phone },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      data = resp.data;
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      const apiError = (err as any)?.response?.data?.error;

      // 4xx from Telegram means "can't send to this number"
      if (status && status >= 400 && status < 500) {
        return null;
      }

      const message = apiError ?? (err instanceof Error ? err.message : 'Unknown error');
      throw new InternalServerErrorException(
        `Telegram checkSendAbility failed: ${message}`,
      );
    }

    if (!data.ok || !data.result?.request_id) {
      return null;
    }

    return data.result.request_id;
  }

  async send(
    phone: string,
    opts?: { checkRequestId?: string },
  ): Promise<SendResult> {
    const token = this.config.getOrThrow<string>('TELEGRAM_GATEWAY_TOKEN');

    if (!opts?.checkRequestId) {
      throw new InternalServerErrorException(
        'Telegram send requires a requestId from checkSendAbility.',
      );
    }

    let data: GatewayResponse<SendVerificationResult>;
    try {
      const resp = await this.client.post<GatewayResponse<SendVerificationResult>>(
        '/sendVerificationMessage',
        {
          phone_number: phone,
          request_id: opts.checkRequestId,
          code_length: 6,
          ttl: OTP_TTL_SECONDS,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      data = resp.data;
    } catch (err: unknown) {
      const apiError = (err as any)?.response?.data?.error;
      const message = apiError ?? (err instanceof Error ? err.message : 'Unknown error');
      throw new InternalServerErrorException(
        `Telegram sendVerificationMessage failed: ${message}`,
      );
    }

    if (!data.ok || !data.result?.request_id) {
      throw new InternalServerErrorException(
        `Telegram sendVerificationMessage returned ok=false: ${data.error ?? 'unknown'}`,
      );
    }

    return { requestId: data.result.request_id, ttlSeconds: OTP_TTL_SECONDS };
  }

  async verify(requestId: string, code: string): Promise<VerifyResult> {
    const token = this.config.getOrThrow<string>('TELEGRAM_GATEWAY_TOKEN');

    let data: GatewayResponse<CheckVerificationStatusResult>;
    try {
      const resp = await this.client.post<GatewayResponse<CheckVerificationStatusResult>>(
        '/checkVerificationStatus',
        { request_id: requestId, code },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      data = resp.data;
    } catch (err: unknown) {
      const apiError = (err as any)?.response?.data?.error;
      const message = apiError ?? (err instanceof Error ? err.message : 'Unknown error');
      throw new InternalServerErrorException(
        `Telegram checkVerificationStatus failed: ${message}`,
      );
    }

    if (!data.ok || !data.result) {
      throw new InternalServerErrorException(
        `Telegram checkVerificationStatus returned ok=false: ${data.error ?? 'unknown'}`,
      );
    }

    const status = data.result.verification_status.status;

    switch (status) {
      case 'code_valid':
        return 'valid';
      case 'code_invalid':
        return 'invalid';
      case 'code_max_attempts_exceeded':
        return 'max_attempts_exceeded';
      case 'expired':
        return 'expired';
      default:
        throw new InternalServerErrorException(
          `Unexpected Telegram verification status: ${status as string}`,
        );
    }
  }
}
