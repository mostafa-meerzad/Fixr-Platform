# Fixr Mobile — Build Progress

**Branch:** `mobile-ui-v2`  
**Goal:** Pixel-faithful rebuild of the mobile UI with correct API integration.  
**Rule:** One session per screen. Mark items complete only after the screen is tested and approved.

---

## Backend Updates (2026-06-25) ✅

Six targeted changes were applied to support the mobile UI. Migration applied:
`20260625172346_add_homeowner_profile_shop_zone_review_tags`. Do not redo these.

| # | Change | Files touched |
|---|---|---|
| 1 | POST /auth/register — `zoneId` + `address` required for HOMEOWNER | `schema.prisma`, `register.dto.ts`, `auth.service.ts` |
| 2 | POST /users/me/submit-verification — all 5 uploads required + `shopZoneId` + `shopAddress` | `update-expert-profile.dto.ts`, `users.service.ts` |
| 3 | GET /users/me — returns `homeownerProfile` for HOMEOWNER role; EXPERT profile includes `shopZone` | `users.service.ts` |
| 4 | POST /jobs/:jobId/review — `tags?: string[]` stored; homeowner positive/negative points updated | `create-review.dto.ts`, `reviews.service.ts` |
| 5 | GET /jobs/browse — includes `homeowner: { firstName, positivePoints, jobsPosted }` | `jobs.service.ts` |
| 6 | GET /jobs/:id — `homeowner.phone` redacted unless actor is ADMIN, the homeowner, or assigned expert at ASSIGNED+ | `jobs.service.ts` |

`docs/api-reference.md` updated to reflect all 6 changes.

---

## Phase 0 — Bootstrap

Must be completed in full before any screen is built.

### Packages
- [ ] Install: `i18next react-i18next @expo/vector-icons expo-font @gorhom/bottom-sheet zustand axios expo-secure-store`

### Foundation files
- [ ] `src/constants/theme.ts` — Colors, Typography, Spacing, Radius, Shadows, IconSize
- [ ] `src/constants/icons.ts` — MaterialIcons name constants (no magic strings in screens)
- [ ] `src/locales/en.json` — empty `{}`
- [ ] `src/locales/fa.json` — empty `{}`
- [ ] `src/i18n/index.ts` — i18next config, English only, no RTL
- [ ] `src/services/api.ts` — axios instance, Bearer header, refresh interceptor
- [ ] `src/stores/auth.store.ts` — Zustand + SecureStore

### UI Primitives (`components/ui/`)
- [ ] `Button.tsx`
- [ ] `Input.tsx`
- [ ] `Card.tsx`
- [ ] `Pill.tsx`
- [ ] `Avatar.tsx`
- [ ] `BottomSheet.tsx`
- [ ] `EmptyState.tsx`
- [ ] `Toast.tsx`
- [ ] `ProgressBar.tsx`
- [ ] `ScreenWrapper.tsx`
- [ ] `Divider.tsx`

### App shell
- [ ] `app/_layout.tsx` — root Stack, SafeAreaProvider, i18n init, font load
- [ ] `app/index.tsx` — auth guard → phone screen or role home tab

---

## Phase 1 — Auth Screens

- [ ] `(auth)/phone.tsx`
- [ ] `(auth)/otp.tsx`
- [ ] `(auth)/register.tsx` — name + role picker; HOMEOWNER collects zone + address; calls `/auth/register` (with `zoneId` + `address` for HOMEOWNER) or `/auth/login`

---

## Phase 2 — Expert Onboarding

- [ ] `(auth)/expert-onboarding/selfie.tsx`
- [ ] `(auth)/expert-onboarding/tazkira.tsx` — tazkira front + back
- [ ] `(auth)/expert-onboarding/business.tsx` — shop name + shopZoneId + shopAddress + shop image + work license + submit-verification
- [ ] `(auth)/expert-onboarding/submitted.tsx`
- [ ] Expert pending state in Browse tab (verificationStatus = PENDING → "Verification in progress" empty state)

---

## Phase 3 — Homeowner Tabs

- [ ] `(homeowner)/home.tsx`
- [ ] `(homeowner)/my-jobs.tsx`
- [ ] `(homeowner)/messages.tsx`
- [ ] `(homeowner)/profile.tsx`

---

## Phase 4 — Expert Tabs

- [ ] `(expert)/browse.tsx`
- [ ] `(expert)/my-bids.tsx`
- [ ] `(expert)/messages.tsx`
- [ ] `(expert)/profile.tsx`

---

## Phase 5 — Job Posting Flow

- [ ] `(homeowner)/post/create.tsx` — creates DRAFT job
- [ ] `(homeowner)/post/media.tsx` — uploads photos/video to draft (max 3 photos, 1 video)
- [ ] `(homeowner)/post/review.tsx` — preview + publish (POST /jobs/:id/publish)

---

## Phase 6 — Job Detail & Bidding

- [ ] `(homeowner)/job/[id].tsx` — job detail + bids list + accept flow
- [ ] `(expert)/job/[id].tsx` — job detail + bid form (costs 1 credit)

---

## Phase 7 — Active Jobs

- [ ] `(expert)/active-job/[id].tsx` — status progression CTAs
- [ ] `(homeowner)/active-job/[id].tsx` — status display, confirm completion

---

## Phase 8 — Shared Screens

- [ ] `(shared)/chat/[jobId].tsx` — Stream Chat (ASSIGNED+ only)
- [ ] `(shared)/review/[jobId].tsx` — star picker + tags + comment
- [ ] `(shared)/dispute/[jobId].tsx` — dispute form
