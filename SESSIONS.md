# Fixr Mobile — Session Build Prompts

---

## How to Use

1. Find the phase you want to build in the checklist below
2. Scroll to that phase section
3. Copy **only the text between the two `═══` lines** — that is your prompt
4. Open a fresh Claude Code session and paste it
5. Claude Code builds everything. Come back here and mark it ✅ when done.

**Do not copy the phase heading, the "Builds / Design images" lines, or the `═══` lines themselves — only the text between them.**

---

## Progress Checklist

| # | Phase | What gets built | Status |
|---|---|---|---|
| 0 | Bootstrap | Foundation, primitives, app shell | ✅ Done |
| 1 | Auth | phone.tsx, otp.tsx, register.tsx | ✅ Done |
| 2 | Expert Onboarding | tazkira.tsx, business.tsx, submitted.tsx, users.service.ts | ⬜ |
| 3 | Homeowner Tabs | _layout, home, my-jobs, messages, profile | ⬜ |
| 4 | Expert Tabs | _layout, browse, my-bids, messages, profile | ⬜ |
| 5 | Job Posting | post/create, post/media, post/review | ⬜ |
| 6 | Job Detail & Bidding | homeowner/job/[id], expert/job/[id] | ⬜ |
| 7 | Active Jobs | expert/active-job/[id], homeowner/active-job/[id] | ⬜ |
| 8 | Shared Screens | chat/[jobId], review/[jobId], dispute/[jobId] | ⬜ |

---

## Phase 2 — Expert Onboarding

**Builds:** `tazkira.tsx` · `business.tsx` · `submitted.tsx` · `src/services/users.service.ts`
**Design images:** `07-expert-onboarding-business.png` · `08-expert-submitted.png`

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, use the Read tool to open the design image listed below.
These are low-fidelity wireframes — use them for layout intent only, not measurements.
Always build using tokens from src/constants/theme.ts, never hardcoded values.

| Screen | Image to read first |
|---|---|
| business.tsx | docs/designs/07-expert-onboarding-business.png |
| submitted.tsx | docs/designs/08-expert-submitted.png |
| tazkira.tsx | No dedicated image — follow the selfie.tsx pattern (two upload zones instead of one) |

## Current state

Phases 0 and 1 are complete. Phase 2 is partially done:
- ✅ apps/mobile/app/(auth)/expert-onboarding/_layout.tsx
- ✅ apps/mobile/app/(auth)/expert-onboarding/selfie.tsx — read this file first, it is the pattern for all upload screens in this phase
- ✅ All i18n keys already exist in src/locales/en.json under auth.onboarding.*
- ✅ mediaService.uploadExpert(target, uri, mimeType) exists in src/services/media.service.ts
- ✅ lookupService.zones() exists in src/services/lookup.service.ts

## What to build this session

### 1. src/services/users.service.ts (create this file)

```ts
import { api } from './api';

export const usersService = {
  getMe: () => api.get<UserProfile>('/users/me'),
  updateMe: (data: { name?: string; language?: string }) => api.patch('/users/me', data),
  submitVerification: (data: SubmitVerificationPayload) =>
    api.post('/users/me/submit-verification', data),
  updateZones: (zoneIds: string[]) => api.patch('/users/me/zones', { zoneIds }),
  updateAvailability: (isAvailable: boolean) =>
    api.patch('/users/me/availability', { isAvailable }),
};

export interface SubmitVerificationPayload {
  shopName?: string;
  description?: string;
  shopZoneId: string;
  shopAddress: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: 'HOMEOWNER' | 'EXPERT';
  avatarUrl?: string | null;
  language?: string;
  expertProfile?: ExpertProfile;
  homeownerProfile?: HomeownerProfile;
}

export interface ExpertProfile {
  id: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isAvailable: boolean;
  rating: number;
  completedJobs: number;
  totalJobs: number;
  completionRate: number;
  noShowCount: number;
  positivePoints: number;
  negativePoints: number;
  shopName?: string;
  description?: string;
  shopZoneId?: string;
  shopAddress?: string;
  shopZone?: { id: string; nameEn: string };
  creditBalance: { balance: number };
  serviceZones: { zone: { id: string; name: string; nameEn: string } }[];
}

export interface HomeownerProfile {
  id: string;
  zoneId: string;
  address: string;
  zone: { id: string; nameEn: string };
  positivePoints: number;
  negativePoints: number;
}
```

### 2. apps/mobile/app/(auth)/expert-onboarding/tazkira.tsx

Read selfie.tsx before building this — follow the exact same UploadStatus state machine and UI pattern.

- ProgressBar currentStep={2} totalSteps={3}
- Back button (same 32×32 gray100 circle style as selfie.tsx) → router.back()
- Step label: t('auth.onboarding.stepLabel', { current: 2, total: 3 })
- Title: t('auth.onboarding.tazkiraTitle')
- Subtitle: t('auth.onboarding.tazkiraSubtitle')
- Two upload zones stacked vertically with Spacing.s4 gap:
  - Front zone: label t('auth.onboarding.tazkiraFrontLabel'), height 160, same dashed-border style as selfie
  - Back zone: label t('auth.onboarding.tazkiraBackLabel'), height 160, same style
  - Each zone independently has its own UploadStatus state: idle / uploading / done / error
  - Front upload: mediaService.uploadExpert('tazkira_front', uri, mimeType)
  - Back upload: mediaService.uploadExpert('tazkira_back', uri, mimeType)
  - Done state: solid success600 border + green check circle overlay (same as selfie)
  - Error state: tap to retry (same as selfie)
  - Retake ghost row below each zone when image is picked and not uploading
- "Next" primary button at bottom: disabled until BOTH zones have status === 'done'
- On Next: router.push('/(auth)/expert-onboarding/business')

### 3. apps/mobile/app/(auth)/expert-onboarding/business.tsx

Read docs/designs/07-expert-onboarding-business.png first.

- ProgressBar currentStep={3} totalSteps={3}
- Back button → router.back()
- Title: t('auth.onboarding.businessTitle')
- Subtitle: t('auth.onboarding.businessSubtitle')
- Use ScreenWrapper with scroll={true}

Fields in this exact order:
1. Shop name — Input, required, label t('auth.onboarding.shopNameLabel'), placeholder t('auth.onboarding.shopNamePlaceholder'), validate on blur
2. Description — Input textarea (minHeight 100), optional, label t('auth.onboarding.shopDescLabel'), placeholder t('auth.onboarding.shopDescPlaceholder')
3. Shop zone — TouchableOpacity zone picker (same bottom sheet pattern as register.tsx). Required. Load zones from lookupService.zones() on mount. Show selected zone nameEn or placeholder. Error: t('auth.onboarding.errorShopZone')
4. Shop address — Input, required, label t('auth.onboarding.shopAddressLabel'), placeholder t('auth.onboarding.shopAddressPlaceholder'), validate on blur
5. Shop photo — compact upload zone (height 120, dashed border, same mechanics as selfie zones): label t('auth.onboarding.shopPhotoLabel'), mediaService.uploadExpert('shop_image', uri, mimeType), shows thumbnail + done checkmark on success
6. Work license — same compact upload zone: label t('auth.onboarding.workLicenseLabel'), mediaService.uploadExpert('work_license', uri, mimeType), allow ImagePicker.launchImageLibraryAsync as an alternative to camera

"Submit for Verification" primary button:
- Label: t('auth.onboarding.submit')
- Disabled until: shopName filled AND shopZoneId selected AND shopAddress filled AND shop_image status 'done' AND work_license status 'done'
- On press: call usersService.submitVerification({ shopName, description, shopZoneId, shopAddress })

