# Fixr Platform — Progress Snapshot
_Last updated: 2026-06-19_

## Overall Status

| App | Status |
|---|---|
| `packages/shared` | ✅ Complete |
| `apps/backend` | ✅ Complete (user Postman-testing) |
| `apps/mobile` | ✅ All screens done — ready to boot and test |
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

### Known Business Logic Details
- **Dev OTP bypass**: `NODE_ENV !== 'production'` → uses `DEV_OTP_CODE` (default `000000`); returned in response
- **Token rotation**: Refresh tokens opaque, stored in DB, deleted+reissued on each use; 30-day expiry
- **Credit atomicity**: `spendCredit()` uses Prisma transaction; throws 400 on insufficient balance
- **Job state machine**: Declarative `TRANSITIONS` record; each target specifies `from[]` and `allowedRoles[]`
- **Completion stats**: `updateExpertCompletionStats()` called on `transition()` when target = COMPLETED
- **No-show**: Finds ASSIGNED jobs where `assignedAt + ETA + 2h < now`; atomically resets to OPEN
- **Expert profile**: Auto-created (empty) when user registers with `role = EXPERT`
- **Welcome credits**: Granted only when admin sets verification status to VERIFIED
- **Chat access**: Gated on job status ∈ [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED, COMPLETED]

### Seed Data
Run `bun run prisma:seed`:
- Admin: `admin@fixr.af` / `Fixr@Admin2025!`
- Credit rate: 50 AFN/credit, 5 welcome credits, 30-day expiry
- 12 Kabul zones with GPS
- 8 categories in Dari

---

## Shared Package (`packages/shared`) — COMPLETE

### `src/enums.ts`
`UserRole`, `JobStatus`, `Urgency`, `VerificationStatus`, `DisputeReason`, `CreditTransactionType`, `NotificationType`, `Language`

### `src/types.ts`
`ApiResponse<T>`, `PaginatedResponse<T>`, `ExpertProfile`, `JobSummary`, `BidSummary`

---

## Mobile App (`apps/mobile`) — COMPLETE

Last commit: `9311eca feat(mobile): complete full mobile app — auth, expert, homeowner, shared screens`

### Full File Tree

```
apps/mobile/src/
├── app/
│   ├── index.tsx                      ← auth guard (→ phone OR role home)
│   ├── _layout.tsx                    ← root: GestureHandler + SafeArea + Stack
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── phone.tsx                  ← phone entry
│   │   ├── otp.tsx                    ← 6-digit OTP + resend countdown
│   │   └── register.tsx              ← name + role card picker
│   ├── (expert)/
│   │   ├── _layout.tsx               ← 5-tab: Home/Browse/Bids/Credits/Profile
│   │   ├── home.tsx                  ← availability toggle, stats, nearby jobs
│   │   ├── browse.tsx                ← category+zone filter chips
│   │   ├── bids.tsx                  ← my bids list
│   │   ├── credits.tsx               ← balance + ledger
│   │   ├── notifications.tsx
│   │   ├── profile.tsx               ← stats, verification, zones, categories
│   │   ├── job/[id].tsx             ← job detail + bid form
│   │   └── active-job/[id].tsx      ← state transitions with progress steps
│   ├── (homeowner)/
│   │   ├── _layout.tsx               ← 4-tab: Home/Jobs/Alerts/Profile
│   │   ├── home.tsx                  ← active jobs + post CTA
│   │   ├── jobs.tsx                  ← status-tab filtered list
│   │   ├── notifications.tsx
│   │   ├── profile.tsx
│   │   ├── post/
│   │   │   ├── create.tsx            ← job details form (step 1)
│   │   │   └── review.tsx            ← preview + publish/delete (step 3)
│   │   ├── job/[id].tsx             ← bids list + accept flow
│   │   └── active-job/[id].tsx      ← confirm completion + chat/call
│   └── (shared)/
│       ├── _layout.tsx
│       ├── chat/[jobId].tsx          ← Stream Chat (lazy SDK, graceful fallback)
│       └── review/[jobId].tsx        ← star picker + tag chips
├── components/ui/
│   ├── Text.tsx         Badge.tsx    Button.tsx    Card.tsx
│   ├── Input.tsx        Divider.tsx  StarRating.tsx FixrLogo.tsx
│   └── ScreenWrapper.tsx
├── constants/
│   └── theme.ts                      ← Colors, FontSize, Spacing, Radius
├── hooks/
│   └── useRTL.ts                     ← isRTL, textAlign, flexDirection
├── i18n/
│   ├── index.ts                      ← fa primary, en fallback
│   ├── fa/common.ts                  ← full Dari strings
│   └── en/common.ts                  ← full English strings
├── services/
│   ├── api.ts                        ← axios + Bearer + refresh interceptor
│   ├── auth.service.ts
│   ├── bids.service.ts
│   ├── chat.service.ts
│   ├── jobs.service.ts
│   ├── lookup.service.ts
│   ├── notifications.service.ts
│   └── reviews.service.ts
├── stores/
│   └── auth.store.ts                 ← Zustand + SecureStore
└── utils/
    └── format.ts                     ← AFN, relativeTime, duration, arrival
```

