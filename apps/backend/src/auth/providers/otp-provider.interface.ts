export type VerifyResult =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'max_attempts_exceeded';

export interface SendResult {
  /** Provider-assigned request identifier stored in OtpSession.providerRequestId */
  requestId: string;
  ttlSeconds: number;
  /**
   * The actual OTP code — only returned by providers that generate the code locally
   * (WhatsApp). Telegram generates the code on its side; this field is undefined.
   */
  code?: string;
}

export interface OtpProvider {
  /**
   * Checks whether the phone number can receive an OTP on this channel.
   * Must be called before `send`; pass the returned requestId into `send`
   * to avoid a double-charge on providers that bill per check.
   *
   * Returns a requestId string if the number is reachable, or null if it
   * cannot receive messages on this channel.
   */
  checkSendAbility(phone: string): Promise<string | null>;

  /**
   * Dispatches the OTP to the phone number.
   *
   * @param checkRequestId - The requestId returned by `checkSendAbility`.
   *   Required for Telegram (re-uses the charged check). Optional/ignored for WhatsApp.
   */
  send(phone: string, opts?: { checkRequestId?: string }): Promise<SendResult>;

  /**
   * Verifies the code the user entered.
   *
   * @param requestId - The value stored in OtpSession.providerRequestId:
   *   - Telegram: the Telegram request_id from sendVerificationMessage
   *   - WhatsApp: the locally generated OTP code (used as a comparison key)
   * @param code - The code the user submitted
   */
  verify(requestId: string, code: string): Promise<VerifyResult>;
}

export const OTP_PROVIDER_TOKEN = 'OTP_PROVIDER';