API call — POST /users/me/submit-verification:
- Request: { shopName?: string, description?: string, shopZoneId: string, shopAddress: string }
- Success 200: verificationStatus becomes PENDING → navigate to submitted screen
- Error 400 "Please upload your selfie, Tazkira (front and back), shop image, and work license before submitting." → show as toast error (this means a previous upload was lost)
- Error 400 "shopZoneId and shopAddress are required." → show as toast error
- On success: router.replace('/(auth)/expert-onboarding/submitted')

### 4. apps/mobile/app/(auth)/expert-onboarding/submitted.tsx

Read docs/designs/08-expert-submitted.png first.

- No ProgressBar, no back button, no tab bar
- Centered layout: flex 1, alignItems center, justifyContent center, paddingHorizontal Spacing.s6
- MaterialIcons "check_circle" size={64} color={Colors.success600}, marginBottom Spacing.s4
- Title: t('auth.onboarding.submittedTitle') — Typography.heading1, Colors.primary600, textAlign center
- Body: t('auth.onboarding.submittedBody') — Typography.body, Colors.gray600, textAlign center, marginTop Spacing.s3, marginBottom Spacing.s8
- Primary Button: label t('auth.onboarding.submittedCta') → router.replace('/(expert)/browse')

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 2 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 3 — Homeowner Tabs

**Builds:** `(homeowner)/_layout.tsx` · `home.tsx` · `my-jobs.tsx` · `messages.tsx` · `profile.tsx`
**Design images:** `10-homeowner-tab-home.png` · `11-homeowner-tab-myjobs.png` · `12-homeowner-tab-messages.png` · `13-homeowner-tab-profile.png`

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, use the Read tool to open the corresponding design image.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen | Image to read first |
|---|---|
| home.tsx | docs/designs/10-homeowner-tab-home.png |
| my-jobs.tsx | docs/designs/11-homeowner-tab-myjobs.png |
| messages.tsx | docs/designs/12-homeowner-tab-messages.png |
| profile.tsx | docs/designs/13-homeowner-tab-profile.png |

## Current state

Phases 0, 1, and 2 are complete. The auth flow routes to /(homeowner)/home after homeowner login. app/index.tsx already handles this routing based on user.role from the Zustand auth store. The /(homeowner)/ route group does not exist yet.

Available services:
- src/services/jobs.service.ts — jobsService.list(params) calls GET /jobs
- src/services/auth.service.ts — authService.logout(refreshToken)
- src/services/users.service.ts — usersService.getMe(), usersService.updateMe(data)
- src/services/notifications.service.ts — check if getNotifications() exists, add if not
- src/stores/auth.store.ts — useAuthStore() has user (name, role, phone) and clearAuth()
- SecureStore key for refresh token: 'fixr_refresh_token'

## What to build this session

### 1. apps/mobile/app/(homeowner)/_layout.tsx

Four-tab bottom navigator using expo-router Tabs component.

Tab bar style:
- height: 64 + safe area bottom inset
- backgroundColor: Colors.white
- borderTopWidth: 1, borderTopColor: Colors.gray200
- tabBarActiveTintColor: Colors.primary600
- tabBarInactiveTintColor: Colors.gray400
- tabBarLabelStyle: fontSize 11, fontWeight '500'
- headerShown: false on all tabs

Tabs in order:
1. name="home" — title "Home", MaterialIcons "home"
2. name="my-jobs" — title "My Jobs", MaterialIcons "work"
3. name="messages" — title "Messages", MaterialIcons "chat_bubble"
4. name="profile" — title "Profile", MaterialIcons "person"

Messages tab badge: on mount, call GET /notifications/me?limit=1. If response.unreadCount > 0, show a red dot (8px circle, danger600) on the tab icon. Use local useState for this — no global state needed.

### 2. apps/mobile/app/(homeowner)/home.tsx

Read docs/designs/10-homeowner-tab-home.png first.

API: jobsService.list({ limit: 3, page: 1 }) — returns the homeowner's own jobs.
Response shape: { data: Job[], total: number }

Load on mount. Show ActivityIndicator while loading.

Large header (render inside the screen, not as a Stack header):
- White container, borderBottomWidth 1, borderBottomColor Colors.gray200, paddingHorizontal Spacing.s4, paddingTop Spacing.s4, paddingBottom Spacing.s3
- Greeting (12px, Colors.gray400): "Good morning / afternoon / evening, [firstName]" — derive greeting from time of day. firstName = first word of user.name from auth store.
- Title (Typography.display — 28px 700 primary600): "What needs fixing?"

Scrollable content inside ScreenWrapper:
- "Post a Job" primary Button full width, label "Post a Job", MaterialIcons "add" left icon — onPress: router.push('/(homeowner)/post/create')
- If jobs exist:
  - Section label row: "RECENT ACTIVITY" (12px 600 primary600 uppercase, left) + "See all" (13px primary600, right) — See all navigates to my-jobs tab
  - Up to 3 job cards using the Card component: title (Typography.heading3, primary600) + zone nameEn + time ago (caption gray400) + status Pill. Tap → use navigation rules below.
- If no jobs: EmptyState icon="home_repair_service" title="Your home is in good hands" subtitle="Post your first job and get bids from verified local experts." with Post a Job primary button

Navigation rules (used in home.tsx and my-jobs.tsx):
- status 'OPEN' → router.push('/(homeowner)/job/' + id)
- status in ['ASSIGNED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETION_REQUESTED'] → router.push('/(homeowner)/active-job/' + id)
- status in ['COMPLETED','CANCELLED'] → router.push('/(homeowner)/job/' + id)

Add i18n keys under "homeowner.home".

### 3. apps/mobile/app/(homeowner)/my-jobs.tsx

Read docs/designs/11-homeowner-tab-myjobs.png first.

API: jobsService.list({ page: 1, limit: 50 })

Large header: "My Jobs" (Typography.display, primary600).

Toggle pills (local useState, default 'active'): "Active" | "Past"
- Active jobs: filter loaded list to status in [OPEN, ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED]
- Past jobs: filter to status in [COMPLETED, CANCELLED]
- Sort active list: EMERGENCY urgency first, then TODAY, then SCHEDULED, then by recency

Each active job Card:
- Title (heading3 primary600) + urgency Pill on same row
- Zone nameEn + " · " + relative time ago (caption gray400)
- Status Pill + bid count "X bids" if OPEN (caption gray600)
- Emergency jobs: Card variant="emergency" (3px danger600 left border)
- Tap → same navigation rules as home.tsx

Past jobs: same Card style but COMPLETED gets success100 tint, CANCELLED gets gray100 tint.

Pull-to-refresh with RefreshControl. Loading spinner while loading.
Empty states for each toggle with EmptyState component.

Add i18n keys under "homeowner.myJobs".

### 4. apps/mobile/app/(homeowner)/messages.tsx

Read docs/designs/12-homeowner-tab-messages.png first.

This is a simplified implementation — Stream Chat replaces it in Phase 8. For now, show jobs with accepted bids as conversation entries.

API: jobsService.list({ limit: 50 }) filtered client-side to status in [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED, COMPLETED].

Large header: "Messages" (Typography.display, primary600).

Flat list (not Card style — flat rows like iMessage):
Each row, height 72, paddingHorizontal Spacing.s4:
- Avatar component (40px, initials from job title)
- Job title (bodyMd gray900) + zone nameEn (caption gray400)
- Status Pill (right)
- Rows separated by Divider (1px gray200)
- Tap: router.push('/(shared)/chat/' + id)

