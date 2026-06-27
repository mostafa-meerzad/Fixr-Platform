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

## Phase 0 — Bootstrap ✅

Completed 2026-06-27. All items verified with `npx tsc --noEmit` — zero errors.

### Packages ✅
- [x] Install: `i18next react-i18next @expo/vector-icons expo-font @gorhom/bottom-sheet zustand axios expo-secure-store`
- [x] Also installed: `@expo-google-fonts/inter` (Inter 400/500/600/700)

### Foundation files ✅
- [x] `src/constants/theme.ts` — Colors, Typography, Spacing, Radius, Shadows, IconSize
- [x] `src/constants/icons.ts` — MaterialIcons name constants (no magic strings in screens)
- [x] `src/locales/en.json` — common keys + empty namespace stubs
- [x] `src/locales/fa.json` — empty `{}`
- [x] `src/i18n/index.ts` — i18next config, English only (`lng: 'en'`), `translation` namespace, no RTL
- [x] `src/services/api.ts` — axios instance, Bearer header, refresh interceptor (rotates both tokens)
- [x] `src/stores/auth.store.ts` — Zustand + SecureStore

### UI Primitives (`components/ui/`) ✅
- [x] `Button.tsx` — primary / secondary / destructive / ghost; loading + disabled states
- [x] `Input.tsx` — focus border+shadow, error state, label, textarea variant; validates on blur
- [x] `Card.tsx` — default / emergency (3px danger left border) / accepted (primary50 bg)
- [x] `Pill.tsx` — 6 variants + `getStatusVariant()` helper for job status strings
- [x] `Avatar.tsx` — 4 sizes, initials fallback, verified badge overlay
- [x] `BottomSheet.tsx` — `@gorhom/bottom-sheet` v5 modal pattern; backdrop, handle, swipe-to-dismiss
- [x] `EmptyState.tsx` — icon + title + subtitle + optional CTA
- [x] `Toast.tsx` — Context provider + `useToast()` hook; success/error variants; 3s auto-dismiss
- [x] `ProgressBar.tsx` — 3px animated bar; supports `progress` (0–1) or `currentStep/totalSteps`
- [x] `ScreenWrapper.tsx` — SafeAreaView + optional scroll + keyboard avoiding
- [x] `Divider.tsx` — 1px gray200 horizontal line

### App shell ✅
- [x] `app/_layout.tsx` — root Stack, SafeAreaProvider, BottomSheetModalProvider, ToastProvider, i18n init, Inter font load, SplashScreen
- [x] `app/index.tsx` — auth guard → `/(auth)/phone` or `/(homeowner)/home` or `/(expert)/browse`

### Fixes applied during Phase 0
- `app.json` — `userInterfaceStyle: light`, splash + Android icon colors → primary600 teal
- `tsconfig.json` — exclude old broken `src/i18n/en` and `src/i18n/fa` directories
- `src/services/api.ts` — refresh interceptor was only rotating `accessToken`; fixed to also save `refreshToken`
- `src/services/auth.service.ts` — `RegisterPayload` now includes `zoneId?` + `address?` (required for HOMEOWNER)

---

## Phase 1 — Auth Screens ✅

Completed 2026-06-27. Zero TypeScript errors.

- [x] `(auth)/_layout.tsx` — Stack with headerShown: false
- [x] `(auth)/phone.tsx` — +93 prefix + numeric input; disabled until 9–10 digits; sendOtp → OTP screen
- [x] `(auth)/otp.tsx` — 6 visual boxes + hidden TextInput; auto-submit on 6 digits; 60s resend countdown; verifyOtp → login (existing) or register (new)
- [x] `(auth)/register.tsx` — 3-step flow: role picker → name (first+last) → location (HOMEOWNER only, zone picker modal + address); calls /auth/register; routes to expert onboarding or home

### Changes made during Phase 1
- `components/ui/Input.tsx` — converted to `forwardRef` so register.tsx can focus the last-name field from the first-name keyboard
- `services/auth.service.ts` — `AuthResponse.user.role` typed as `UserRole` (from @fixr/shared) to match auth store's `AuthUser` interface
- `constants/icons.ts` — added `chevronDown: 'expand_more'`
- `locales/en.json` — added `auth.phone.*`, `auth.otp.*`, `auth.register.*` keys

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
