# Fixr Platform — Claude Code Instructions

## What This Project Is

Fixr is a local service marketplace for Kabul, Afghanistan. Homeowners post jobs; verified
local experts (plumbers, electricians, etc.) bid on them. Credit-based bidding, WhatsApp OTP
auth, zone-based matching, and FCM push notifications.

**Current build phase:** Rebuilding the mobile UI from scratch on a clean branch. The backend,
admin panel, and shared package are all complete and must not be touched. The goal is a
pixel-faithful implementation of the agreed design system with correct API integration.

---

## Overall Status

| App | Status |
|---|---|
| `packages/shared` | ✅ Complete — do not modify |
| `apps/backend` | ✅ Complete — do not modify |
| `apps/admin` | ✅ Complete — do not modify unless explicitly asked |
| `apps/mobile` | 🔄 In progress — clean rebuild on this branch |

---

## Monorepo Structure

```
Fixr-Platform/
├── apps/
│   ├── backend/            ← NestJS 11 + Fastify + Prisma + PostgreSQL (COMPLETE)
│   ├── mobile/             ← Expo SDK 55, React Native 0.81, expo-router (REBUILDING)
│   └── admin/              ← Next.js 15 admin panel (COMPLETE)
├── packages/
│   └── shared/             ← Shared enums, types (COMPLETE)
└── docs/
    ├── api-reference.md    ← Ground truth for all API calls — read before any integration
    ├── ui-design-system.md ← UI decisions, flows, component specs — read before any UI work
    └── designs/            ← Low-fidelity screen reference mockups — see guidance below
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11, Fastify adapter, Prisma 6, PostgreSQL 17 |
| Mobile | Expo SDK 55, React Native 0.81, expo-router (file-based), Zustand, SecureStore |
| Admin | Next.js 15, App Router, Tailwind CSS |
| Auth | WhatsApp OTP → sessionId → app issues JWT (15 min) + opaque refresh token (30 days) |
| Admin auth | Email + bcrypt password — no OTP |
| State | Zustand (mobile), server state via axios |
| i18n | i18next + react-i18next — English strings only now, Dari shell ready. Always use `t()`. RTL deferred. |
| Notifications | FCM via firebase-admin; all events stored in DB regardless of FCM result |
| Chat | Stream Chat; unlocks after bid acceptance (ASSIGNED+); 24h tokens |
| Media | Server-proxied to Cloudinary; max 10 MB image / 100 MB video / 2 min video |
| Cron | @nestjs/schedule, `EVERY_10_MINUTES`, no-show detection |

---

## Build & Run Commands

```bash
bun install

# Build everything
bun run build

# Development (using Turbo)
bun run backend
bun run admin
bun run mobile

# Specific Backend commands
cd apps/backend && bun run prisma:migrate
cd apps/backend && bun run prisma:seed
```

---

## Environment Variables

### Backend (apps/backend/.env)
```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001
ALLOWED_ORIGINS=http://localhost:8081
WHATSAPP_API_URL=https://graph.facebook.com/v19.0
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
OTP_EXPIRY_MINUTES=5
DEV_OTP_CODE=000000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
STREAM_API_KEY=
STREAM_API_SECRET=
ADMIN_EMAIL=admin@fixr.af
ADMIN_PASSWORD=Fixr@Admin2025!
NODE_ENV=development
```

### Mobile (apps/mobile/.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Authentication — WhatsApp OTP

**The backend uses WhatsApp Business API for OTP. Do not use Firebase Auth on mobile.**

Dev bypass: when `NODE_ENV !== production`, the backend accepts code `000000` without
sending a real WhatsApp message. Use `000000` for all local development and testing.

### Exact auth flow (must match api-reference.md exactly)

```
1. POST /auth/otp/send       { phone: "+93701234567" }
   → Backend sends WhatsApp OTP (or accepts 000000 in dev)

2. POST /auth/otp/verify     { phone, code }
   → Response: { sessionId, isNewUser }

3a. If isNewUser = true:
    POST /auth/register      { phone, name, role, sessionId, zoneId?, address? }
    → Response: { accessToken, refreshToken, user }
    → Navigate to role-specific onboarding