Empty state: EmptyState icon="chat_bubble_outline" title="No conversations yet" subtitle="Accept a bid to start chatting with an expert."

Add i18n keys under "homeowner.messages".

### 5. apps/mobile/app/(homeowner)/profile.tsx

Read docs/designs/13-homeowner-tab-profile.png first.

API: usersService.getMe() on mount. GET /users/me returns homeownerProfile for HOMEOWNER role.
Response includes: homeownerProfile.positivePoints, homeownerProfile.zone.

Large header: "Profile" (Typography.display, primary600).

Top block (Card):
- Row: Avatar (56px, initials) + Column: user.name (heading2 gray900) + user.phone (caption gray400)
- "Edit profile" ghost Button (right-aligned) → open BottomSheet with a name Input. On save: usersService.updateMe({ name }) then update the auth store user.name.

Stats row (3 equal-width columns, horizontal View):
- Jobs Posted — show jobs.total from a separate jobsService.list({ limit: 1 }) call or derive from profile
- Positive reviews — homeownerProfile.positivePoints
- Completed — derive from list or show 0 for now (homeowner profile doesn't expose this directly)

Grouped settings sections (flat rows, height 52, separated by 1px gray200, with 8px gray100 block between sections):

Section 1: "My Reviews" (chevron right), "Reported Issues" (chevron right)
Section 2: "Notification Settings" (chevron right), "Language" (right label "English", chevron right)
Section 3: "Help & Support" (chevron right), "About Fixr" (chevron right)
Section 4: "Log Out" — danger600 text, centered, no icon, no chevron

Log Out action:
1. Get refresh token: await SecureStore.getItemAsync('fixr_refresh_token')
2. authService.logout(refreshToken)
3. useAuthStore.getState().clearAuth()
4. router.replace('/(auth)/phone')

Add i18n keys under "homeowner.profile".

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 3 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 4 — Expert Tabs

**Builds:** `(expert)/_layout.tsx` · `browse.tsx` · `my-bids.tsx` · `messages.tsx` · `profile.tsx`
**Design images:** `09-expert-pending.png` · `14-expert-tab-browse.png` · `15-expert-tab-mybids-bids.png` · `16-expert-tab-mybids-activejobs.png` · `17-expert-tab-messages.png` · `18-expert-tab-profile.png`

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, use the Read tool to open the corresponding design image.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen | Image to read first |
|---|---|
| browse.tsx — pending/rejected state | docs/designs/09-expert-pending.png |
| browse.tsx — live job feed | docs/designs/14-expert-tab-browse.png |
| my-bids.tsx — Bids view | docs/designs/15-expert-tab-mybids-bids.png |
| my-bids.tsx — Active Jobs view | docs/designs/16-expert-tab-mybids-activejobs.png |
| messages.tsx | docs/designs/17-expert-tab-messages.png |
| profile.tsx | docs/designs/18-expert-tab-profile.png |

## Current state

Phases 0–3 are complete. Homeowner tabs are fully built. The auth flow routes to /(expert)/browse for expert users. The /(expert)/ route group does not exist yet.

Available services:
- src/services/jobs.service.ts — jobsService.browse(params), jobsService.list(params)
- src/services/bids.service.ts — bidsService.mine()
- src/services/users.service.ts — usersService.getMe(), usersService.updateZones(), usersService.updateAvailability()
- src/services/lookup.service.ts — lookupService.zones(), lookupService.categories()
- src/services/auth.service.ts — authService.logout()
- src/stores/auth.store.ts — useAuthStore()

## What to build this session

### 1. apps/mobile/app/(expert)/_layout.tsx

Same tab bar specs as homeowner _layout.tsx.

Tabs in order:
1. name="browse" — title "Browse", MaterialIcons "search"
2. name="my-bids" — title "My Bids", MaterialIcons "gavel"
3. name="messages" — title "Messages", MaterialIcons "chat_bubble"
4. name="profile" — title "Profile", MaterialIcons "person"

Messages tab badge: same red dot pattern as homeowner (unreadCount > 0).

### 2. apps/mobile/app/(expert)/browse.tsx

Read docs/designs/09-expert-pending.png and docs/designs/14-expert-tab-browse.png first.

Load on mount:
1. usersService.getMe() → store as profile (need expertProfile.verificationStatus, serviceZones, creditBalance.balance)
2. lookupService.categories() → for filter chips
3. jobsService.browse({ categoryId }) → job feed

## PENDING / REJECTED STATE — render this when verificationStatus !== 'VERIFIED'

If verificationStatus === 'PENDING':
- Amber warning banner pinned below header (warning100 bg, warning600 text, padding Spacing.s4): "Your account is under review. You'll be notified once verified."
- Replace job feed with EmptyState: icon="hourglass_empty" (color Colors.warning600), title="Verification in progress", subtitle="Once approved, you'll see jobs in your zone here."
- No filter chips shown

If verificationStatus === 'REJECTED':
- Danger banner: "Your verification was rejected. Please resubmit your documents."
- EmptyState: icon="cancel" (danger600), title="Verification failed", subtitle="Go to your profile to resubmit."

## VERIFIED STATE — normal job feed

Large header (white, borderBottom 1px gray200, paddingHorizontal Spacing.s4):
- Left: "Jobs near you" (caption gray400) above primary zone name (display 28px primary600). Zone name = first serviceZone.zone.nameEn or "No zone set".
- Right: zone change button (ghost: "location_on" icon + "Change" label, primary600) + credit chip (primary100 pill: "● X credits", captionMd primary600)

Zone change: opens BottomSheet with FlatList of all zones from lookupService.zones(). Selecting calls usersService.updateZones([zoneId]) then reloads the feed.

If serviceZones is empty: show EmptyState with "Set your zone" CTA that opens the zone picker.

Category filter chips (below header, horizontal FlatList, showsHorizontalScrollIndicator={false}):
- "All" chip + one per category (nameEn)
- Selected: primary600 bg, white text, radius full
- Unselected: white bg, 1.5px gray200 border, gray600 text
- On tap: set selectedCategoryId (or null for "All"), reload jobsService.browse({ categoryId })

Job feed (FlatList, gap Spacing.s3, pull-to-refresh, RefreshControl):

Each job Card:
- Emergency jobs: 3px danger600 left border
- Row 1: title (heading3 primary600) + urgency Pill (right)
- Row 2: zone nameEn + " · " + time ago (caption gray400)
- Row 3: description (body gray600, numberOfLines={2})
- Row 4: Divider
- Row 5: homeowner trust block — "Posted by [firstName] · ★ [positivePoints] · [jobsPosted] jobs" (caption gray600)
- "Place Bid · 1 credit" primary Button full width → router.push('/(expert)/job/' + job.id)

API response shape for GET /jobs/browse — each job includes:
```json
{
  "id": "...", "title": "...", "status": "OPEN", "urgency": "EMERGENCY",
  "description": "...", "address": "...",
  "category": { "id": "...", "nameEn": "Plumbing" },
  "zone": { "id": "...", "nameEn": "Karte Seh" },
  "_count": { "bids": 3 }, "openedAt": "...",
  "homeowner": { "firstName": "Ahmad", "positivePoints": 12, "jobsPosted": 4 }
}
```

Empty state (verified, no jobs): EmptyState icon="search_off" title="No jobs in this zone" subtitle="Try changing your zone or check back later."

### 3. apps/mobile/app/(expert)/my-bids.tsx

Read docs/designs/15-expert-tab-mybids-bids.png and docs/designs/16-expert-tab-mybids-activejobs.png first.

Load: bidsService.mine() for the Bids view. jobsService.list({ limit: 50 }) for the Active Jobs view (filtered client-side).

Large header: "My Bids" (display primary600).

Toggle pills (useState default 'bids'): "Bids" | "Active Jobs"

Bids view — each row (compact Card):
- Job title (heading3 primary600) + zone (caption gray400)
- "AFN [price]" (bodyMd gray900) left + bid status Pill right:
  - job.status === 'OPEN' and not withdrawn → warning pill "Pending"
  - job.acceptedBidId === bid.id → success pill "Accepted"
  - bid.isWithdrawn → gray pill "Withdrawn"
  - otherwise → gray pill "Not selected"
- Submitted time (caption gray400)
- Tap a Pending bid → router.push('/(expert)/job/' + job.id)

Active Jobs view — filter jobsService list to [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED]:
Each Card:
- Job title (heading3 primary600) + status Pill
- CTA primary Button full width, label based on status:
  - ASSIGNED → "I'm On My Way"
  - EN_ROUTE → "I've Arrived"
  - ARRIVED → "Start Job"
  - IN_PROGRESS → "Request Completion"
  - COMPLETION_REQUESTED → disabled "Waiting for confirmation..."
- Tap card → router.push('/(expert)/active-job/' + id)

Empty states for each view.

Add i18n keys under "expert.myBids".

### 4. apps/mobile/app/(expert)/messages.tsx

Read docs/designs/17-expert-tab-messages.png first.

Simplified implementation (same approach as homeowner messages.tsx — Stream Chat replaces in Phase 8).

API: jobsService.list({ limit: 50 }) filtered client-side to [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED, COMPLETED].

Large header: "Messages" (display primary600).

Same flat row layout as homeowner messages.tsx. Tap → router.push('/(shared)/chat/' + id).

Empty state: EmptyState icon="chat_bubble_outline" title="No conversations yet" subtitle="Your chat unlocks once a homeowner accepts your bid."

Add i18n keys under "expert.messages".

### 5. apps/mobile/app/(expert)/profile.tsx

Read docs/designs/18-expert-tab-profile.png first.

Load: usersService.getMe() on mount.

Large header: "Profile" (display primary600).

Top block (Card):
- Avatar (56px) + name (heading2 gray900) + phone (caption gray400)
- Verification status Pill inline below name: VERIFIED → success, PENDING → warning, REJECTED → danger
- "Edit profile" ghost Button → BottomSheet with name Input, on save usersService.updateMe({ name })

Credit block (Card, backgroundColor primary50, borderColor primary100, borderWidth 1.5):
- Section label "YOUR CREDITS" (12px 600 primary600 uppercase)
- Credit count (22px 700 primary600) + " credits available" (body gray600)
- "Buy Credits" secondary Button full width → Toast "Coming soon"
- Caption: "1 credit = 1 bid · Purchased credits never expire"

Stats row (4 equal chips): completedJobs, completionRate as "X%", rating as "★ X.X", noShowCount (only show if > 0, danger600 with cancel icon).

Grouped settings sections (same style as homeowner profile):
Section 1: "My Reviews", "Verification Documents", "Service Zones" → opens BottomSheet with current zones list and edit option
Section 2: "Notification Settings", "Language"
Section 3: "Help & Support", "About Fixr"
Section 4: "Log Out" → same logout logic as homeowner (authService.logout + clearAuth + router.replace('/(auth)/phone'))

Add i18n keys under "expert.browse" and "expert.profile".

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 4 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 5 — Job Posting Flow

**Builds:** `post/create.tsx` · `post/media.tsx` · `post/review.tsx` · adds `uploadJobMedia` to `media.service.ts` · adds `reviewsService` and `disputesService`
**Design images:** `19` through `25` — one per step

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Read the design image for each step before building that step.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Step / Screen | Image to read first |
|---|---|
| create.tsx — Step 1 category grid | docs/designs/19-job-posting-step1-category.png |
| create.tsx — Step 2 title + description | docs/designs/20-job-posting-step2-details.png |
| create.tsx — Step 3 urgency | docs/designs/21-job-posting-step3-urgency.png |
| create.tsx — Step 4 location | docs/designs/22-job-posting-step4-location.png |
| media.tsx — Step 5 photos + video | docs/designs/23-job-posting-step5-photo.png |
| review.tsx — Step 6 summary | docs/designs/24-job-posting-step6-review.png |
| Post success toast state | docs/designs/25-job-posting-successstate.png |

## Current state

Phases 0–4 are complete. The homeowner home.tsx has a "Post a Job" button that routes to /(homeowner)/post/create — that screen does not exist yet. All three screens in this phase need to be created.

Available:
- src/services/jobs.service.ts — jobsService.create(payload), jobsService.publish(id)
- src/services/lookup.service.ts — lookupService.categories(), lookupService.zones()
- src/services/media.service.ts — exists but needs new methods added (see below)

## Prep — add to existing service files before building screens

Add to src/services/media.service.ts:

```ts
uploadJobMedia: async (jobId: string, uri: string, mimeType?: string) => {
  const ext = mimeType?.split('/')[1] ?? 'jpg';
  const formData = new FormData();
  formData.append('file', { uri, name: `media.${ext}`, type: mimeType ?? 'image/jpeg' } as any);
  const { data } = await api.post(`/media/jobs/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as { id: string; url: string; type: string };
},
deleteJobMedia: async (mediaId: string) => {
  await api.delete(`/media/jobs/media/${mediaId}`);
},
```

Create src/services/reviews.service.ts:

```ts
import { api } from './api';
export const reviewsService = {
  submit: (jobId: string, data: SubmitReviewPayload) => api.post(`/jobs/${jobId}/review`, data),
  get: (jobId: string) => api.get(`/jobs/${jobId}/review`),
};
export interface SubmitReviewPayload {
  rating: number;
  comment?: string;
  isPositive?: boolean | null;
  tags?: string[];
}
```

Create src/services/disputes.service.ts:

```ts
import { api } from './api';
export const disputesService = {
  submit: (jobId: string, data: { reason: string; description: string }) =>
    api.post(`/jobs/${jobId}/dispute`, data),
};
```

## What to build this session

### Data flow across the 3 screens

- create.tsx collects steps 1–4 (category → details → urgency → location) then calls POST /jobs to create a DRAFT, then navigates to media.tsx passing the new job's id
- media.tsx uploads photos/video to that draft, then navigates to review.tsx passing the same jobId
- review.tsx shows a summary of the draft and calls POST /jobs/:id/publish

Pass jobId between screens using expo-router params:
- create.tsx → router.push('/(homeowner)/post/media?jobId=' + id)
- media.tsx → router.push('/(homeowner)/post/review?jobId=' + jobId)

### 1. apps/mobile/app/(homeowner)/post/create.tsx (Steps 1–4)

Build as a single screen with a local `step` state (1–4) that renders different content. ProgressBar shows step out of 6 total (steps 1–4 are in this file).

Back behavior: step > 1 → decrement step. step === 1 → show Alert "Discard this job?" before router.back().

Step 1 — Category (read 19-job-posting-step1-category.png):
- Title "What do you need help with?" (heading1 primary600)
- Load categories from lookupService.categories() on mount
- 2-column grid of TouchableOpacity cards, each 80px tall: category icon (MaterialIcons, 24px primary600) + nameEn (label gray900)
- Selected: 2px primary600 border + small check icon top-right
- Tap auto-advances to step 2 after 150ms

Step 2 — Details (read 20-job-posting-step2-details.png):
- Title "Describe the job" (heading1 primary600)
- Title Input (required, label "Job title", placeholder "e.g. Kitchen sink leaking", validate on blur, min 3 chars)
- Description Input textarea (required, label "Description", placeholder "Describe the problem...", minHeight 120, validate on blur, min 20 chars, character count below in caption gray400)
- "Next" primary Button → step 3

Step 3 — Urgency (read 21-job-posting-step3-urgency.png):
- Title "How urgent is this?" (heading1 primary600)
- Three full-width selectable Cards stacked with gap Spacing.s3:
  - "Emergency" — MaterialIcons "flash_on" (danger600, 20px) + "Emergency" (heading3) + "I need help as soon as possible" (body gray600)
  - "Today" — "schedule" icon (warning600) + "Today" + "Anytime today works"
  - "Scheduled" — "calendar_today" (gray400) + "Scheduled" + "I'll pick a specific date"
- Selected card: 2px primary600 border
- "Scheduled" selection: show a date text Input below the card (placeholder "YYYY-MM-DD")
- "Next" primary Button → step 4

Step 4 — Location (read 22-job-posting-step4-location.png):
- Title "Where is the job?" (heading1 primary600)
- Caption: "Experts in your zone will be notified about this job."
- Zone picker (required): same BottomSheet pattern as register.tsx. Load zones from lookupService.zones(). Pre-fill with homeowner's zone: call usersService.getMe() on mount and set zoneId from homeownerProfile.zoneId.
- Address Input (required, label "Address", placeholder "e.g. 12th Street, House No. 102, near the blue mosque")
- Caption: "Your registered phone number will be visible to the expert after bid acceptance."
- "Post Job" primary Button

On "Post Job" press:
1. Validate zone selected and address filled
2. Set button to loading state
3. Call jobsService.create({ title, description, categoryId, zoneId, address, urgency, scheduledAt })

POST /jobs request:
```json
{ "title": "...", "description": "...", "categoryId": "...", "zoneId": "...", "address": "...", "urgency": "EMERGENCY", "scheduledAt": null }
```
Response 201: { "id": "clx..." }

4. On success: router.push('/(homeowner)/post/media?jobId=' + id)
5. On error: toast error, reset button

### 2. apps/mobile/app/(homeowner)/post/media.tsx (Step 5)

Read docs/designs/23-job-posting-step5-photo.png first.

```ts
const { jobId } = useLocalSearchParams<{ jobId: string }>();
```

ProgressBar currentStep={5} totalSteps={6}.
Standard stack header: back arrow + title. On back: Alert "Go back? Your draft is saved." then router.back().

Title "Add photos or a video" (heading1 primary600)
Caption: "Clear photos help experts bid accurately."

Photo section (label "PHOTOS" — section label style):
- 3-slot horizontal row. Each slot: dashed border square, flex 1, aspectRatio 1, Radius.md
- Empty slot: MaterialIcons "add_a_photo" (gray400, 24px) centered. Tap → ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.85 })
- On pick: call mediaService.uploadJobMedia(jobId, uri, mimeType) immediately. Show ActivityIndicator overlay while uploading.
- Filled slot: thumbnail Image (resizeMode cover) + small "×" button top-right (20×20, danger600 circle). Tap × → mediaService.deleteJobMedia(mediaId) then remove from state.
- State: photos: Array<{ uri: string, mediaId: string, status: 'uploading' | 'done' | 'error' }>
- After 3 photos, hide remaining empty slots

Video section (label "VIDEO (OPTIONAL)" — section label style):
- "Add Video" secondary Button with "videocam" icon
- Tap → ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Videos' })
- Upload with mediaService.uploadJobMedia(jobId, uri, 'video/mp4')
- Show video placeholder (gray100 rectangle) + duration + "×" remove button
- Max 1 video

"Continue" primary Button → router.push('/(homeowner)/post/review?jobId=' + jobId)
"Skip for now" ghost Button below → same navigation

### 3. apps/mobile/app/(homeowner)/post/review.tsx (Step 6)

Read docs/designs/24-job-posting-step6-review.png first.

```ts
const { jobId } = useLocalSearchParams<{ jobId: string }>();
```

Load job draft on mount: jobsService.get(jobId).

ProgressBar currentStep={6} totalSteps={6}.
Standard stack header with back arrow.
Title "Almost done!" (heading1 primary600)

Summary Cards (each Card with an "Edit" ghost link top-right — Edit navigates back to appropriate step, or just to create.tsx for simplicity):
1. Category: icon + nameEn
2. Title + description (body, clamped to 3 lines with "Show more" toggle)
3. Urgency Pill + scheduledAt date if SCHEDULED
4. Zone nameEn + address (body gray600)
5. Photos: small horizontal thumbnail row (max 3 Images, 64×64, Radius.sm, gap Spacing.s2)
6. "Your phone number will be shared after bid acceptance." (caption gray400)

"Post Job" primary Button (full width):
- On press: call jobsService.publish(jobId)
- POST /jobs/:id/publish (no body)
- Success: router.replace('/(homeowner)/home') + show toast "Job posted — experts in [zone] will start bidding shortly."
- Error 400 "Job must have at least one photo or a detailed description (50+ chars) before publishing.": show toast, do not navigate

Read docs/designs/25-job-posting-successstate.png to see how the success state should look on the home screen after posting.

## i18n

Add keys under "homeowner.post" in en.json.

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 5 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 6 — Job Detail & Bidding

**Builds:** `(homeowner)/job/[id].tsx` · `(expert)/job/[id].tsx`
**Design images:** `26` through `31` — different states of both screens

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Read all of the images below before building — each shows a different state of these screens.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image to read first |
|---|---|
| expert/job/[id].tsx — job detail view | docs/designs/26-expert-tab-postedjob-detail.png |
| expert/job/[id].tsx — bid form / confirm sheet | docs/designs/27-expert-tab-confirm-placing-bid.png |
| expert/job/[id].tsx — after bid placed | docs/designs/31-expert-tab-expertbid-placed-other-experts-see.png |
| homeowner/job/[id].tsx — bids list | docs/designs/28-expert-tab-postedjobs-bidslist.png |
| homeowner/job/[id].tsx — accept confirmation sheet | docs/designs/29-expert-tab-bid-accepted-confirmation.png |
| homeowner/job/[id].tsx — after acceptance (ASSIGNED) | docs/designs/30-expert-tab-afterbid-acceptance.png |

## Current state

Phases 0–5 are complete. My Jobs and Browse tabs navigate to these screens but they don't exist yet.

Available:
- src/services/jobs.service.ts — jobsService.get(id), jobsService.cancel(id, reason)
- src/services/bids.service.ts — bidsService.listForJob(jobId), bidsService.place(jobId, data), bidsService.accept(jobId, bidId), bidsService.update(bidId, data), bidsService.withdraw(bidId)
- src/services/users.service.ts — usersService.getMe()
- src/components/ui/BottomSheet.tsx

## What to build this session

### 1. apps/mobile/app/(homeowner)/job/[id].tsx

```ts
const { id } = useLocalSearchParams<{ id: string }>();
```

Load on mount: jobsService.get(id). If status === 'OPEN': also load bidsService.listForJob(id).

Standard stack header: back arrow + job title (truncated).

Content (ScreenWrapper scroll):

Image section:
- If job.media.length > 0: horizontal ScrollView of images, height 220, each Image resizeMode cover. Page dots below.
- If no images: category icon in primary50 container, height 120.

White content area (borderTopLeftRadius 24, borderTopRightRadius 24, margin -16 from image, white bg):
- Job title (heading1 primary600)
- Row: category nameEn chip (gray) + urgency Pill (right)
- Zone nameEn + " · " + time ago (caption gray400)
- Divider
- Section label "DESCRIPTION"
- Full description (body gray600)
- Divider
- Section label "LOCATION"
- address (body gray600) + zone.nameEn (caption gray400)

Bids section (only when status === 'OPEN'):
- Section label "BIDS RECEIVED" + count chip (primary100 "X bids")
- Sort row: "Price ↑" | "Arrival ↑" — local state, sort client-side
- Bid Cards:

  Bid response shape from GET /jobs/:id/bids:
  ```json
  {
    "id": "...", "price": 1500, "estimatedArrivalMinutes": 30,
    "estimatedDurationHours": 2.5, "warrantyDescription": "...",
    "expertMessage": "...", "isWithdrawn": false,
    "expert": {
      "id": "...", "rating": 4.8, "completedJobs": 24,
      "positivePoints": 18, "negativePoints": 1,
      "verificationStatus": "VERIFIED",
      "user": { "id": "...", "name": "Ahmad Karimi", "avatarUrl": null }
    }
  }
  ```

  Each bid Card:
  - Row: Avatar (40px) + expert name (bodyMd) + verified badge (MaterialIcons "verified" 16px success600) if VERIFIED + "★ X.X" (caption primary600, right)
  - "AFN [price]" (22px 700 gray900) + "~[estimatedArrivalMinutes]min arrival" (caption gray400, right)
  - Duration chip + warranty chip (if warrantyDescription exists)
  - expertMessage (body gray600, numberOfLines={2})
  - "Accept Bid" primary Button full width

Accept bid bottom sheet (BottomSheet, opens when "Accept Bid" tapped):
- Expert Avatar (56px, centered) + name + verified badge
- Price (28px 700 primary600, centered)
- "~Xmin arrival" (body gray600, centered) + "~X hours" (caption gray400)
- Divider
- "Once you accept, this expert will be assigned to your job and you can start chatting." (body gray600)
- "Confirm & Accept" primary Button
- "Go back" ghost Button

On "Confirm & Accept":
- bidsService.accept(jobId, bidId) — POST /jobs/:id/bids/:bidId/accept
- Response: { job: { ...status: 'ASSIGNED' }, bid: {...} }
- On success: close sheet, toast "Bid accepted — chat is now open with [Expert name]", router.replace('/(homeowner)/active-job/' + id)

Non-OPEN status display:
- Assigned expert block: Avatar (40px) + name (bodyMd) + verified badge
- "Message Expert" secondary Button → router.push('/(shared)/chat/' + id) — only when status ≥ ASSIGNED
- COMPLETED: "Leave a review" ghost Button → router.push('/(shared)/review/' + id)

Cancel button (Destructive Button "Cancel Job") — only when status === 'OPEN':
- Opens BottomSheet with optional reason Input + "Cancel Job" danger Button
- jobsService.cancel(id, reason) → router.back() + toast "Job cancelled"

### 2. apps/mobile/app/(expert)/job/[id].tsx

```ts
const { id } = useLocalSearchParams<{ id: string }>();
```

Load on mount: jobsService.get(id), bidsService.listForJob(id) to check for own bid, usersService.getMe() for credit balance.

Standard stack header: back arrow + "Job Details".

Content (ScreenWrapper scroll):

Same image carousel/placeholder as homeowner view.

White content area:
- Job title (heading1 primary600)
- Category + urgency Pill row
- Zone nameEn + time ago (caption gray400)
- Divider
- Section label "DESCRIPTION"
- Full description (body gray600)
- Divider
- Section label "HOMEOWNER" (trust block)
  - "Posted by [homeowner.firstName]" (bodyMd gray900)
  - "★ [positivePoints] positive reviews · [jobsPosted] jobs posted" (caption gray400)
  - NOTE: homeowner.phone is NOT shown at OPEN status. The API omits it for experts on OPEN jobs. Never try to display it.
- Divider
- Section label "LOCATION"
- Zone nameEn + address (body gray600)

Sticky bottom bar (position absolute, bottom 0, white bg, borderTop 1px gray200, padding Spacing.s4, row):
- Left: "[X] credits remaining" (caption gray400)
- Right: "Place Bid · 1 credit" primary Button (width 180) → opens bid form BottomSheet

If expert already has a bid on this job:
- Show their bid details in a card (price, message, status pill)
- "Edit Bid" secondary Button + "Withdraw Bid" ghost danger Button
- No "Place Bid" button shown

Bid form as a tall BottomSheet (snapPoints ['85%']):

Fields using Input component:
1. Price in AFN — required, numeric keyboard, label "Your price (AFN)", placeholder "e.g. 1500"
2. Estimated arrival in minutes — required, numeric, label "Estimated arrival (minutes)", placeholder "e.g. 30"
3. Estimated duration in hours — required, numeric, label "Estimated duration (hours)", placeholder "e.g. 2.5"
4. Warranty — optional, label "Warranty", placeholder "e.g. 3 months on parts and labor"
5. Message — optional, textarea, label "Message to homeowner", placeholder "Introduce yourself and explain your approach..."

Caption above submit: "Placing this bid will use 1 credit. You have X credits remaining."

"Submit Bid" primary Button:
- Disabled until price, estimatedArrivalMinutes, estimatedDurationHours filled
- On press: bidsService.place(id, { price, estimatedArrivalMinutes, estimatedDurationHours, warrantyDescription, expertMessage })

POST /jobs/:id/bids request:
```json
{ "price": 1500, "estimatedArrivalMinutes": 30, "estimatedDurationHours": 2.5, "warrantyDescription": "...", "expertMessage": "..." }
```
- Error 400 "Insufficient credits..." → toast error
- Error 409 "You have already placed a bid..." → toast error
- On success: close sheet, toast "Bid placed — 1 credit used", reload the screen to show "Bid placed" state

## i18n

Add keys under "homeowner.jobDetail" and "expert.jobDetail".

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 6 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 7 — Active Jobs

**Builds:** `(expert)/active-job/[id].tsx` · `(homeowner)/active-job/[id].tsx`
**Design images:** `32` through `38` — one image per lifecycle state

═══════════════════════════════════════════════════════════════════════════════
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Read ALL of these images before building — they show different lifecycle states of these two screens.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image to read first |
|---|---|
| expert/active-job/[id].tsx — ASSIGNED state | docs/designs/32-job-lifecycle-assigned-expert-CTA.png |
| expert/active-job/[id].tsx — IN_PROGRESS state | docs/designs/34-job-lifecycle-in-progress-expert-CTA.png |
| expert/active-job/[id].tsx — Request Completion sheet | docs/designs/35-job-lifecycle-request-completion-bottom-sheet.png |
| expert/active-job/[id].tsx — COMPLETED state | docs/designs/37-job-lifecycle-completed-expert-view.png |
| homeowner/active-job/[id].tsx — EN_ROUTE view | docs/designs/33-job-lifecycle-enroute-homeowner-view.png |
| homeowner/active-job/[id].tsx — COMPLETION_REQUESTED | docs/designs/36-job-lifecycle-completion-requested-homeowner-confirms.png |
| shared/dispute/[jobId].tsx — dispute form | docs/designs/38-job-lifecycle-dispute-form-homeowner-view.png |

## Current state

Phases 0–6 are complete. My Bids (Active Jobs view) and homeowner job detail navigate to these screens but they don't exist yet. src/services/disputes.service.ts was created in Phase 5.

Available:
- src/services/jobs.service.ts — markEnRoute, markArrived, markInProgress, requestCompletion, confirmCompletion
- src/services/disputes.service.ts — disputesService.submit(jobId, data)
- src/components/ui/BottomSheet.tsx

## What to build this session

### 1. apps/mobile/app/(expert)/active-job/[id].tsx

Read design images 32, 34, 35, 37 before building.

```ts
const { id } = useLocalSearchParams<{ id: string }>();
```

Load jobsService.get(id) on mount. Support pull-to-refresh.

Standard stack header: back arrow + job title (truncated).

Content (ScreenWrapper scroll):

Job summary Card:
- Title (heading2 gray900) + status Pill on same row
- Category nameEn + urgency (caption gray400)
- Section label "HOMEOWNER"
- Homeowner name (bodyMd gray900) + phone (body gray600, shown because status ≥ ASSIGNED — API includes it)
- Section label "LOCATION"
- Zone nameEn + address (body gray600). "Open in Maps" ghost Button → Linking.openURL('https://maps.google.com/?q=' + address)

Status timeline (visual progress row):
ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED
Show as circles connected by lines: completed states filled primary600, current state outlined primary600, future states gray200.

"Message Homeowner" secondary Button (chat_bubble icon) — shown when status ≥ ASSIGNED → router.push('/(shared)/chat/' + id)

Sticky CTA bar (white, borderTop 1px gray200, padding Spacing.s4, absolute bottom):
Render exactly ONE button based on current status:

| Status | Button | Action |
|---|---|---|
| ASSIGNED | "I'm On My Way" primary | jobsService.markEnRoute(id) then reload |
| EN_ROUTE | "I've Arrived" primary | jobsService.markArrived(id) then reload |
| ARRIVED | "Start Job" primary | jobsService.markInProgress(id) then reload |
| IN_PROGRESS | "Request Completion" primary | opens BottomSheet |
| COMPLETION_REQUESTED | disabled secondary "Waiting for confirmation..." | no action |
| COMPLETED | "Leave a Review" secondary | router.push('/(shared)/review/' + id) |

Request Completion BottomSheet:
- "Confirm job completion?" (heading2 gray900)
- Optional notes Input textarea: placeholder "Any notes for the homeowner?"
- "Send Completion Request" primary Button → jobsService.requestCompletion(id), close sheet, reload
- "Not yet" ghost Button → close sheet

"Raise a dispute" ghost link (danger600, 13px) — in scrollable content below timeline — shown when status in [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED]:
- router.push('/(shared)/dispute/' + id)

### 2. apps/mobile/app/(homeowner)/active-job/[id].tsx

Read design images 33 and 36 before building.

```ts
const { id } = useLocalSearchParams<{ id: string }>();
```

Load jobsService.get(id) on mount. Support pull-to-refresh.

Standard stack header: back arrow + "Active Job".

Content (ScreenWrapper scroll):

Job summary Card:
- Title (heading2 gray900) + status Pill
- Section label "YOUR EXPERT"
- Expert Avatar (40px) + name (bodyMd gray900) + verified badge (if VERIFIED)
- "★ X.X" (caption primary600) + "X jobs completed" (caption gray400)
- "Message Expert" secondary Button (chat_bubble icon) → router.push('/(shared)/chat/' + id)

Status timeline: same visual as expert view.

COMPLETION_REQUESTED amber banner (pinned below header, above scroll content):
- warning100 bg, warning600 text, padding Spacing.s4
- "Your expert says the job is done. Please review the work and confirm."
- Only shown when status === 'COMPLETION_REQUESTED'

Sticky CTA bar:

| Status | Content |
|---|---|
| ASSIGNED, EN_ROUTE | "Waiting for expert..." (caption gray400, centered, no button) |
| ARRIVED, IN_PROGRESS | "Job in progress" (caption gray400, centered, no button) |
| COMPLETION_REQUESTED | Two stacked buttons: "Confirm Completion" primary + "Raise a Dispute" destructive ghost |
| COMPLETED | "Leave a Review" secondary Button |

"Confirm Completion" action:
- Direct call, no extra sheet (the amber banner already explains it)
- jobsService.confirmCompletion(id) — POST /jobs/:id/complete (no body)
- On success: toast "Job completed!", then router.push('/(shared)/review/' + id)

"Raise a Dispute" → router.push('/(shared)/dispute/' + id)

"Raise a dispute" ghost link (danger600) in scrollable content — same as expert side — shown for any active non-completed status.

## Also create apps/mobile/app/(shared)/_layout.tsx and apps/mobile/app/(shared)/dispute/[jobId].tsx in this session

### apps/mobile/app/(shared)/_layout.tsx

```ts
import { Stack } from 'expo-router';
export default function SharedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### apps/mobile/app/(shared)/dispute/[jobId].tsx

