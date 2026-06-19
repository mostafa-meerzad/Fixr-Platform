# Fixr Platform — Task Roadmap

## Phase 1: Backend (NestJS) — COMPLETE ✓

- [x] Monorepo setup (Bun workspaces, packages/shared, apps/*)
- [x] Shared enums and types (`packages/shared`)
- [x] Prisma schema — 15 models (User, Job, Bid, Notification, etc.)
- [x] Auth module — WhatsApp OTP, JWT + refresh token rotation, dev bypass (`000000`)
- [x] Admin auth — email + bcrypt, separate guard
- [x] Jobs module — full CRUD, state machine (`DRAFT → COMPLETED`), media publish gate
- [x] Bids module — place, update, withdraw, accept; credit spend on placement; refund on cancel
- [x] Credits module — spend, refund, purchase (admin), adjust (admin), ledger, rate management
- [x] Notifications module — FCM via firebase-admin, bilingual, DB persistence, paginated list
- [x] Admin module — dashboard metrics, expert verification, dispute management, zone/category CRUD
- [x] Chat module — Stream Chat token endpoint, gated on ASSIGNED+ status
- [x] Media module — Cloudinary proxy upload, image resize, video support
- [x] Reviews module — 48h window, rolling average, expert points
- [x] No-show cron — `EVERY_10_MINUTES`, ETA + 2h grace, returns job to OPEN
- [x] Zones + Categories — admin-managed, expert selects 1–10 zones
- [x] Prisma seed — admin, 12 zones, 8 categories, credit rate
- [x] API reference docs (`docs/api-reference.md`) — all 50+ endpoints documented

## Phase 2: Mobile App (Expo/React Native) — IN PROGRESS

### Foundation Layer — COMPLETE ✓
- [x] Project setup — Expo SDK 55, expo-router, Zustand, i18next
- [x] Theme constants (`constants/theme.ts`) — Colors, FontSize, Spacing, Radius
- [x] i18n setup — fa (primary) + en, RTL support
- [x] UI primitives:
  - [x] `Text` — variants: h1/h2/h3/body/sm/xs/label, RTL-aware
  - [x] `Button` — primary/outline/ghost/danger, sm/md/lg, loading state
  - [x] `Card` — dark bgCard with Radius.lg
  - [x] `Badge` — emergency/today/bidSent/active/done
  - [x] `Input` — RTL-aware, error display, dark styling
  - [x] `ScreenWrapper` — scroll/non-scroll, RefreshControl, SafeAreaView
  - [x] `Divider`
  - [x] `StarRating`
  - [x] `FixrLogo` — "fix" white + "r" teal
- [x] Hooks: `useRTL()`
- [x] Services: `api.ts` (axios + token interceptor + refresh logic), `auth.service.ts`, `jobs.service.ts`, `bids.service.ts`, `notifications.service.ts`, `lookup.service.ts`
- [x] Stores: `auth.store.ts` (Zustand + SecureStore persistence)
- [x] Utils: `format.ts` (AFN, relative time, duration, arrival)
- [x] Root layout (`_layout.tsx`) with Stack navigator, SafeAreaProvider, status bar

### Auth Screens — TODO
- [ ] `(auth)/_layout.tsx` — auth stack layout
- [ ] `(auth)/phone.tsx` — phone number entry screen
- [ ] `(auth)/otp.tsx` — OTP code entry + resend
- [ ] `(auth)/register.tsx` — name + role selection (HOMEOWNER / EXPERT)
- [ ] `app/index.tsx` — redirect guard (auth vs role-based home)

### Expert Flow — TODO
- [ ] `(expert)/_layout.tsx` — tab layout (Home, Browse, Bids, Notifications, Profile)
- [ ] `(expert)/index.tsx` — home dashboard (availability toggle, stats grid, nearby job alerts)
- [ ] `(expert)/browse.tsx` — browse open jobs by zone/category
- [ ] `(expert)/job/[id].tsx` — job detail + place bid form
- [ ] `(expert)/bids.tsx` — my active bids list
- [ ] `(expert)/active-job/[id].tsx` — accepted job with state transitions (en-route → arrived → in-progress → completion)
- [ ] `(expert)/credits.tsx` — credit balance + transaction ledger
- [ ] `(expert)/notifications.tsx` — notification list with mark-read
- [ ] `(expert)/profile.tsx` — profile view/edit, verification status, zones, categories
- [ ] `(expert)/verification.tsx` — submit verification documents (if unverified)

### Homeowner Flow — TODO
- [ ] `(homeowner)/_layout.tsx` — tab layout (Home, My Jobs, Notifications, Profile)
- [ ] `(homeowner)/index.tsx` — home with quick post + active jobs summary
- [ ] `(homeowner)/post/create.tsx` — step 1: job details (title, category, zone, urgency)
- [ ] `(homeowner)/post/media.tsx` — step 2: add photos/video
- [ ] `(homeowner)/post/review.tsx` — step 3: review + publish
- [ ] `(homeowner)/jobs.tsx` — my jobs list (draft / open / active / completed)
- [ ] `(homeowner)/job/[id].tsx` — job detail with bids list
- [ ] `(homeowner)/job/[id]/bids.tsx` — bids from experts; accept flow
- [ ] `(homeowner)/active-job/[id].tsx` — active job tracking (status, expert info, confirm completion)
- [ ] `(homeowner)/notifications.tsx`
- [ ] `(homeowner)/profile.tsx`

### Shared Screens — TODO
- [ ] `(shared)/chat/[jobId].tsx` — Stream Chat channel view (both roles)
- [ ] `(shared)/review/[jobId].tsx` — leave review after completion
- [ ] `(shared)/dispute/[jobId].tsx` — raise dispute form
- [ ] Push notification registration on app start
- [ ] Deep link handling for notification taps

## Phase 3: Admin Panel (Next.js) — NOT STARTED

- [ ] Project setup — Next.js 15, App Router, Tailwind
- [ ] Auth — email + password login, session management
- [ ] Dashboard — metrics overview (jobs, users, revenue, disputes)
- [ ] User management — list, view, ban/unban
- [ ] Expert verification queue — view submitted docs, approve/reject
- [ ] Jobs management — list, view, intervene
- [ ] Disputes management — list, view, resolve
- [ ] Credits management — grant, adjust, view ledger per expert
- [ ] Credit rate configuration
- [ ] Zone management — CRUD with GPS coordinates
- [ ] Category management — CRUD with Dari/English names
- [ ] Notifications broadcast
- [ ] Settings panel

## Ongoing

- [ ] Backend bug fixes as discovered during Postman testing
- [ ] Mobile app — final QA pass
- [ ] Environment setup for production (real WhatsApp Business API, Cloudinary, Firebase, Stream)