### Key Implementation Notes
- **OTP screen**: Uses a hidden `TextInput` behind visual digit boxes; cursor advances automatically
- **Register screen**: Passes `sessionId` (from `verifyOtp` response) as route param to link OTP session → new user
- **Expert home**: Fetches expert profile from `/experts/me` directly (not through a service file — uses fetch with auth token)
- **Credits/Profile**: Same pattern — direct fetch to avoid over-abstracting one-off endpoints
- **Active job (expert)**: `STATUS_ORDER` array drives the progress step dots; current step highlighted teal
- **Active job (homeowner)**: Shows confirm-completion button only when status = `COMPLETION_REQUESTED`
- **Chat screen**: `stream-chat-react-native` lazy-required so app doesn't crash if SDK not yet installed; shows error message instead
- **Review screen**: Positive tag chips shown only when rating ≥ 4; negative tags only when rating ≤ 2

### What's NOT Built (intentional scope decisions)
- `post/media.tsx` — photo upload step; backend supports it but homeowners can publish with description ≥ 50 chars instead
- `(shared)/dispute/[jobId].tsx` — dispute form; disputes can be raised via admin or added in a follow-up
- Push notification registration — needs EAS `projectId` configured for production builds
- Expert verification document upload screen — placeholder button in profile navigates to (needs backend file upload endpoint)

---

## Admin Panel (`apps/admin`) — NOT STARTED

Next phase. Tech: Next.js 15, App Router, Tailwind CSS.

Planned screens:
- Login (email + password → `/auth/admin/login`)
- Dashboard (metrics: jobs, users, revenue, disputes)
- Expert verification queue (view docs, approve/reject)
- User management (list, view, ban)
- Jobs management (list, view, intervene)
- Disputes management (list, resolve)
- Credits management (grant, adjust, ledger per expert)
- Credit rate configuration
- Zone + Category CRUD
- Notifications broadcast

---

## Known Issues / Watch Points

### Backend (found during authoring)
1. **`/auth/refresh` route shape**: Mobile sends `POST /auth/refresh` with `{ refreshToken }`, returns `{ accessToken, refreshToken }` — verify this matches the backend controller exactly
2. **`/experts/me` endpoint**: Expert home and profile screens call this directly — confirm it exists and returns `{ verificationStatus, completedJobs, noShowCount, completionRate, avgRating, creditBalance, zones[], categories[] }`
3. **No rate limiting on OTP endpoint** — add before production

### Mobile (to verify when running)
1. `Ionicons` from `@expo/vector-icons` — confirm it's in `apps/mobile/package.json`
2. `useFocusEffect` imported from `@react-navigation/native` — included in Expo SDK 55 by default
3. Stream Chat screen shows graceful error if `stream-chat-react-native` not installed — expected behavior until SDK is added