Read docs/designs/38-job-lifecycle-dispute-form-homeowner-view.png first.

```ts
const { jobId } = useLocalSearchParams<{ jobId: string }>();
```

Standard stack header: back arrow + "Raise a Dispute".

Title "What went wrong?" (heading1 primary600)
Caption: "Our team will review and respond within 24 hours." (body gray600)

Reason selector (required) — single select list of TouchableOpacity rows with radio circle on left:
- "NO_SHOW" → "Expert didn't show up"
- "PRICE_DISPUTE" → "Price was different from the bid"
- "WORK_QUALITY" → "Work quality was unsatisfactory"
- "COMMUNICATION_ISSUE" → "Communication problems"
- "OTHER" → "Other"
Selected row: 2px primary600 border + filled primary600 radio circle.

Description Input textarea (required, min 20 chars), label "Describe what happened", placeholder "Describe in detail...", minHeight 120. Validate on blur.

"Submit Dispute" primary Button (backgroundColor danger600, white text — per destructive button spec):
- Disabled until reason selected AND description ≥ 20 chars
- On press: disputesService.submit(jobId, { reason, description })
  POST /jobs/:id/dispute: { "reason": "NO_SHOW", "description": "..." }
  Error 409 "Dispute already exists for this job." → toast error
  On success: toast "Dispute submitted. We'll review and respond within 24 hours." → router.back()

