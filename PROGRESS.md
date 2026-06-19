# Fixr Platform — Progress Snapshot
_Last updated: 2026-06-19_

## Overall Status

| App | Status |
|---|---|
| `packages/shared` | ✅ Complete |
| `apps/backend` | ✅ Complete (user actively Postman-testing) |
| `apps/mobile` | 🔄 Foundation layer done, screens not started |
| `apps/admin` | ❌ Not started |

---

## Backend (`apps/backend`) — COMPLETE

All modules implemented and committed. Last commit: `118ae6d feat(backend): complete all remaining API modules`.

### Architecture
- **Framework**: NestJS 11 with `@nestjs/platform-fastify`
- **ORM**: Prisma 6, PostgreSQL 17
- **Port**: 3001
- **Global prefix**: `/api/v1`
- **Auth guards**: `JwtAuthGuard` (user JWT), `AdminGuard` (admin email+pass JWT)

### Module Inventory

| Module | Key Files | Status |
|---|---|---|
| Auth | `auth.service.ts`, `otp.service.ts`, `token.service.ts` | ✅ |
| Jobs | `jobs.service.ts`, `job-state-machine.ts`, `jobs.no-show.ts` | ✅ |
| Bids | `bids.service.ts`, `bids.controller.ts` | ✅ |
| Credits | `credits.service.ts`, `credits-admin.service.ts` | ✅ |
| Notifications | `notifications.service.ts`, `firebase.provider.ts` | ✅ |
| Admin | `admin.service.ts`, `admin.controller.ts` | ✅ |
| Chat | `chat.service.ts` | ✅ |
| Media | `media.service.ts` (Cloudinary proxy) | ✅ |
| Reviews | `reviews.service.ts` | ✅ |
| No-show cron | `jobs.no-show.ts` (`@Cron(EVERY_10_MINUTES)`) | ✅ |

### Prisma Schema Models (15)
`User`, `RefreshToken`, `AdminProfile`, `ExpertProfile`, `Zone`, `ExpertZone`, `Category`, `Job`, `JobMedia`, `Bid`, `CreditBalance`, `CreditTransaction`, `CreditRate`, `Notification`, `Review`, `Dispute`, `OtpSession`

### Known Business Logic Details
- **Dev OTP bypass**: When `NODE_ENV !== 'production'`, OTP is set to `DEV_OTP_CODE` (default `000000`); code returned in response message
- **Token rotation**: Refresh tokens are opaque, stored in DB, deleted and reissued on each use; 30-day expiry
- **Credit atomicity**: `spendCredit()` uses a Prisma transaction; throws 400 on insufficient balance
- **Job state machine**: Declarative `TRANSITIONS` record in `job-state-machine.ts`; each target state specifies `from[]` and `allowedRoles[]`
- **Completion stats**: `updateExpertCompletionStats()` called on `transition()` when target = COMPLETED
- **No-show**: Finds ASSIGNED jobs where `assignedAt + ETA + 2h < now`; atomically increments `noShowCount`, clears `acceptedBidId`, returns job to OPEN
- **Expert profile**: Auto-created (empty) when user registers with `role = EXPERT`
- **Welcome credits**: Granted only when admin sets verification status to VERIFIED
- **Chat access**: `getChatToken()` gate checks job status is in `[ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED, COMPLETED]`

### Seed Data
Run `bun run prisma:seed` to populate:
- Admin: `admin@fixr.af` / `Fixr@Admin2025!`
- Credit rate: 50 AFN/credit, 5 welcome credits, 30-day expiry
- 12 Kabul zones with GPS (کارته سه, خیر خانه, شهر نو, ماکروریان, خواجه بغرا, تایمنی, دارالامان, کارته چهار, کارته پنج, وزیر اکبر خان, سرای شمالی, چهارراهی قمبر)
- 8 categories (لوله‌کشی, برق‌کاری, نجاری, رنگ‌کاری, تعمیر لوازم خانگی, نظافت, ساختمان‌سازی, سایر)

---

## Shared Package (`packages/shared`) — COMPLETE

### `src/enums.ts`
`UserRole`, `JobStatus`, `Urgency`, `VerificationStatus`, `DisputeReason`, `CreditTransactionType`, `NotificationType`, `Language`