3b. If isNewUser = false:
    POST /auth/login         { phone, sessionId }
    → Response: { accessToken, refreshToken, user }
    → Navigate directly to role home tab

4. Token refresh:
   POST /auth/refresh        { refreshToken }
   → Response: { accessToken, refreshToken }

5. Logout:
   POST /auth/logout         { refreshToken }
```

### What registration collects

`/auth/register` takes `{ phone, name, role, sessionId }` for both roles, plus:

- **HOMEOWNER:** `zoneId` and `address` are **required** — collected in the registration
  screen and sent with the register call. The backend throws 400 if either is missing.
  Response includes `homeownerProfile: { zoneId, address, zone: { id, nameEn }, positivePoints, negativePoints }`.
- **EXPERT:** no zone or address at registration — experts set zones via `PATCH /users/me/zones`
  during onboarding, and shop info via `POST /users/me/submit-verification`.

There is no separate "homeowner onboarding" step — zone and address are collected on the
single register screen before calling `/auth/register`.

### Expert onboarding — two phases (separate from registration)

After registration, experts must complete verification before bidding. This is a
separate flow, not part of registration:

**Phase 1 — Upload media (must happen before submit)**
```
POST /media/expert/selfie
POST /media/expert/tazkira_front
POST /media/expert/tazkira_back
POST /media/expert/shop_image       (required)
POST /media/expert/work_license     (required)
```
Each call: multipart/form-data with field name `file`

**Phase 2 — Submit for verification**
```
POST /users/me/submit-verification  { shopName, description, shopZoneId, shopAddress }
```
- `shopZoneId` and `shopAddress` are **required**
- Backend validates that ALL 5 uploads are present (selfie + tazkira_front + tazkira_back
  + shop_image + work_license) before allowing submission
- Error if any upload is missing: `"Please upload your selfie, Tazkira (front and back), shop image, and work license before submitting."`
- On success: verificationStatus → PENDING, admin is notified

---

## i18n Setup — English Now, Dari Later

Set up i18next structure from day one. Use `t()` everywhere.
Do not hardcode any user-visible string. Do not implement RTL. Do not add Dari strings.

```
apps/mobile/src/locales/
  en.json    ← populate as you build each screen
  fa.json    ← stays as empty {} — Dari added in a later phase