## i18n

Add keys under "expert.activeJob", "homeowner.activeJob", "shared.dispute".

## After building

Run `cd apps/mobile && npx tsc --noEmit` and fix all type errors.
Update PROGRESS.md to mark Phase 7 complete.
═══════════════════════════════════════════════════════════════════════════════

---

## Phase 8 — Shared Screens

**Builds:** `chat/[jobId].tsx` · `review/[jobId].tsx` · upgrades both Messages tabs to Stream Chat
**Design images:** `39` · `40` · `41` · `42` · `43`

═══════════════════════════════════════════════════════════════════════════════
You are completing the final phase of the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Read all of these images before building. These show the review screen in multiple states.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image to read first |
|---|---|
| review/[jobId].tsx — 5-star, positive tags | docs/designs/39-job-complete-review-lifecycle-homeowner-reviews-expert-(5_stars).png |
| review/[jobId].tsx — low rating, negative tags appear | docs/designs/40-job-complete-review-lifecycle-homeowner-leaves-low-rating-negative-tags-appear.png |
| review/[jobId].tsx — expert reviewing homeowner | docs/designs/41-job-completed-review-lifecycle-expert-reviews-homeowner.png |
| review/[jobId].tsx — submitted confirmation state | docs/designs/43-job-completed-review-lifecycle-review-submitted.png |
| Expert profile — reviews received section | docs/designs/42-expert-tab-profile-reviews-received.png |

