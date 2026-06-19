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
- [x] i18n setup — fa (primary) + en, full bilingual string coverage, RTL support
- [x] UI primitives: Text, Button, Card, Badge, Input, ScreenWrapper, Divider, StarRating, FixrLogo
- [x] Hooks: `useRTL()`
- [x] Services: api.ts, auth.service.ts, jobs.service.ts, bids.service.ts, notifications.service.ts, lookup.service.ts, chat.service.ts, reviews.service.ts
- [x] Stores: `auth.store.ts` (Zustand + SecureStore persistence)
- [x] Utils: `format.ts` (AFN, relative time, duration, arrival)
- [x] Root layout (`_layout.tsx`) with Stack navigator, SafeAreaProvider, status bar

### Auth Screens — COMPLETE ✓
- [x] `(auth)/_layout.tsx` — auth stack layout
- [x] `(auth)/phone.tsx` — phone number entry
- [x] `(auth)/otp.tsx` — 6-digit code with visual boxes, resend countdown (60s)
- [x] `(auth)/register.tsx` — name + role picker (HOMEOWNER / EXPERT cards)
- [x] `app/index.tsx` — auth guard → routes by role to correct home

### Expert Flow — COMPLETE ✓
- [x] `(expert)/_layout.tsx` — 5-tab layout (Home, Browse, Bids, Credits, Profile)
- [x] `(expert)/home.tsx` — availability toggle, stats grid, nearby job alerts, verification banner
- [x] `(expert)/browse.tsx` — category + zone filter chips, job cards
- [x] `(expert)/job/[id].tsx` — job detail + bid form (place/update/withdraw, credit cost label)
- [x] `(expert)/bids.tsx` — my bids list with status badges and job navigation
- [x] `(expert)/active-job/[id].tsx` — step indicator + state transitions (en-route → arrived → in-progress → request completion)
- [x] `(expert)/credits.tsx` — balance card + transaction ledger with +/− coloring
- [x] `(expert)/notifications.tsx` — unread dot, mark-read, mark-all
- [x] `(expert)/profile.tsx` — stats, verification status, zones/categories tags, logout

### Homeowner Flow — COMPLETE ✓
- [x] `(homeowner)/_layout.tsx` — 4-tab layout (Home, Jobs, Alerts, Profile)
- [x] `(homeowner)/home.tsx` — active jobs summary + post job CTA
- [x] `(homeowner)/jobs.tsx` — status tab filter (ALL/DRAFT/OPEN/ASSIGNED/COMPLETED)
- [x] `(homeowner)/post/create.tsx` — job details form (title, description, category, zone, urgency)
- [x] `(homeowner)/post/review.tsx` — preview + publish/delete
- [x] `(homeowner)/job/[id].tsx` — job detail + full bid list with expert stats + accept flow
- [x] `(homeowner)/active-job/[id].tsx` — status display, confirm completion, chat/call expert
- [x] `(homeowner)/notifications.tsx` — unread indicator, mark-read
- [x] `(homeowner)/profile.tsx` — user info, logout

### Shared Screens — COMPLETE ✓
- [x] `(shared)/_layout.tsx`
- [x] `(shared)/chat/[jobId].tsx` — Stream Chat integration (lazy SDK load, graceful fallback if not installed)
- [x] `(shared)/review/[jobId].tsx` — star picker + positive/negative tag chips + comment

### Remaining Mobile TODOs
- [ ] `(homeowner)/post/media.tsx` — photo/video upload step (skipped; can publish without media if description ≥ 50 chars)
- [ ] `(shared)/dispute/[jobId].tsx` — raise dispute form
- [ ] Push notification registration on app start (requires EAS project ID for production)
- [ ] Deep link handling for notification taps

## Phase 3: Admin Panel (Next.js) — COMPLETE ✓

- [x] Project setup — Next.js 16, App Router, Tailwind
- [x] Auth — email + password login, JWT in localStorage, route guard
- [x] Dashboard — metrics overview (users, experts, jobs, credits, disputes)
- [x] User management — list (role filter, paginated), view detail, suspend/unsuspend
- [x] Expert verification queue — view docs/selfie/tazkira, approve/reject with note
- [x] Jobs management — list with status filter
- [x] Disputes management — list, resolve with resolution note
- [x] Credits management — per-expert balance, purchase, adjust, ledger
- [x] Credit rate configuration (Settings page)
- [x] Zone management — CRUD with GPS coordinates
- [x] Category management — CRUD with Dari/English names
- [x] Notification log (admin view of all platform notifications)
- [x] Settings panel — credit rate, welcome credits, expiry days

## Ongoing

- [ ] Backend bug fixes as discovered during Postman testing
- [ ] Mobile app — final QA pass
- [ ] Environment setup for production (real WhatsApp Business API, Cloudinary, Firebase, Stream)