```

```typescript
// apps/mobile/src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import fa from '../locales/fa.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en }, fa: { translation: fa } },
  interpolation: { escapeValue: false },
})
export default i18n
```

Key naming convention:
```json
{
  "auth": { "phone": {}, "otp": {}, "roleSelect": {}, "onboarding": {} },
  "homeowner": { "home": {}, "myJobs": {}, "messages": {}, "profile": {} },
  "expert": { "browse": {}, "myBids": {}, "messages": {}, "profile": {} },
  "common": { "loading": "Loading...", "error": "Something went wrong.", "retry": "Retry", "cancel": "Cancel", "save": "Save", "back": "Back" }
}
```

Rules:
- Always `const { t } = useTranslation()` in every screen and component
- Always `t('namespace.key')` — never raw strings in JSX
- Add English string to `en.json` when you add it to a screen
- Do NOT implement `I18nManager.forceRTL` — deferred
- Do NOT configure `Noto Naskh Arabic` font — deferred
- Do NOT build a language switcher UI — deferred
- Language fixed to English until Dari phase begins

---

## How to Use the Design References

The screenshots in `/docs/designs/` are **low-fidelity wireframes**, not pixel-perfect specs.
They show layout intent and visual direction only.

### What they ARE good for
- Overall screen layout and information hierarchy
- Which elements appear on each screen and roughly where
- Color mood — teal primary, light backgrounds, white cards
- Component types — cards, pills, bottom sheets, toggles
- Role separation — what homeowners see vs what experts see

### What they are NOT
- Pixel-perfect — do not try to match them exactly
- Complete — loading, error, and empty states are missing throughout
- Correctly sized — text appears oversized in screenshots; always use token sizes

### How to build from them
1. Look at the screenshot to understand the screen's purpose and rough layout
2. Build using ONLY tokens from `constants/theme.ts` — never copy measurements
3. Add every missing state: loading, error, empty — not optional
4. Reuse components already built in earlier screens — consistency over novelty
5. When in doubt, check `docs/ui-design-system.md` first

### Source of truth — priority order (highest to lowest)
1. **This CLAUDE.md** — tokens, rules, API contracts, business logic
2. **`docs/api-reference.md`** — exact API shapes, error codes, side effects
3. **`docs/ui-design-system.md`** — component specs, detailed flow descriptions
4. **`docs/designs/` screenshots** — rough layout feel only
5. **Established patterns from already-built screens** — fill gaps consistently

---

## Design Tokens — MANDATORY

**Light theme only. Never dark mode. Never hardcode any value.**

All tokens in `apps/mobile/src/constants/theme.ts`. Import exclusively from there.

### Colors
```typescript
export const Colors = {
  // Primary (Teal)
  primary600: '#0D9488',
  primary500: '#14B8A6',
  primary100: '#CCFBF1',
  primary50:  '#F0FDFA',

  // Neutrals
  gray900: '#111827',
  gray600: '#4B5563',
  gray400: '#9CA3AF',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  white:   '#FFFFFF',

  // Backgrounds
  bgApp:  '#F9FAFB',   // screen background — never pure white
  bgCard: '#FFFFFF',

  // Semantic
  success600: '#16A34A',
  success100: '#DCFCE7',
  warning600: '#D97706',
  warning100: '#FEF3C7',
  danger600:  '#DC2626',
  danger100:  '#FEE2E2',
  info600:    '#2563EB',
  info100:    '#DBEAFE',
}
```

### Typography
Font: `Inter` (weights 400, 500, 600, 700). Load via `expo-font`. Dari font deferred.

```typescript
export const Typography = {
  display:   { fontSize: 28, fontWeight: '700', color: Colors.primary600 },
  heading1:  { fontSize: 22, fontWeight: '700', color: Colors.primary600 },
  heading2:  { fontSize: 18, fontWeight: '600', color: Colors.gray900 },
  heading3:  { fontSize: 16, fontWeight: '600', color: Colors.gray900 },
  body:      { fontSize: 15, fontWeight: '400', color: Colors.gray600 },
  bodyMd:    { fontSize: 15, fontWeight: '500', color: Colors.gray900 },
  label:     { fontSize: 13, fontWeight: '500', color: Colors.gray600 },
  caption:   { fontSize: 12, fontWeight: '400', color: Colors.gray400 },
  captionMd: { fontSize: 12, fontWeight: '600', color: Colors.gray400 },
}
```

### Spacing (8px base grid — no arbitrary values ever)
```typescript
export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,   // gap between stacked cards
  s4: 16,   // screen horizontal padding, card internal padding
  s5: 20,
  s6: 24,   // bottom sheet padding
  s8: 32,
  s10: 40,
  s12: 48,
}
```

### Border Radius
```typescript
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,    // main cards
  xl:   24,    // bottom sheets
  full: 9999,  // pills, avatars
}
```

### Shadows
```typescript
export const Shadows = {
  sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:3,  elevation:2 },
  md: { shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.10, shadowRadius:12, elevation:4 },
  lg: { shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.12, shadowRadius:24, elevation:8 },
}
```

---

## Icon System

Library: `@expo/vector-icons` → `MaterialIcons` **filled set only**.
Never outline icons. Never emoji as icons. Never mix filled and outline.

```typescript
export const IconSize = {
  tab:    26,  // tab bar
  btn:    20,  // inside buttons
  inline: 18,  // inline with text
  status: 16,  // status indicators
  large:  40,  // empty states
}
```

All icon name strings in `constants/icons.ts` — no magic strings in screens.

---

## File & Folder Structure (Mobile)

```
apps/mobile/src/
  app/
    index.tsx                 ← auth guard → routes by role or to phone screen
    _layout.tsx               ← root Stack, SafeAreaProvider, i18n init
    (auth)/
      _layout.tsx
      phone.tsx               ← phone entry
      otp.tsx                 ← 6-digit OTP
      register.tsx            ← name + role picker + zone/address for homeowners (single screen)
      expert-onboarding/
        index.tsx             ← step indicator wrapper
        selfie.tsx            ← upload selfie
        tazkira.tsx           ← upload tazkira front + back
        business.tsx          ← shop name + shopZoneId + shopAddress + shop image + work license + submit
        submitted.tsx         ← confirmation screen
    (homeowner)/
      _layout.tsx             ← 4-tab layout
      home.tsx
      my-jobs.tsx
      messages.tsx
      profile.tsx
      post/
        create.tsx            ← creates DRAFT job
        media.tsx             ← uploads photos/video to draft
        review.tsx            ← preview + publish
      job/[id].tsx            ← job detail + bids list + accept flow
      active-job/[id].tsx     ← status display, confirm completion
    (expert)/
      _layout.tsx             ← 4-tab layout
      browse.tsx              ← job feed
      my-bids.tsx             ← bids + active jobs toggle
      messages.tsx
      profile.tsx
      job/[id].tsx            ← job detail + bid form
      active-job/[id].tsx     ← status progression CTAs
    (shared)/
      _layout.tsx
      chat/[jobId].tsx        ← Stream Chat
      review/[jobId].tsx      ← star picker + comment
      dispute/[jobId].tsx     ← dispute form
  components/
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      Pill.tsx
      Avatar.tsx
      BottomSheet.tsx
      EmptyState.tsx
      Toast.tsx
      ProgressBar.tsx
      ScreenWrapper.tsx
      Divider.tsx
    homeowner/               ← homeowner-specific components
    expert/                  ← expert-specific components
  constants/
    theme.ts                 ← Colors, Typography, Spacing, Radius, Shadows, IconSize
    icons.ts                 ← MaterialIcons name constants
  services/
    api.ts                   ← axios instance + Bearer header + refresh interceptor
    auth.service.ts
    jobs.service.ts
    bids.service.ts
    media.service.ts
    chat.service.ts
    reviews.service.ts
    notifications.service.ts
    credits.service.ts
  stores/
    auth.store.ts            ← Zustand + SecureStore
  locales/
    en.json
    fa.json
  i18n/
    index.ts
  utils/
    format.ts                ← AFN formatting, relative time, duration