Note: there is no design image for the chat screen. Use Stream Chat's standard UI components styled with Fixr's primary600 teal color overrides.

## Current state

Phases 0–7 are complete. shared/_layout.tsx and dispute/[jobId].tsx were built in Phase 7. src/services/reviews.service.ts and src/services/disputes.service.ts were created in Phase 5. Chat and review screens are navigated to from multiple places but don't exist yet. Both Messages tabs use a simplified job-list approach that needs upgrading to Stream Chat's ChannelList.

## Prep — add chat service if not already in src/services/chat.service.ts

```ts
import { api } from './api';
export const chatService = {
  getToken: (jobId: string) => api.get<ChatTokenResponse>(`/chat/jobs/${jobId}/token`),
};
export interface ChatTokenResponse {
  token: string;
  channelId: string;
  channelType: string;
  apiKey: string;
}
```

Install Stream Chat if not already in package.json:
```bash
cd apps/mobile && bun add stream-chat-react-native stream-chat
```

## What to build this session

### 1. apps/mobile/app/(shared)/chat/[jobId].tsx

```ts
const { jobId } = useLocalSearchParams<{ jobId: string }>();
```

On mount:
1. Call chatService.getToken(jobId) → { token, channelId, channelType, apiKey }
   - Error 403 "Chat is only available after a bid has been accepted." → EmptyState "Chat not available yet" with back button