### `src/types.ts`
`ApiResponse<T>`, `PaginatedResponse<T>`, `ExpertProfile`, `JobSummary`, `BidSummary`

---

## Mobile App (`apps/mobile`) — FOUNDATION ONLY

### What Exists

All files in `apps/mobile/src/`:

**`constants/`**
- `theme.ts` — `Colors`, `FontSize`, `Spacing`, `Radius` — single source of truth for design tokens

**`i18n/`**
- `index.ts` — i18next init; fa primary, en fallback; defaultNS = 'common'
- `fa/common.ts` — Dari translations
- `en/common.ts` — English translations

**`hooks/`**
- `useRTL.ts` — returns `{ isRTL, textAlign, flexDirection }`; calls `I18nManager.forceRTL()` when language changes

**`stores/`**
- `auth.store.ts` — Zustand store with `user`, `accessToken`, `isLoading`; persists to SecureStore; keys: `fixr_access_token`, `fixr_refresh_token`, `fixr_user`

**`services/`**
- `api.ts` — axios instance; request interceptor attaches Bearer token; response interceptor handles 401 → refresh → retry; auto-clears storage on refresh failure
- `auth.service.ts` — `sendOtp`, `verifyOtp`, `login`, `register`, `refresh`, `logout`
- `jobs.service.ts` — `create`, `update`, `publish`, `cancel`, `deleteDraft`, `list`, `browse`, `get`, all 5 state transition calls
- `bids.service.ts` — `place`, `update`, `withdraw`, `accept`, `listForJob`, `mine`
- `notifications.service.ts` — `list`, `markRead`, `markAllRead`, `registerPushToken`
- `lookup.service.ts` — `categories`, `zones`

**`components/ui/`**
- `Text.tsx` — variants: h1/h2/h3/body/sm/xs/label; RTL-aware textAlign
- `Button.tsx` — primary/outline/ghost/danger × sm/md/lg; loading spinner; fullWidth
- `Card.tsx` — bgCard dark card with Radius.lg
- `Badge.tsx` — emergency/today/bidSent/active/done with correct colors matching UI mockups
- `Input.tsx` — RTL-aware, error state, dark styling
- `ScreenWrapper.tsx` — scroll/non-scroll, RefreshControl, SafeAreaView
- `Divider.tsx`
- `StarRating.tsx`
- `FixrLogo.tsx` — "fix" white + "r" teal

**`utils/`**
- `format.ts` — `formatAFN`, `formatAFNEn`, `formatRelativeTime`, `formatDuration`, `formatArrival`

**`app/`**
- `_layout.tsx` — RootLayout: GestureHandlerRootView + SafeAreaProvider + StatusBar dark + Stack with `(auth)`, `(homeowner)`, `(expert)` groups; calls `authStore.initialize()` on mount
- `index.tsx` — placeholder redirect (needs proper auth guard logic)

### What Does NOT Exist Yet
- Auth screens: `(auth)/phone.tsx`, `(auth)/otp.tsx`, `(auth)/register.tsx`, `(auth)/_layout.tsx`
- Expert screens: all of `(expert)/`
- Homeowner screens: all of `(homeowner)/`
- Shared screens: chat, review, dispute

### None of the mobile files have been committed yet.

---

## Known Issues / Half-Finished Items

### Backend (discovered during authoring, may or may not affect testing)
1. **No rate limiting on OTP endpoint** — should be added before production; low priority for dev
2. **Expert profile completionRate** — added as `completionRate Float @default(0)` in schema; verify migration applied
3. **`/auth/refresh` endpoint** — the mobile `api.ts` interceptor calls it; confirm the backend route matches exactly `POST /api/v1/auth/refresh` with body `{ refreshToken }` and returns `{ accessToken, refreshToken }`

### Mobile
1. `app/index.tsx` is a placeholder — needs proper auth + role check before routing to `(homeowner)` or `(expert)`
2. `notifications.service.ts` uses `Notifications.getExpoPushTokenAsync()` without `projectId` argument — may need `{ projectId: Constants.expoConfig.extra.eas.projectId }` for production builds

---

## Docs

`docs/api-reference.md` — 1043-line complete REST API reference with:
- All 50+ endpoints (request/response shapes, error cases, side effects)
- Job lifecycle state diagram
- Notification type table
- Environment variable reference
- Setup/seed instructions