```

---

## Navigation Structure

One bottom tab bar shell, role-aware content. Role set permanently at registration.

### Homeowner Tabs (4 tabs)
| Tab | Icon | Badge |
|---|---|---|
| Home | `home` | — |
| My Jobs | `work` | numeric — new bids + completion requests |
| Messages | `chat_bubble` | red dot — unread messages |
| Profile | `person` | — |

### Expert Tabs (4 tabs)
| Tab | Icon | Badge |
|---|---|---|
| Browse | `search` | — |
| My Bids | `gavel` | numeric — accepted bids needing action |
| Messages | `chat_bubble` | red dot — unread messages |
| Profile | `person` | — |

### Tab Bar Specs
```
Height: 64px + safe area inset
Background: white
Top border: 1px solid gray200
Active: primary600 icon + label
Inactive: gray400 icon + label
Label: 11px weight 500
```

---

## Component Rules

All UI primitives in `components/ui/`. Never use raw RN primitives directly in screens.

### Buttons
- **Primary:** bg `primary600`, white text, height 52, radius 8, weight 600, full width
- **Secondary:** white bg, 1.5px `primary600` border, `primary600` text, height 52
- **Destructive:** `danger100` bg, `danger600` text, height 52
- **Ghost:** transparent, `primary600` text, no border
- **Disabled:** `gray200` bg, `gray400` text on all variants
- **Loading:** ActivityIndicator replaces label, button stays disabled
- **One primary button per screen maximum — no exceptions**

### Inputs
- White bg, 1.5px `gray200` border, radius 8, height 52, `gray900` text, padding 16
- Focus: `primary600` border + `rgba(13,148,136,0.15)` shadow
- Error: `danger600` border + error message below in `danger600` 12px
- Label above: 13px weight 500 `gray600`
- Textarea: same, min-height 120, `textAlignVertical: 'top'`
- Validate on blur — not on submit

### Cards
- White bg, 1px `gray200` border, radius 16, shadow-sm, padding 16
- Emergency variant: 3px left border `danger600`
- Accepted bid variant: `primary600` border, `primary50` bg

### Status Pills
```
Radius full | Padding: 6px vertical / 10px horizontal | Font: captionMd