2. Initialize Stream Chat client and connect user:
   ```ts
   import { StreamChat } from 'stream-chat';
   const client = StreamChat.getInstance(apiKey);
   await client.connectUser({ id: user.id, name: user.name }, token);
   const channel = client.channel(channelType, channelId);
   await channel.watch();
   ```
3. Render Stream Chat UI:
   ```tsx
   import { Chat, Channel, MessageList, MessageInput, OverlayProvider } from 'stream-chat-react-native';
   ```

Screen layout:
- Standard stack header: back arrow + "Chat"
- Full-height Stream Chat Channel component below header
- Apply Fixr teal color overrides via Stream's style/theme prop: message bubble color primary600, accent color primary600

Cleanup on unmount (useEffect return): await client.disconnectUser()

Show ActivityIndicator while connecting. Show error state with retry if connection fails.

### 2. Upgrade homeowner and expert messages.tsx to use Stream Chat ChannelList

After building the chat screen, update both Messages tab screens from Phase 3 and Phase 4.

Pattern for both:
- Initialize Stream Chat client using the same connectUser pattern (need a user-level token, not per-job)
- Use ChannelList component filtered to this user's channels
- Each channel row shows the other party's name + last message

However: the backend only has per-job chat tokens (GET /chat/jobs/:jobId/token), not a global user token. There is no /chat/token endpoint.

