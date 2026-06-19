# Fixr Platform — Claude Instructions

## What This Project Is

Fixr is a local service marketplace for Kabul, Afghanistan. Homeowners post jobs; verified local experts (plumbers, electricians, etc.) bid on them. Credit-based bidding, WhatsApp OTP auth, zone-based matching, FCM push notifications, and bilingual Persian/Dari + English UI.

## Monorepo Structure

```
Fixr-Platform/              ← Bun workspaces root
├── apps/
│   ├── backend/            ← NestJS 11 + Fastify + Prisma + PostgreSQL (COMPLETE)
│   ├── mobile/             ← Expo SDK 55, React Native 0.81, expo-router (IN PROGRESS)
│   └── admin/              ← Next.js 15 admin panel (NOT STARTED)
├── packages/
│   └── shared/             ← Shared enums, types (COMPLETE)
└── docs/
    └── api-reference.md    ← Full REST API docs
```

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11, Fastify adapter, Prisma 6, PostgreSQL 17 |
| Mobile | Expo SDK 55, React Native 0.81, expo-router (file-based), Zustand, SecureStore |
| Admin | Next.js 15 (not started) |
| Auth | Phone + WhatsApp OTP → JWT (15 min) + opaque refresh (30 days, rotated, stored in DB) |
| Admin auth | Email + bcrypt password (no OTP) |
| State mgmt | Zustand (mobile), server state via axios |
| i18n | i18next + react-i18next; Persian/Dari (fa) primary, English (en) secondary, RTL via `I18nManager.forceRTL()` |
| Notifications | FCM via firebase-admin; all events stored in DB regardless of FCM result |
| Chat | Stream Chat; unlocks after bid acceptance (ASSIGNED+); 24h tokens |
| Media | Server-proxied to Cloudinary; max 10 MB image / 100 MB video; resized to 1200px |
| Cron | @nestjs/schedule, `EVERY_10_MINUTES`, no-show detection |

## Build & Run Commands

```bash
# From repo root (uses Bun workspaces)
bun install

# Backend
cd apps/backend
bun run start:dev        # dev with hot reload
bun run build
bun run prisma:migrate   # run migrations
bun run prisma:seed      # seed admin, zones, categories, credit rate

# Mobile
cd apps/mobile
bun run start            # Expo dev server
bun run ios
bun run android

# Shared package
cd packages/shared
bun run build
```

## Backend ENV Variables (apps/backend/.env)

```
DATABASE_URL=postgresql://...
JWT_SECRET=
JWT_REFRESH_SECRET=
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
STREAM_API_KEY=
STREAM_API_SECRET=
DEV_OTP_CODE=000000       # bypass OTP in non-production
NODE_ENV=development
PORT=3001
```

## Mobile ENV Variables (apps/mobile/.env)

```
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Design Tokens (mobile — never deviate from these)

```typescript
Colors.bg          = '#1a1a1a'   // page background
Colors.bgCard      = '#242424'   // card background
Colors.primary     = '#2D9B6F'   // teal — brand/CTA
Colors.textPrimary = '#FFFFFF'
Colors.textSecondary = '#A0A0A0'
Colors.danger      = '#E85D5D'
Colors.warning     = '#F5A623'
```

## Coding Guidelines

### General
- No comments unless the WHY is genuinely non-obvious
- No error handling for impossible cases; trust framework/Prisma guarantees
- No extra abstractions beyond what the task requires
- No backwards-compat shims or feature flags
- Prefer editing existing files over creating new ones

### Backend (NestJS)
- All routes go through `@UseGuards(JwtAuthGuard)` except auth endpoints
- Admin routes additionally use `@UseGuards(AdminGuard)`
- Use Prisma transactions for any multi-step DB writes that must be atomic
- Return `{ success: true, data: ... }` shaped responses via the global `ApiResponse` wrapper
- Enums come from `@fixr/shared` — never redefine them locally

### Mobile (React Native / Expo)
- All screens live in `apps/mobile/src/app/` using expo-router file-based routing
- Route groups: `(auth)`, `(homeowner)`, `(expert)`, `(shared)`
- All UI primitives from `apps/mobile/src/components/ui/` — never use raw RN components directly in screens
- Never hardcode colors or font sizes — always use `Colors`, `FontSize`, `Spacing`, `Radius` from `constants/theme.ts`
- RTL: always use `useRTL()` hook for `textAlign` and `flexDirection`; never hardcode `'left'` or `'row'`
- i18n: always use `useTranslation()` — no hardcoded strings in screens
- State: Zustand store for auth; local `useState` for screen-level state; no Redux
- API calls: always through the service files in `services/` — never call `api` directly from a screen
- SecureStore keys: `fixr_access_token`, `fixr_refresh_token`, `fixr_user`

### Admin (Next.js — not started yet)
- Will use App Router, server components where possible
- Tailwind CSS for styling
- Admin auth: email + password via `/auth/admin/login`

## Key Business Rules
- 1 bid = 1 credit; credits cannot go below 0
- Credit rate default: 50 AFN/credit; admin-configurable
- Welcome credits granted only on expert verification (VERIFIED status)
- Job states: `DRAFT → OPEN → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED` + `CANCELLED` + `DISPUTED`
- Reviews: 48-hour window after COMPLETED; rolling average rating
- No-show: if expert doesn't arrive within ETA + 2 hours, job returns to OPEN and noShowCount increments
- Dev OTP bypass: use code `000000` when `NODE_ENV !== production`
- Seed admin credentials: `admin@fixr.af` / `Fixr@Admin2025!`

## Seed Data
- 12 Kabul zones (کارته سه, خیر خانه, شهر نو, ماکروریان, etc.) with GPS coords
- 8 service categories in Dari
- Admin user and credit rate seeded idempotently