OPEN                                          → primary100  / primary600
ASSIGNED / EN_ROUTE                           → info100     / info600
ARRIVED / IN_PROGRESS / COMPLETION_REQUESTED  → warning100  / warning600
COMPLETED                                     → success100  / success600
CANCELLED                                     → gray100     / gray600
DISPUTED                                      → danger100   / danger600
```

### Screen Headers

Large header (main tab screens — Home, Browse, My Jobs, My Bids, Messages, Profile):
```
Background: white, bottom border 1px gray200
Greeting above title: 12px gray400
Title: display (28px, 700, primary600), left-aligned, padding 16
```

Standard header (stack screens):
```
Height: 56px, white bg, bottom border 1px gray200
Left: back arrow (arrow_back 24px) in 32×32 gray100 circle
Title: heading1 (22px, 700, primary600)
```

### Section Labels
```
12px, weight 600, primary600, uppercase, letter-spacing 0.06em
Always teal. Never gray.
```

### Bottom Sheet
```
White bg, radius 24 top corners only, shadow-lg
Handle: 4×32px gray200 centered, margin-top 12
Content padding: 24px
Swipe down to dismiss
```

### Empty States
```
MaterialIcons filled, 64px, gray300, centered
Title: heading2, gray600, centered
Subtitle: body, gray400, centered, max-width 240px
Optional CTA button
```

### Toast
```
gray900 bg, white text, radius 12, padding 12/16
Position: bottom above tab bar, 16px margin, 3s auto-dismiss
Success variant: 4px left border success600
Error variant: 4px left border danger600
```

### Progress Bar (multi-step flows)
```
3px height, full width, gray200 bg, primary600 fill
Position: very top of screen above header
Animates on step change
```

### Toggle Pills (Active/Past, Bids/Active Jobs)
```
Full-width row, two equal pills, gap 8, height 36
Selected: primary600 bg, white text, radius full
Unselected: white bg, 1.5px gray200 border, gray600 text
Font: 13px weight 600
Use local useState — no library needed
```

---

## API Integration — Critical Details

Read `docs/api-reference.md` in full before integrating any endpoint.
These are the most important things to get right:

### Job posting — 3 API calls, not 1
```
1. POST /jobs              → creates DRAFT, returns { id }
2. POST /media/jobs/:id    → upload each photo (multipart, field: 'file')
3. POST /jobs/:id/publish  → DRAFT → OPEN (requires ≥1 image OR description ≥50 chars)
```

### Expert verification — upload first, then submit
```
1. POST /media/expert/selfie
2. POST /media/expert/tazkira_front
3. POST /media/expert/tazkira_back
4. POST /media/expert/shop_image
5. POST /media/expert/work_license
6. POST /users/me/submit-verification  { shopName, description, shopZoneId, shopAddress }
   ↑ shopZoneId and shopAddress are required
   ↑ All 5 uploads must be present or backend returns 400