DECISION: Keep the simplified API-based list in both Messages tabs. Only chat/[jobId].tsx uses Stream Chat. The ChannelList upgrade requires a backend change (add a global user token endpoint) and is deferred. Do NOT change the Messages tab screens — they are correct as-is for this phase.

### 3. apps/mobile/app/(shared)/review/[jobId].tsx

Read design images 39, 40, 41, 43 before building.

```ts
const { jobId } = useLocalSearchParams<{ jobId: string }>();
```

Load jobsService.get(jobId) on mount to determine perspective (is current user the homeowner or the expert?).

Standard stack header: back arrow + "Leave a Review".

Title: "How was your experience with [other party's name]?" (heading2 gray900, textAlign center)

Star rating row (centered, horizontal, gap Spacing.s2):
- 5 MaterialIcons "star" at 36px each
- Tapped and below: Colors.primary600. Untapped: Colors.gray200.
- Tap to set rating (1–5)

Positive tag chips (always shown, multi-select):
If current user is HOMEOWNER reviewing EXPERT: "Punctual" · "Quality work" · "Professional" · "Fair price" · "Great communication"
If current user is EXPERT reviewing HOMEOWNER: "Clear instructions" · "Respectful" · "Payment ready" · "Easy to work with"

Negative tag chips (only shown when rating ≤ 3, shown in danger colors):
If HOMEOWNER: "Late" · "Poor quality" · "Unprofessional" · "Overpriced"
If EXPERT: "Unclear instructions" · "Disrespectful" · "Changed scope"

Chip style: unselected → gray100 bg, gray600 text. Positive selected → primary100 bg, primary600 border, primary600 text. Negative selected → danger100 bg, danger600 border, danger600 text. All chips: Radius.full, paddingVertical 6, paddingHorizontal 10, captionMd text.

Comment Input textarea (optional): placeholder "Add a comment (optional)", minHeight 100.

"Submit Review" primary Button:
- Disabled until rating > 0
- On press: build payload with this exact isPositive logic:
  - rating ≥ 4 AND positiveTagsSelected.length > 0 → isPositive: true
  - rating ≤ 2 AND negativeTagsSelected.length > 0 → isPositive: false
  - rating === 3 OR no tags selected → omit isPositive (do not include the field)
  - tags: [...selectedPositiveTags, ...selectedNegativeTags] as string[]
- Call reviewsService.submit(jobId, { rating, comment, isPositive, tags })

POST /jobs/:jobId/review:
```json
{ "rating": 5, "comment": "Great work!", "isPositive": true, "tags": ["Punctual", "Quality work"] }
```
- Error 400 "The 48-hour review window for this job has closed." → toast error, stay on screen
- On success: toast "Review submitted. Thank you!" → router.back()

"Skip for now" ghost Button (small, gray400) → router.back()

## i18n

Add keys under "shared.chat", "shared.review" in en.json.

## Final cleanup tasks

1. Run `cd apps/mobile && npx tsc --noEmit` — zero type errors required
2. Update PROGRESS.md — mark Phase 8 complete and all phases complete ✅
═══════════════════════════════════════════════════════════════════════════════

---

## File Map

```
apps/mobile/
├── app/
│   ├── (auth)/expert-onboarding/
│   │   ├── _layout.tsx ✅
│   │   ├── selfie.tsx  ✅
│   │   ├── tazkira.tsx     ← Phase 2
│   │   ├── business.tsx    ← Phase 2
│   │   └── submitted.tsx   ← Phase 2
│   ├── (homeowner)/
│   │   ├── _layout.tsx         ← Phase 3
│   │   ├── home.tsx            ← Phase 3
│   │   ├── my-jobs.tsx         ← Phase 3
│   │   ├── messages.tsx        ← Phase 3
│   │   ├── profile.tsx         ← Phase 3
│   │   ├── post/create.tsx     ← Phase 5
│   │   ├── post/media.tsx      ← Phase 5
│   │   ├── post/review.tsx     ← Phase 5
│   │   ├── job/[id].tsx        ← Phase 6
│   │   └── active-job/[id].tsx ← Phase 7
│   ├── (expert)/
│   │   ├── _layout.tsx         ← Phase 4
│   │   ├── browse.tsx          ← Phase 4
│   │   ├── my-bids.tsx         ← Phase 4
│   │   ├── messages.tsx        ← Phase 4
│   │   ├── profile.tsx         ← Phase 4
│   │   ├── job/[id].tsx        ← Phase 6
│   │   └── active-job/[id].tsx ← Phase 7
│   └── (shared)/
│       ├── _layout.tsx         ← Phase 7
│       ├── chat/[jobId].tsx    ← Phase 8
│       ├── review/[jobId].tsx  ← Phase 8
│       └── dispute/[jobId].tsx ← Phase 7
└── src/services/
    └── users.service.ts        ← Phase 2
```
