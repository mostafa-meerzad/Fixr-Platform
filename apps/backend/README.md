# Fixr Backend

NestJS 11 + Fastify + Prisma 6 + PostgreSQL 17.

## OTP Provider

The `/auth/otp/send` and `/auth/otp/verify` endpoints are provider-agnostic.
Set `OTP_PROVIDER` in `.env` to choose the active channel:

| Value | Provider | Status |
|---|---|---|
| `telegram` *(default)* | Telegram Gateway API | Active — set `TELEGRAM_GATEWAY_TOKEN` |
| `whatsapp` | WhatsApp Business API | Ready, awaiting Meta approval |

The mobile API contract does not change when switching providers.

### Switching to Telegram (default)

```
OTP_PROVIDER=telegram
TELEGRAM_GATEWAY_TOKEN=<your token from https://gateway.telegram.org/account/api>
```

Codes sent to the account owner's own phone are free — use your number for e2e testing
before funding the account.

**Phone not reachable on Telegram:** `POST /auth/otp/send` returns HTTP 422:
```json
{ "error": "PHONE_NOT_ON_TELEGRAM", "message": "..." }
```
The mobile app should surface a fallback message when it sees this error code.

### Switching to WhatsApp

```
OTP_PROVIDER=whatsapp
WHATSAPP_API_URL=https://graph.facebook.com/v25.0
WHATSAPP_PHONE_NUMBER_ID=<Meta phone number ID>
WHATSAPP_ACCESS_TOKEN=<permanent system user token>
```

**Before this works end-to-end you must:**
1. Complete Meta Business Verification for your WhatsApp Business Account.
2. Submit and receive approval for an **Authentication** message template
   (template name `fixr_otp`, language `fa`, with one `{{1}}` body parameter).
3. Replace `hello_world` → `fixr_otp` if you used the test template during development.

The provider code in `src/auth/providers/whatsapp-otp.provider.ts` is fully implemented
and type-checked. It is not degraded or commented out — it just cannot deliver messages
until the Meta prerequisites above are met.

### Development bypass

When `NODE_ENV !== production`, the code `000000` (configurable via `DEV_OTP_CODE`)
passes verification without any API call, regardless of which provider is active.