```

### Review API — simpler than the UI suggests
Backend accepts `{ rating, comment, isPositive, tags }`.
The tag chip UI is cosmetic — map `isPositive` automatically:
- Rating ≥ 4 AND any positive tag selected → `isPositive: true`
- Rating ≤ 2 AND any negative tag selected → `isPositive: false`
- Rating = 3 → `isPositive: null` (omit field)
Tags are stored separately: pass the selected chip strings as `tags: string[]`.

### Zone + category display
- `GET /zones` returns `{ id, name, nameEn, ... }` — display `nameEn` in English phase
- `GET /categories` returns `{ id, name, nameEn, icon, ... }` — display `nameEn`

### Homeowner zone pre-fill
`GET /users/me` returns `homeownerProfile.zone` for HOMEOWNER role. Use this to
pre-fill the zone picker in job posting Step 4 — do not call `/zones` separately for this.

### Expert browse feed
```
GET /jobs/browse
```
Returns OPEN jobs in expert's zones, excluding already-bid jobs. Sorted Emergency first.
Each job includes `homeowner: { firstName, positivePoints, jobsPosted }` — no phone.
The expert must have at least one zone assigned (`PATCH /users/me/zones`) to see jobs.

### Homeowner phone visibility
`GET /jobs/:id` — `homeowner.phone` is included only when:
- Actor is the homeowner themselves, OR
- Actor is the assigned expert AND job status is ASSIGNED or beyond

Expert viewing an OPEN job: phone is omitted. Never show phone before ASSIGNED.

### Credit balance — read from user profile, not a separate call
`GET /users/me` returns `expertProfile.creditBalance.balance` — use this, don't call
`GET /credits/me/balance` separately on every render. Store in Zustand, refresh after bids.

### Chat token
```
GET /chat/jobs/:jobId/token
→ { token, channelId, channelType, apiKey }
```
Use these to initialise Stream Chat client. Only available after ASSIGNED status.

### SecureStore keys
```
fixr_access_token
fixr_refresh_token
fixr_user
```

---

## Role Separation — Hard Rules

Check role from Zustand auth store. Never mix homeowner and expert UI.

| Element | Homeowner | Expert |
|---|---|---|
| Home tab | Post a Job CTA + recent jobs | Zone job feed |
| Job card CTA | "View Bids (X)" | "Place Bid · 1 credit" |
| Bid controls | Accept / reject | View own bid status only |
| Credit display | Never shown | Browse header + Profile always |
| Verification flow | Not applicable | Required before bidding |
| Chat trigger | After accepting a bid | After bid accepted |
| Completion CTA | "Confirm Completion" | "Request Completion" |
| Zone selector | Job post form only | Browse header persistent |
| Phone visibility | Always (own number) | Shown on active job (ASSIGNED+) only |

---

## Key Business Rules

- 1 bid = 1 credit; balance can never go below 0
- Credit rate: 50 AFN/credit (admin-configurable)
- Welcome credits granted only on VERIFIED status — never before
- Purchased credits never expire; welcome credits expire after admin-configured period
- Job states: `DRAFT → OPEN → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED` + `CANCELLED` + `DISPUTED`
- No-show: expert doesn't arrive within ETA + 2 hours → noShowCount increments, job returns to OPEN
- Reviews: 48h window after COMPLETED; rolling average; one per job per side
- Role is permanent — one phone number = one role, forever, no exceptions
- Chat unlocks only at ASSIGNED — never on bid placement
- Expert pending: job feed hidden, "Verification in progress" empty state shown
- Homeowner phone visible to expert only at ASSIGNED+
- Dev OTP: backend accepts `000000` when `NODE_ENV !== production`
- Seed admin: `admin@fixr.af` / `Fixr@Admin2025!`

---

## Media Rules

- Max 3 photos per job post (backend allows 8, we restrict to 3 in UI)
- Max 1 video per job post, max 2 minutes, max 100 MB
- Video optional; photos optional if description ≥ 50 chars (backend enforces this)
- All 5 expert verification uploads required (selfie, tazkira ×2, shop image, work license)
- Mobile never calls Cloudinary directly — always through `/media/` backend endpoints
- Upload field name: `file` (multipart/form-data)

---

## Seed Data (from bun run prisma:seed)

- Admin: `admin@fixr.af` / `Fixr@Admin2025!`
- Credit rate: 50 AFN/credit, 5 welcome credits, 30-day expiry
- 12 Kabul zones with GPS — display `nameEn` in UI:
  Karte Seh, Khair Khana, Shahr-e-Naw, Macroyan, Qala-e-Fathullah,
  Wazir Akbar Khan, Taimani, Deh Afghanan, Pul-e-Surkh, Khushal Mena,
  Karte Char, Karte Parwan
- 8 categories — display `nameEn` in UI:
  Plumbing, Electrical, Carpentry, Painting, Appliance Repair,
  Cleaning, Construction, Other

---

## Coding Guidelines

### General
- No comments unless WHY is genuinely non-obvious
- No error handling for impossible cases — trust framework/Prisma
- No extra abstractions beyond what the task needs
- Prefer editing existing files over creating new ones
- Every screen needs: loading state, error state, empty state — never skip these
- No gradients anywhere — solid colors from token system only
- No dark mode — light theme only

### Backend / Admin / Shared — COMPLETE. Do not modify.

### Mobile (React Native / Expo)
- Screens in `apps/mobile/src/app/` via expo-router file-based routing
- UI primitives from `components/ui/` — never raw RN View/Text/TouchableOpacity in screens
- Colors, sizes, spacing, radius — always from `constants/theme.ts` tokens
- Strings — always `t('key')` via `useTranslation()` — no raw strings in JSX
- RTL — do not implement. LTR only. No `I18nManager` calls.
- State — Zustand for auth/role; `useState` for screen-level only
- API calls — always through `services/` files — never call axios directly from a screen
- SecureStore keys: `fixr_access_token`, `fixr_refresh_token`, `fixr_user`

---

## Reference Files (all committed, all required)

| File | Purpose |
|---|---|
| `docs/api-reference.md` | Ground truth for all API endpoint shapes, errors, side effects |
| `docs/ui-design-system.md` | Component specs, tab layouts, full user flow descriptions |
| `docs/designs/` | Low-fidelity layout screenshots — rough reference only |
| `PROGRESS.md` | Screen build checklist — update after each approved screen |

---

## Bootstrap Checklist (do once before building any screen)

- [ ] Install packages: `i18next`, `react-i18next`, `@expo/vector-icons`, `expo-font`, `@gorhom/bottom-sheet`, `zustand`, `axios`, `expo-secure-store`
- [ ] `src/constants/theme.ts` — Colors, Typography, Spacing, Radius, Shadows, IconSize
- [ ] `src/constants/icons.ts` — MaterialIcons name constants
- [ ] `src/locales/en.json` — empty object to start, fill as you build
- [ ] `src/locales/fa.json` — empty object {}
- [ ] `src/i18n/index.ts` — i18next config (English only, no RTL)
- [ ] `src/services/api.ts` — axios instance, Bearer header, refresh interceptor
- [ ] `src/stores/auth.store.ts` — Zustand + SecureStore
- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/Input.tsx`
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/Pill.tsx`
- [ ] `components/ui/Avatar.tsx`
- [ ] `components/ui/BottomSheet.tsx`
- [ ] `components/ui/EmptyState.tsx`
- [ ] `components/ui/Toast.tsx`
- [ ] `components/ui/ProgressBar.tsx`
- [ ] `components/ui/ScreenWrapper.tsx`
- [ ] `components/ui/Divider.tsx`
- [ ] `app/_layout.tsx` — root Stack, SafeAreaProvider, i18n init, font load
- [ ] `app/index.tsx` — auth guard → phone screen or role home tab

## Then build screens in this order (one per Claude Code session)

1. `(auth)/phone.tsx`
2. `(auth)/otp.tsx`
3. `(auth)/register.tsx` — name + role picker + zone/address for HOMEOWNER, calls /auth/register or /auth/login
4. `(auth)/expert-onboarding/selfie.tsx`
5. `(auth)/expert-onboarding/tazkira.tsx`
6. `(auth)/expert-onboarding/business.tsx`
7. `(auth)/expert-onboarding/submitted.tsx`
8. Expert pending state in Browse tab
9. `(homeowner)/home.tsx`
10. `(homeowner)/my-jobs.tsx`
11. `(homeowner)/messages.tsx`
12. `(homeowner)/profile.tsx`
13. `(expert)/browse.tsx`
14. `(expert)/my-bids.tsx`
15. `(expert)/messages.tsx`
16. `(expert)/profile.tsx`
17. `(homeowner)/post/create.tsx`
18. `(homeowner)/post/media.tsx`
19. `(homeowner)/post/review.tsx`
20. `(homeowner)/job/[id].tsx`
21. `(expert)/job/[id].tsx`
22. `(expert)/active-job/[id].tsx`
23. `(homeowner)/active-job/[id].tsx`
24. `(shared)/chat/[jobId].tsx`
25. `(shared)/review/[jobId].tsx`
26. `(shared)/dispute/[jobId].tsx`
