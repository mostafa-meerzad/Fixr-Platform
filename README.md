# Fixr Platform

A local service marketplace for Kabul, Afghanistan. Homeowners post jobs; verified local experts (plumbers, electricians, carpenters, etc.) discover and bid on them. Credit-based bidding, WhatsApp OTP authentication, zone-based job matching, and real-time chat.

---

## Apps

| App | Stack | Status |
|---|---|---|
| `apps/backend` | NestJS 11 · Fastify · Prisma 6 · PostgreSQL 17 | Complete |
| `apps/mobile` | Expo SDK 55 · React Native 0.81 · expo-router | Complete |
| `apps/admin` | Next.js 15 · App Router · Tailwind CSS | Complete |
| `packages/shared` | TypeScript enums + types shared across apps | Complete |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Bun + Turbo monorepo |
| Backend | NestJS 11, Fastify adapter, Prisma 6, PostgreSQL 17 |
| Mobile | Expo SDK 55, React Native 0.81, expo-router (file-based routing) |
| Admin | Next.js 15, App Router, Tailwind CSS |
| Auth | WhatsApp Business API OTP → sessionId → JWT (15 min) + opaque refresh token (30 days) |
| Mobile state | Zustand + SecureStore |
| Media | Cloudinary (server-proxied — mobile never calls Cloudinary directly) |
| Push | FCM via firebase-admin |
| Chat | Stream Chat (unlocks after bid acceptance) |
| Cron | @nestjs/schedule — no-show detection every 10 minutes |
| i18n | i18next + react-i18next (English; Dari/RTL scaffolded, not yet implemented) |

---

## Monorepo Structure

```
Fixr-Platform/
├── apps/
│   ├── backend/        NestJS API — auth, jobs, bids, media, chat, reviews, disputes
│   ├── mobile/         Expo React Native app
│   └── admin/          Next.js admin panel (user management, credit config, verification)
├── packages/
│   └── shared/         Shared enums (UserRole, JobStatus, etc.) and TypeScript types
└── docs/
    ├── api-reference.md     Ground truth for all API endpoints
    ├── ui-design-system.md  Design tokens, component specs, user flows
    └── designs/             Low-fidelity wireframe screenshots
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- PostgreSQL 17
- Node 20+ (for Expo tooling)

### Install

```bash
bun install
```

### Environment Variables

**Backend** — create `apps/backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fixr
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
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

**Mobile** — create `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Database

```bash
cd apps/backend
bun run prisma:migrate
bun run prisma:seed
```

The seed script creates:
- Admin account: `admin@fixr.af` / `Fixr@Admin2025!`
- 12 Kabul zones (Karte Seh, Khair Khana, Shahr-e-Naw, Macroyan, and 8 more)
- 8 service categories (Plumbing, Electrical, Carpentry, Painting, Appliance Repair, Cleaning, Construction, Other)
- Credit config: 50 AFN/credit, 5 welcome credits, 30-day expiry

### Run

```bash
# Backend (http://localhost:3001)
bun run backend

# Admin panel (http://localhost:3000)
bun run admin

# Mobile (Expo Dev Client)
bun run mobile
```

---

## Authentication

WhatsApp OTP flow — no Firebase Auth on mobile.

```
1. POST /auth/otp/send       { phone: "+93701234567" }
2. POST /auth/otp/verify     { phone, code }  → { sessionId, isNewUser }
3a. New user:  POST /auth/register  { phone, name, role, sessionId, zoneId?, address? }
3b. Returning: POST /auth/login     { phone, sessionId }
4. Token refresh: POST /auth/refresh { refreshToken }
5. Logout:        POST /auth/logout  { refreshToken }
```

> **Dev bypass:** the backend accepts code `000000` when `NODE_ENV !== production`. No real WhatsApp message is sent.

---

## Core Flows

### Homeowners
1. Register with phone, name, zone, and address
2. Post a job in 3 steps: fill details → upload photos/video → publish
3. Review incoming bids and accept one
4. Track the expert's status in real time (En Route → Arrived → In Progress)
5. Confirm completion and leave a review

### Experts
1. Register, then complete verification (selfie, Tazkira front/back, shop image, work license)
2. Admin approves → expert receives welcome credits
3. Browse open jobs in their zones; place bids (1 credit each)
4. If bid is accepted, chat with the homeowner and progress through job states
5. Request completion; receive review

### Job States
```
DRAFT → OPEN → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED
                                                                                    ↘ CANCELLED
                                                                                    ↘ DISPUTED
```

---

## Mobile App Structure

```
apps/mobile/src/
  app/
    (auth)/           Phone entry, OTP, registration, expert onboarding (4 screens)
    (homeowner)/      Home, My Jobs, Messages, Profile + post flow + job detail + active job
    (expert)/         Browse, My Bids, Messages, Profile + job detail + active job
    (shared)/         Chat, Review, Dispute
  components/ui/      Button, Input, Card, Pill, Avatar, BottomSheet, EmptyState, Toast, etc.
  constants/          theme.ts (design tokens), icons.ts (MaterialIcons constants)
  services/           One file per API domain (auth, jobs, bids, media, chat, reviews, …)
  stores/             Zustand auth store (tokens + user persisted in SecureStore)
  locales/            en.json (English), fa.json (Dari scaffold — empty)
```

---

## Key Business Rules

- 1 bid costs 1 credit; balance cannot go below 0
- Welcome credits are granted only after admin verification (never before)
- Expert must have at least one zone assigned to see the job feed
- Chat channel unlocks only at ASSIGNED status — not on bid placement
- Homeowner's phone number is hidden from experts until ASSIGNED or beyond
- Reviews have a 48-hour window after job completion; one per job per side
- No-show detection: if an expert doesn't arrive within ETA + 2 hours, the job returns to OPEN

---

## Docs

| File | Purpose |
|---|---|
| `docs/api-reference.md` | All API endpoints, request/response shapes, error codes |
| `docs/ui-design-system.md` | Design tokens, component specs, full user flow descriptions |
| `docs/designs/` | Low-fidelity wireframe screenshots (layout reference only) |
| `PROGRESS.md` | Screen-by-screen build checklist with notes on each phase |
