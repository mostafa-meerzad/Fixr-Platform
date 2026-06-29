# Fixr Mobile — Session Build Prompts

Each section below is a self-contained prompt to paste into a fresh Claude Code session.
CLAUDE.md is always loaded automatically, so these prompts only specify what's unique to each phase.

---

## Checklist

| Phase | Screens | Status |
|---|---|---|
| Phase 0 — Bootstrap | Foundation, primitives, app shell | ✅ Done |
| Phase 1 — Auth Screens | phone, otp, register | ✅ Done |
| Phase 2 — Expert Onboarding | tazkira, business, submitted | ⬜ Next |
| Phase 3 — Homeowner Tabs | _layout, home, my-jobs, messages, profile | ⬜ |
| Phase 4 — Expert Tabs | _layout, browse, my-bids, messages, profile | ⬜ |
| Phase 5 — Job Posting Flow | create, media, review | ⬜ |
| Phase 6 — Job Detail & Bidding | homeowner/job/[id], expert/job/[id] | ⬜ |
| Phase 7 — Active Jobs | expert/active-job/[id], homeowner/active-job/[id] | ⬜ |
| Phase 8 — Shared Screens | chat/[jobId], review/[jobId], dispute/[jobId] | ⬜ |

Mark each checkbox ✅ as sessions complete.

---

## Phase 2 — Expert Onboarding (Remaining Screens)

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, read the corresponding image from docs/designs/ using the Read tool.
These are low-fidelity wireframes — use them for layout intent and information hierarchy only.
Never copy pixel measurements from them. Always build using tokens from src/constants/theme.ts.

| Screen | Image file |
|---|---|
| tazkira.tsx | (no dedicated image — follow selfie.tsx pattern, two upload zones instead of one) |
| business.tsx | docs/designs/07-expert-onboarding-business.png |
| submitted.tsx | docs/designs/08-expert-submitted.png |

## Current state

Phases 0 and 1 are complete. Phase 2 is partially done:
- ✅ apps/mobile/app/(auth)/expert-onboarding/_layout.tsx — Stack, headerShown: false
- ✅ apps/mobile/app/(auth)/expert-onboarding/selfie.tsx — fully working; READ THIS FILE FIRST as the pattern for all upload screens
- ✅ All i18n keys for these screens already exist in src/locales/en.json under auth.onboarding.*
- ✅ mediaService.uploadExpert(target, uri, mimeType) is in src/services/media.service.ts
- ✅ lookupService.zones() is in src/services/lookup.service.ts (returns Zone[])

## What to build this session

Create these 4 files:

### 1. src/services/users.service.ts (new service file)

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
  shopZoneId: string;   // required
  shopAddress: string;  // required
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

- Read selfie.tsx first — follow the same UploadStatus state machine and UI pattern
- ProgressBar currentStep={2} totalSteps={3}
- Back button (same style as selfie) → router.back()
- Step label: t('auth.onboarding.stepLabel', { current: 2, total: 3 })
- Title: t('auth.onboarding.tazkiraTitle') — "Your Tazkira"
- Subtitle: t('auth.onboarding.tazkiraSubtitle') — "We need photos of both sides of your national ID."
- Two upload zones stacked vertically with gap Spacing.s4 between them:
  - Front zone label: t('auth.onboarding.tazkiraFrontLabel') — "Front side"
  - Back zone label: t('auth.onboarding.tazkiraBackLabel') — "Back side"
  - Each zone: same dashed-border style, height 160, tap to open camera
  - Front: mediaService.uploadExpert('tazkira_front', uri, mimeType)
  - Back: mediaService.uploadExpert('tazkira_back', uri, mimeType)
  - Each zone independently shows idle / uploading / done / error state
  - Done: solid success600 border + green check overlay (same as selfie)
  - Error: retry on tap (same as selfie)
  - Retake ghost row below each zone (visible when image picked and not uploading)
- "Next" primary button at bottom: disabled until BOTH zones are status 'done'
- On Next: router.push('/(auth)/expert-onboarding/business')
- i18n: takePhoto → t('auth.onboarding.takePhoto'), tazkiraFrontDone, tazkiraBackDone for done label text

### 3. apps/mobile/app/(auth)/expert-onboarding/business.tsx

- ProgressBar currentStep={3} totalSteps={3}
- Back button → router.back()
- Title: t('auth.onboarding.businessTitle') — "Business info"
- Subtitle: t('auth.onboarding.businessSubtitle') — "Required to verify you as a legitimate service provider."
- Scrollable content (use ScreenWrapper with scroll={true})

Fields in this exact order:
1. Shop / business name — Input, required, label: t('auth.onboarding.shopNameLabel'), placeholder: t('auth.onboarding.shopNamePlaceholder'), validate on blur: show t('auth.onboarding.errorShopName') if empty
2. Description — Input textarea (minHeight 100), optional, label: t('auth.onboarding.shopDescLabel'), placeholder: t('auth.onboarding.shopDescPlaceholder')
3. Shop zone — TouchableOpacity zone picker row (same pattern as register.tsx — show selected zone nameEn or placeholder, open BottomSheet with list). Required. Error: t('auth.onboarding.errorShopZone'). Load zones from lookupService.zones() on mount.
4. Shop address — Input, required, label: t('auth.onboarding.shopAddressLabel'), placeholder: t('auth.onboarding.shopAddressPlaceholder'), validate on blur: t('auth.onboarding.errorShopAddress')
5. Shop photo — compact upload card (height 120, dashed border, same mechanics as selfie): label t('auth.onboarding.shopPhotoLabel'), upload via mediaService.uploadExpert('shop_image', uri, mimeType). Shows thumbnail + done checkmark on success.
6. Work license — same compact upload card: label t('auth.onboarding.workLicenseLabel'), upload via mediaService.uploadExpert('work_license', uri, mimeType). Allow ImagePicker.launchImageLibraryAsync as alternative to camera (license might be a saved image). Shows thumbnail + done checkmark.

Submit button:
- Label: t('auth.onboarding.submit') — "Submit for Verification"
- Disabled until: shopName not empty AND shopZoneId selected AND shopAddress not empty AND shop_image status 'done' AND work_license status 'done'
- On press:
  1. Call usersService.submitVerification({ shopName, description, shopZoneId, shopAddress })
  2. API: POST /users/me/submit-verification
     Request: { shopName?: string, description?: string, shopZoneId: string, shopAddress: string }
     Success 200: verificationStatus becomes PENDING
     Error 400 "Please upload your selfie, Tazkira (front and back), shop image, and work license before submitting." → show in toast error
     Error 400 "shopZoneId and shopAddress are required." → should not happen (validated client-side) but show as toast
  3. On success: router.replace('/(auth)/expert-onboarding/submitted')

### 4. apps/mobile/app/(auth)/expert-onboarding/submitted.tsx

- No ProgressBar, no back button, no header
- ScreenWrapper (no scroll needed)
- Centered layout (flex: 1, alignItems: center, justifyContent: center, paddingHorizontal: Spacing.s6)
- MaterialIcons "check_circle" size={64} color={Colors.success600} — marginBottom Spacing.s4
- Text: t('auth.onboarding.submittedTitle') — "Application submitted!" — Typography.heading1, Colors.primary600, textAlign center
- Text: t('auth.onboarding.submittedBody') — body text about 24h review — Typography.body, Colors.gray600, textAlign center, marginTop Spacing.s3, marginBottom Spacing.s8
- Primary Button: label t('auth.onboarding.submittedCta') — "Got it"
- On press: router.replace('/(expert)/browse')

## After building all files

Add any missing i18n keys to src/locales/en.json.
Update PROGRESS.md: mark Phase 2 complete, all 4 items checked.
Run `cd apps/mobile && npx tsc --noEmit` — fix any type errors before finishing.
```

---

## Phase 3 — Homeowner Tabs

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, read the corresponding image using the Read tool.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen | Image file |
|---|---|
| home.tsx | docs/designs/10-homeowner-tab-home.png |
| my-jobs.tsx | docs/designs/11-homeowner-tab-myjobs.png |
| messages.tsx | docs/designs/12-homeowner-tab-messages.png |
| profile.tsx | docs/designs/13-homeowner-tab-profile.png |

## Current state

Phases 0, 1, and 2 are complete. The auth flow (phone → otp → register) correctly routes to /(homeowner)/home after homeowner login/registration. app/index.tsx already handles this routing based on user.role from the Zustand auth store.

Already available for use:
- All UI primitives in src/components/ui/ (Button, Input, Card, Pill, Avatar, BottomSheet, EmptyState, Toast, ProgressBar, ScreenWrapper, Divider)
- src/constants/theme.ts — Colors, Typography, Spacing, Radius, Shadows, IconSize
- src/constants/icons.ts — MaterialIcons name constants
- src/services/jobs.service.ts — jobsService.list(params) calls GET /jobs
- src/services/auth.service.ts — authService.logout(refreshToken)
- src/services/users.service.ts — usersService.getMe()
- src/services/notifications.service.ts — check if it has getNotifications(); add it if not
- src/stores/auth.store.ts — useAuthStore() — has user (name, role, phone), clearAuth()
- SecureStore key for refresh token: 'fixr_refresh_token'

## What to build this session

### 1. apps/mobile/app/(homeowner)/_layout.tsx

4-tab bottom navigator using expo-router Tabs component.

Tab bar specs:
- tabBarStyle: { height: 64 + safeAreaInset, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200 }
- tabBarActiveTintColor: Colors.primary600
- tabBarInactiveTintColor: Colors.gray400
- tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }
- headerShown: false on all tabs

Tabs (in order):
1. name="home" — title "Home", icon MaterialIcons "home"
2. name="my-jobs" — title "My Jobs", icon MaterialIcons "work"
3. name="messages" — title "Messages", icon MaterialIcons "chat_bubble"
4. name="profile" — title "Profile", icon MaterialIcons "person"

Badge on "messages" tab: fetch GET /notifications/me?limit=1 on mount, show red dot (8px circle, danger600) if unreadCount > 0. Do this with a local useState — no global state needed yet.

### 2. apps/mobile/app/(homeowner)/home.tsx

API: GET /jobs?limit=3&page=1 (returns homeowner's own jobs, most recent first)
Response shape: { data: Job[], total: number, page: number, limit: number, totalPages: number }

Load on mount with useState + useEffect. Show loading spinner while loading.

Header (large, NOT expo Stack header — render it inside the screen):
- White container, borderBottomWidth: 1, borderBottomColor: Colors.gray200, paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s3
- Greeting text (12px, gray400): derive from time of day — "Good morning", "Good afternoon", or "Good evening" + ", " + firstName (first word of user.name)
- Title (Typography.display — 28px 700 primary600): "What needs fixing?"

Content (inside ScreenWrapper scroll):
- "Post a Job" primary Button, full width, label "Post a Job", icon "add" (MaterialIcons, IconSize.btn, white, left of label) — onPress: router.push('/(homeowner)/post/create')
- If jobs.length > 0:
  - Section label row: "RECENT ACTIVITY" (left, 12px 600 primary600 uppercase) + TouchableOpacity "See all" (right, 13px primary600) → router.push('/(homeowner)/my-jobs')
  - Last 3 jobs as compact cards (Card component): title (Typography.heading3, primary600) + zone + time ago (caption gray400) + row with status Pill (right) + bid count label (left, "X bids" caption gray600). Tap → navigate based on status (see navigation rules below)
- If jobs.length === 0 (empty state): EmptyState icon="home_repair_service" title="Your home is in good hands" subtitle="Post your first job and get bids from verified local experts." with Post a Job primary button below

Job navigation rules (used in home.tsx and my-jobs.tsx):
- status === 'OPEN' → router.push(`/(homeowner)/job/${id}`)
- status in ['ASSIGNED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETION_REQUESTED'] → router.push(`/(homeowner)/active-job/${id}`)
- status in ['COMPLETED','CANCELLED'] → router.push(`/(homeowner)/job/${id}`) (read-only view — Phase 6 handles this)

Add i18n keys to en.json under "homeowner.home": greeting morning/afternoon/evening, sectionLabel, seeAll, postJob, emptyTitle, emptySubtitle.

### 3. apps/mobile/app/(homeowner)/my-jobs.tsx

API: jobsService.list({ page: 1, limit: 50 })

Large header: "My Jobs" (Typography.display, primary600).

Toggle pills (local useState, default 'active'):
- "Active" | "Past" — pill toggle as per CLAUDE.md Toggle Pills spec
- Active filters: status in [OPEN, ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED]
- Past filters: status in [COMPLETED, CANCELLED]
- Filter client-side from the loaded list (no separate API call)

Active list (sorted: EMERGENCY first, then TODAY, then SCHEDULED, then by recency):
Each job Card:
- Title (heading3, primary600, left) + urgency Pill (right) on same row
- Zone nameEn + " · " + relative time (caption, gray400)
- Status Pill (right) + (if OPEN: "X bids" label left; if ASSIGNED+: first word of expert name — this is not available from list endpoint, just show status)
- Emergency variant: Card with variant="emergency" (3px danger600 left border)
- Tap → same navigation rules as home.tsx

Past list: same Card but COMPLETED shows success100 bg tint; CANCELLED shows gray100 bg tint. No special logic needed beyond styling via Card variants or inline style.

Pull-to-refresh: RefreshControl. Loading state: ActivityIndicator centered.
Empty states: EmptyState with appropriate icon/text for each toggle state.

Add i18n keys under "homeowner.myJobs".

### 4. apps/mobile/app/(homeowner)/messages.tsx

This is an interim implementation — Stream Chat ChannelList replaces this in Phase 8. For now, show jobs where a bid was accepted (status: ASSIGNED through COMPLETED) as conversations.

API: jobsService.list({ status: 'ASSIGNED,EN_ROUTE,ARRIVED,IN_PROGRESS,COMPLETION_REQUESTED,COMPLETED', limit: 50 })

Large header: "Messages" (display, primary600).

List (FlatList, no card style — flat rows like iMessage):
Each row (height 72, paddingHorizontal Spacing.s4):
- Avatar component (size="sm" 40px) with initials of the expert — NOTE: the list endpoint does NOT return expert name. Simplify: show job title as the "conversation" name since we don't have expert details in the list response. Show job title in body-medium + "Accepted bid" below in caption gray400 + job zone + time (caption gray400, top-right). Tapping → router.push(`/(shared)/chat/${id}`)
- Separated by Divider (1px gray200)
- No unread dot (no real message data yet)

Empty state: EmptyState icon="chat_bubble_outline" title="No conversations yet" subtitle="Accept a bid to start chatting with an expert."

Add i18n keys under "homeowner.messages".

### 5. apps/mobile/app/(homeowner)/profile.tsx

API: usersService.getMe() on mount. Also SecureStore.getItemAsync('fixr_refresh_token') for logout.

Large header: "Profile" (display, primary600).

Top block (Card, padding Spacing.s4):
- Row: Avatar (size="lg" 56px, initials from name) + Column: name (heading2 gray900) + phone (caption gray400)
- "Edit profile" ghost Button (small, right-aligned) → show inline edit Modal (or bottom sheet) with Input for name. On save: PATCH /users/me { name }. Update Zustand auth store user after success.

Stats row (3 equal-width containers in a horizontal View, below top block):
- "Jobs Posted" / total count — derive count from homeownerProfile if available, or show 0
- "Completed" / completedJobs count — same
- "Good reviews" / positivePoints count
(GET /users/me returns homeownerProfile.positivePoints for homeowner)

Note: GET /users/me returns homeownerProfile for HOMEOWNER role. Use those fields for stats.

Grouped settings sections (flat list with 1px gray200 separators between rows, 8px gray100 block between sections):
Section 1: "My Reviews" (chevron_right icon) → placeholder navigation (screens TBD); "Reported Issues" (chevron_right)
Section 2: "Notification Settings" (chevron_right); "Language" (right label "English", chevron_right — no action for now)
Section 3: "Help & Support" (chevron_right); "About Fixr" (chevron_right)
Section 4: "Log Out" — danger600 text, centered, no icon, no chevron. On press: call authService.logout(refreshToken), then useAuthStore.clearAuth(), then router.replace('/(auth)/phone')

Row height: 52px. Row text: body gray900.

Add i18n keys under "homeowner.profile".

## After building all files

Run `cd apps/mobile && npx tsc --noEmit` — fix all type errors.
Update PROGRESS.md: mark Phase 3 complete.
```

---

## Phase 4 — Expert Tabs

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, read the corresponding image using the Read tool.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen | Image file |
|---|---|
| browse.tsx (pending state) | docs/designs/09-expert-pending.png |
| browse.tsx (live feed) | docs/designs/14-expert-tab-browse.png |
| my-bids.tsx — Bids view | docs/designs/15-expert-tab-mybids-bids.png |
| my-bids.tsx — Active Jobs view | docs/designs/16-expert-tab-mybids-activejobs.png |
| messages.tsx | docs/designs/17-expert-tab-messages.png |
| profile.tsx | docs/designs/18-expert-tab-profile.png |

## Current state

Phases 0–3 are complete. Homeowner tabs are built and working. The auth flow routes to /(expert)/browse for expert role users.

Already available:
- All UI primitives in src/components/ui/
- src/services/jobs.service.ts — jobsService.browse(params), jobsService.list(params)
- src/services/bids.service.ts — bidsService.mine()
- src/services/users.service.ts — usersService.getMe(), usersService.updateZones(zoneIds), usersService.updateAvailability(bool)
- src/services/lookup.service.ts — lookupService.zones(), lookupService.categories()
- src/services/auth.service.ts — authService.logout()
- src/stores/auth.store.ts — useAuthStore() for user, clearAuth()
- Homeowner tabs as reference for tab layout pattern

## What to build this session

### 1. apps/mobile/app/(expert)/_layout.tsx

4-tab bottom navigator — same tab bar specs as homeowner _layout.tsx.

Tabs (in order):
1. name="browse" — title "Browse", icon "search"
2. name="my-bids" — title "My Bids", icon "gavel"
3. name="messages" — title "Messages", icon "chat_bubble"
4. name="profile" — title "Person", icon "person"

Badge on "messages": same red dot pattern as homeowner (unreadCount > 0 from GET /notifications/me).

### 2. apps/mobile/app/(expert)/browse.tsx

This is the expert's job feed — the most important screen for experts.

State variables:
- profile: UserProfile | null (from GET /users/me)
- jobs: Job[] (from GET /jobs/browse)
- selectedCategoryId: string | null (filter)
- categories: Category[] (from GET /categories)
- zones: Zone[] (from GET /zones)
- isLoading, refreshing

Load on mount:
1. usersService.getMe() → set profile (need expertProfile.verificationStatus, expertProfile.serviceZones, expertProfile.creditBalance.balance)
2. lookupService.categories() → set categories for filter chips
3. jobsService.browse({ categoryId: selectedCategoryId }) → set jobs

## PENDING STATE (critical)

If profile.expertProfile.verificationStatus === 'PENDING':
- Show amber warning banner pinned below header (warning100 bg, warning600 text, body, padding Spacing.s4): "Your account is under review. You'll be notified once verified."
- Replace job feed with EmptyState: icon="hourglass_empty" (color warning600), title="Verification in progress", subtitle="Once approved, you'll see jobs in your zone here."
- No filter chips, no job cards

If profile.expertProfile.verificationStatus === 'REJECTED':
- Show danger100 banner: "Your verification was rejected. Please resubmit your documents."
- Same empty state, icon="cancel" danger600, title="Verification failed", subtitle="Go to your profile to resubmit."

Only show the live feed when verificationStatus === 'VERIFIED'.

## VERIFIED state (normal feed)

Large header (white container, borderBottom 1px gray200):
- Row: left side: small gray text "Jobs near you" (caption gray400) + primary zone name below it (display 28px primary600) — use first serviceZone.zone.nameEn or "No zone set"
- Row: right side: zone selector button (ghost: location_on icon 18px + "Change" label, primary600) + credit chip (primary100 pill: "● X credits" caption-medium primary600)
- The credit balance comes from profile.expertProfile.creditBalance.balance

Zone change: on press, open BottomSheet with a FlatList of zones from lookupService.zones(). Selecting a zone calls usersService.updateZones([zoneId]) (replaces all zones with just this one for simplicity; a multi-zone picker is a future enhancement). After success, reload the job feed.

If expertProfile.serviceZones.length === 0: prompt to select a zone — show EmptyState with "Set your zone" CTA that opens the zone picker.

Category filter chips (below header, horizontally scrollable FlatList):
- "All" chip + one chip per category (nameEn)
- Selected: primary600 bg, white text, radius full
- Unselected: white bg, 1.5px gray200 border, gray600 text
- On select: set selectedCategoryId (or null for "All"), reload jobsService.browse({ categoryId })

Job feed (FlatList, gap Spacing.s3, pull-to-refresh):
Each job Card (variant based on urgency):
- Emergency jobs: Card with 3px danger600 left border + urgency pill (danger100/danger600 bg/text)
- Row 1: job title (heading3, primary600 — note: use #0F766E per design system) + urgency Pill (right)
- Row 2: zone nameEn + " · " + relative time (caption gray400)
- Row 3: description (body gray600, 2 lines max, numberOfLines={2})
- Row 4: Divider
- Row 5: homeowner trust block: firstName + " · " + positivePoints + " 👍" + " · " + jobsPosted + " jobs" (caption gray600)
  NOTE: the browse API returns job.homeowner: { firstName, positivePoints, jobsPosted } — display these 3 fields
- Row 6: "Place Bid · 1 credit" — full-width primary Button onPress → router.push(`/(expert)/job/${job.id}`)

API response for each job in GET /jobs/browse:
```json
{
  "id": "...",
  "title": "...",
  "status": "OPEN",
  "urgency": "EMERGENCY" | "TODAY" | "SCHEDULED",
  "address": "...",
  "description": "...",
  "category": { "id": "...", "nameEn": "Plumbing" },
  "zone": { "id": "...", "nameEn": "Karte Seh" },
  "_count": { "bids": 3 },
  "openedAt": "...",
  "homeowner": { "firstName": "Ahmad", "positivePoints": 12, "jobsPosted": 4 }
}
```

Empty state (verified, no jobs): EmptyState icon="search_off" title="No jobs in this zone" subtitle="Try changing your zone or check back later."

### 3. apps/mobile/app/(expert)/my-bids.tsx

API calls:
- bidsService.mine() → returns array of bids, each with job info
- jobsService.list() → for active jobs (status in ASSIGNED through COMPLETION_REQUESTED)

Toggle pills (useState, default 'bids'): "Bids" | "Active Jobs"

**Bids view:**
Load from bidsService.mine(). Each item is a bid with its associated job.
Each row (compact card, no shadow just borders):
- Job title (heading3 primary600) + zone (caption gray400) on top row
- Their bid price: "AFN X,XXX" (bodyMd gray900, 17px 500) on left + bid status Pill right:
  - If job.status === 'OPEN' AND bid not withdrawn: Pill text "Pending", warning variant
  - If job.acceptedBidId === bid.id: Pill text "Accepted", success variant
  - If bid.isWithdrawn: Pill text "Withdrawn", gray variant
  - If job.status !== 'OPEN' AND job.acceptedBidId !== bid.id AND !bid.isWithdrawn: Pill text "Not selected", gray variant
- Submitted time (caption gray400)
- Tap on a Pending bid → router.push(`/(expert)/job/${job.id}`) (bid detail/edit — Phase 6)
- Tap on other statuses → nothing or same

Note: bidsService.mine() response shape — confirm with the API: GET /bids/mine returns bids, each with a `job` sub-object containing id, title, status, zone, acceptedBidId.

**Active Jobs view:**
Load from jobsService.list() — filtered client-side to status in [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED].
Each job Card:
- Job title (heading3 primary600) + homeowner first name — NOTE: list endpoint doesn't return homeowner name; just show job title + status pill
- Status Pill
- CTA button (primary, full width) showing the NEXT action:
  - ASSIGNED → "I'm On My Way" → router.push(`/(expert)/active-job/${id}`)
  - EN_ROUTE → "I've Arrived" → same
  - ARRIVED → "Start Job" → same
  - IN_PROGRESS → "Request Completion" → same
  - COMPLETION_REQUESTED → "Awaiting homeowner confirmation" (disabled primary button or secondary)
- Tap on the card (not just button) → router.push(`/(expert)/active-job/${id}`)

Empty states for each toggle.

### 4. apps/mobile/app/(expert)/messages.tsx

Same approach as homeowner messages.tsx (interim implementation, replaced by Stream Chat in Phase 8).

API: jobsService.list({ limit: 50 }) filtered to ASSIGNED through COMPLETED.
Each row shows job title + status. No expert/homeowner name available in list response. Show job title + zone as the "conversation entry". Tap → router.push(`/(shared)/chat/${id}`).

Large header: "Messages" (display primary600).
Empty state: EmptyState icon="chat_bubble_outline" title="No conversations yet" subtitle="Your chat unlocks once a homeowner accepts your bid."

### 5. apps/mobile/app/(expert)/profile.tsx

Load from usersService.getMe().

Large header: "Profile" (display primary600).

Top block (Card):
- Avatar (56px) + name (heading2 gray900) + phone (caption gray400)
- Verification status pill inline below name:
  - VERIFIED → success100/success600 "Verified"
  - PENDING → warning100/warning600 "Pending review"
  - REJECTED → danger100/danger600 "Rejected"
- "Edit profile" ghost button (right-aligned) → simple bottom sheet with name Input, on save PATCH /users/me { name }

Credit block (Card, bg primary50, border 1.5px primary100):
- Section label: "YOUR CREDITS" (12px 600 primary600 uppercase)
- Large credit number (22px 700 primary600) + " credits available" (body gray600) in same row
- "Buy Credits" secondary Button (full width) → placeholder for now (Toast "Coming soon")
- Caption: "1 credit = 1 bid · Purchased credits never expire"

Stats row (4 equal chips): completedJobs, completionRate% (format as "X%"), rating (star icon + "X.X"), noShowCount (only show if > 0, in danger600 with cancel icon).

Grouped settings sections (same structure as homeowner profile):
Section 1:
- "My Reviews" → placeholder
- "Verification Documents" → router.push to selfie screen or show read-only bottom sheet (placeholder for now)
- "Service Zones" → open BottomSheet with current zones displayed, edit option

Section 2: "Notification Settings", "Language" → placeholders
Section 3: "Help & Support", "About Fixr" → placeholders
Section 4: "Log Out" → same logout logic as homeowner (authService.logout + clearAuth + router.replace('/(auth)/phone'))

Add i18n keys under "expert.browse", "expert.myBids", "expert.messages", "expert.profile".

## After building all files

Run `cd apps/mobile && npx tsc --noEmit` — fix all type errors.
Update PROGRESS.md: mark Phase 4 complete.
```

---

## Phase 5 — Job Posting Flow

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen/step, read the corresponding image using the Read tool.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / Step | Image file |
|---|---|
| create.tsx — Step 1 (category grid) | docs/designs/19-job-posting-step1-category.png |
| create.tsx — Step 2 (title + description) | docs/designs/20-job-posting-step2-details.png |
| create.tsx — Step 3 (urgency) | docs/designs/21-job-posting-step3-urgency.png |
| create.tsx — Step 4 (location) | docs/designs/22-job-posting-step4-location.png |
| media.tsx — Step 5 (photos + video) | docs/designs/23-job-posting-step5-photo.png |
| review.tsx — Step 6 (summary + publish) | docs/designs/24-job-posting-step6-review.png |
| Post success state (toast + home screen) | docs/designs/25-job-posting-successstate.png |

## Current state

Phases 0–4 are complete. The homeowner home.tsx has a "Post a Job" button that navigates to /(homeowner)/post/create. That route doesn't exist yet.

Available:
- src/services/jobs.service.ts — jobsService.create(payload), jobsService.publish(id)
- src/services/lookup.service.ts — lookupService.categories(), lookupService.zones()
- src/services/media.service.ts — has uploadExpert(); needs a new uploadJobMedia() method added
- src/stores/auth.store.ts — useAuthStore() for user (to get homeownerProfile zone)
- All UI primitives in src/components/ui/

## Prep: add to src/services/media.service.ts

Add this new method to mediaService:

```ts
uploadJobMedia: async (jobId: string, uri: string, mimeType?: string): Promise<{ id: string; url: string; type: string }> => {
  const ext = mimeType?.split('/')[1] ?? 'jpg';
  const isVideo = mimeType?.startsWith('video/') ?? false;
  const fieldName = isVideo ? 'video' : 'file';  // backend expects 'file' for both actually
  const formData = new FormData();
  formData.append('file', { uri, name: `media.${ext}`, type: mimeType ?? 'image/jpeg' } as any);
  const { data } = await api.post(`/media/jobs/${jobId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
},
deleteJobMedia: async (mediaId: string): Promise<void> => {
  await api.delete(`/media/jobs/media/${mediaId}`);
},
```

Also add reviewsService.submitReview to src/services/reviews.service.ts if not yet implemented:
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

And add disputesService to src/services/reviews.service.ts or create src/services/disputes.service.ts:
```ts
export const disputesService = {
  submit: (jobId: string, data: { reason: string; description: string }) =>
    api.post(`/jobs/${jobId}/dispute`, data),
};
```

## What to build this session

### The 6-step job posting flow is split across 3 screen files

**Data flow:**
- Steps 1–4 (category, details, urgency, location) are collected in create.tsx — it calls POST /jobs at the END to create the DRAFT, then navigates to media.tsx passing the jobId
- Step 5 (photos/video) is in media.tsx — it uploads media to the draft and navigates to review.tsx passing the jobId
- Step 6 (review + publish) is in review.tsx — it shows a summary and calls POST /jobs/:id/publish

Use expo-router params to pass jobId between screens:
- create.tsx → after POST /jobs succeeds → router.push(`/(homeowner)/post/media?jobId=${id}`)
- media.tsx → router.push(`/(homeowner)/post/review?jobId=${jobId}`)

### 1. apps/mobile/app/(homeowner)/post/create.tsx (Steps 1–4)

ProgressBar: overall step out of 6 — but since 3 files cover 6 steps, show progress 1–4 here (currentStep varies 1-4 as user moves through; use local useState for step within this screen, start at 1).

Build this as a single screen with a local `step` state (1 to 4) that renders different content. Back arrow on step > 1 → decrement step; on step 1 → router.back() with a confirmation dialog ("Discard this job?").

**Step 1 — Category (auto-advances on tap)**
- Title: "What do you need help with?" (heading1 primary600)
- Load categories from lookupService.categories() on mount
- 2-column grid of category cards (TouchableOpacity, 80px tall, Card bg, center-aligned icon + nameEn):
  - Each card: MaterialIcons icon from category.icon field (mapped to MaterialIcons names — if icon string doesn't map directly, use "handyman" as fallback) + nameEn label below (label gray900)
  - Selected: primary600 border (2px) + small check icon (16px success600) top-right corner
  - On tap: set selectedCategoryId, then auto-advance to step 2 after 150ms (small delay so user sees selection)

**Step 2 — Job Details**
- Title: "Describe the job" (heading1 primary600)
- Title input (required, label "Job title", placeholder "e.g. Kitchen sink leaking"): validate on blur, min 3 chars
- Description textarea (required, label "Description", placeholder "Describe the problem — the more detail, the better bids you'll get", minHeight 120): validate on blur, min 20 chars. Character count below (caption gray400).
- "Next" primary button → step 3

**Step 3 — Urgency**
- Title: "How urgent is this?" (heading1 primary600)
- Three selectable cards (TouchableOpacity, full width, stacked, 16px gap):
  - "Emergency" — MaterialIcons "flash_on" (danger600 20px) left + "Emergency" heading3 gray900 + "I need help as soon as possible" body gray600. Selected: 2px primary600 border.
  - "Today" — "schedule" icon (warning600) + "Today" + "Anytime today works". Selected: 2px primary600 border.
  - "Scheduled" — "calendar_today" icon (gray400) + "Scheduled" + "I'll pick a specific date". Selected: 2px primary600 border + shows a date picker below the card (use a simple text input with a date format placeholder for now, or expo-datetime-picker if available).
- "Next" primary button → step 4

**Step 4 — Location (then create DRAFT)**
- Title: "Where is the job?" (heading1 primary600)
- Caption: "Experts in your zone will be notified about this job."
- Zone picker (required): same BottomSheet pattern as register.tsx. Pre-fill with homeowner's zone from GET /users/me homeownerProfile.zoneId — load this on screen mount. User can change it.
- Address input (required, label "Address", placeholder "e.g. 12th Street, House No. 102, near the blue mosque")
- Caption below address: "Your registered phone number will be visible to the expert after bid acceptance."
- "Post Job" primary button (label changes to "Post Job" on step 4 since this is the last step before moving to media)

On "Post Job" press:
1. Validate: zone selected, address not empty
2. Show loading (button loading state)
3. Call jobsService.create({ title, description, categoryId, zoneId, address, urgency, scheduledAt? })
4. POST /jobs request body:
   ```json
   { "title": "...", "description": "...", "categoryId": "...", "zoneId": "...", "address": "...", "urgency": "EMERGENCY"|"TODAY"|"SCHEDULED", "scheduledAt": "ISO string if SCHEDULED" }
   ```
   Response 201: { id: "clx..." } (plus other fields, but only id needed)
5. On success: router.push(`/(homeowner)/post/media?jobId=${id}`)
6. On error: toast error

### 2. apps/mobile/app/(homeowner)/post/media.tsx (Step 5)

Read jobId from route params: const { jobId } = useLocalSearchParams<{ jobId: string }>()

ProgressBar: pass currentStep={5} totalSteps={6}

Standard back arrow header: "Add Media" (heading1 primary600). On back: show confirmation "Go back? Your job was saved as a draft." — confirm → router.back() (they can always resume from My Jobs).

Title: "Add photos or a video" (heading1 primary600)
Caption: "Clear photos help experts bid accurately."

Photo section:
- Label "PHOTOS" (section label style — 12px 600 primary600 uppercase)
- 3-slot photo grid in a row (each slot: dashed border square, flex 1, aspectRatio 1, Radius.md):
  - Empty slot: MaterialIcons "add_a_photo" (gray400 24px) centered, tap to open ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.85 })
  - Filled slot: show thumbnail (Image resizeMode cover) + "×" close button (top-right, 20x20 danger600 circle, tap to call mediaService.deleteJobMedia(mediaId) then remove from state)
  - Max 3 photos; after 3, hide remaining empty slots
  - On pick: call mediaService.uploadJobMedia(jobId, uri, mimeType) immediately; show ActivityIndicator over slot while uploading
  - State: photos array of { uri, mediaId, status: 'uploading'|'done'|'error' }

Video section (below photos):
- Label "VIDEO (Optional)" (section label style)
- Single "Add Video" button (secondary Button, icon "videocam"): tap → ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Videos' }) — NOTE: Expo's MediaType for video
- After pick: upload with mediaService.uploadJobMedia(jobId, uri, 'video/mp4'), show thumbnail (or video icon placeholder since Video component is heavy) + duration + "×" remove button
- Max 1 video

"Continue" primary button → router.push(`/(homeowner)/post/review?jobId=${jobId}`)
Ghost "Skip for now" button below Continue → same navigation (valid if user added description ≥ 50 chars in create.tsx — but we can't validate here easily, so just allow skip and let the publish call in review.tsx show the backend error if needed)

### 3. apps/mobile/app/(homeowner)/post/review.tsx (Step 6)

Read jobId from route params.

On mount: load the draft job details from jobsService.get(jobId) to display the summary.

ProgressBar: currentStep={6} totalSteps={6}

Standard back arrow header: "Review your job".
Title: "Almost done!" (heading1 primary600)

Summary card sections (each Card with an "Edit" ghost link at top-right that navigates back):
1. Category: icon + nameEn
2. Title + Description (body, clamped to 3 lines with "Show more" toggle)
3. Urgency: urgency Pill + scheduledAt date if SCHEDULED
4. Location: zone nameEn + address (body gray600)
5. Photos: small horizontal thumbnail row (max 3 Images, 64x64 each, Radius.sm, gap 8) + "1 video" caption if video uploaded
6. Phone note: "Your registered phone number will be shared with the expert after bid acceptance." (caption gray400)

"Post Job" primary button (full width, bottom):
- On press: call jobsService.publish(jobId)
  POST /jobs/:id/publish (no body)
  Success 200: navigate to homeowner home tab + show success toast "Job posted — experts in [Zone] will start bidding shortly."
  Error 400 "Job must have at least one photo or a detailed description (50+ chars) before publishing.": show error toast + do NOT navigate

## i18n

Add keys under "homeowner.post.create", "homeowner.post.media", "homeowner.post.review" (or under "homeowner.jobPost" flat).

## After building

Run `cd apps/mobile && npx tsc --noEmit` — fix all type errors.
Update PROGRESS.md: mark Phase 5 complete.
```

---

## Phase 6 — Job Detail & Bidding

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen/state, read the corresponding images using the Read tool.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image file |
|---|---|
| expert/job/[id].tsx — job detail view | docs/designs/26-expert-tab-postedjob-detail.png |
| expert/job/[id].tsx — bid form / confirm bottom sheet | docs/designs/27-expert-tab-confirm-placing-bid.png |
| expert/job/[id].tsx — after bid placed (card shows "Bid Placed ✓") | docs/designs/31-expert-tab-expertbid-placed-other-experts-see.png |
| homeowner/job/[id].tsx — bids list | docs/designs/28-expert-tab-postedjobs-bidslist.png |
| homeowner/job/[id].tsx — accept confirmation bottom sheet | docs/designs/29-expert-tab-bid-accepted-confirmation.png |
| homeowner/job/[id].tsx — after bid accepted (ASSIGNED state) | docs/designs/30-expert-tab-afterbid-acceptance.png |

## Current state

Phases 0–5 are complete. Navigation from My Jobs and Browse tabs now pushes to /(homeowner)/job/[id] and /(expert)/job/[id] respectively. Those routes don't exist yet.

Available:
- src/services/jobs.service.ts — jobsService.get(id), jobsService.cancel(id, reason)
- src/services/bids.service.ts — bidsService.listForJob(jobId), bidsService.place(jobId, data), bidsService.accept(jobId, bidId), bidsService.update(bidId, data), bidsService.withdraw(bidId)
- src/services/users.service.ts — usersService.getMe()
- All UI primitives
- BottomSheet component in src/components/ui/BottomSheet.tsx

## What to build this session

### 1. apps/mobile/app/(homeowner)/job/[id].tsx

Read id from params: const { id } = useLocalSearchParams<{ id: string }>()

Load on mount:
- jobsService.get(id) → set job
- if job.status === 'OPEN': bidsService.listForJob(id) → set bids

Standard stack header: back arrow + title "Job Details" (or job.title truncated).

Content (ScreenWrapper with scroll):

**Image carousel (if job.media.length > 0):**
- Horizontal FlatList or ScrollView, full width, height 220
- Each image fills the slot (resizeMode: cover)
- Page dots below (small circles, active = primary600, inactive = gray300)
- If no images: show category icon in a primary50 bg container (height 120)

**White content card (overlaps image, borderTopLeftRadius 24 borderTopRightRadius 24, margin -16 from image):**
- Job title (heading1 primary600)
- Row: category Pill (gray) + urgency Pill (right)
- Zone nameEn + " · " + time since posted (caption gray400)
- Divider
- Section label "DESCRIPTION"
- Full description (body gray600)
- Divider
- Section label "LOCATION"
- address (body gray600) + zone.nameEn below (caption gray400)

**Bids section (only when status === 'OPEN'):**
- Section label "BIDS RECEIVED" + bid count chip (primary100, "X bids")
- Sort toggle: "Price ↑" | "Arrival ↑" — local state, sort client-side
- Bid cards (FlatList or map, each Card):
  - Row 1: Avatar (40px, initials) + name (bid.expert.user.name, bodyMd gray900) + verified badge (if VERIFIED) + Rating (body, "★ X.X" primary600, right)
  - Row 2: Price "AFN X,XXX" (22px 700 gray900) + "Arrives in ~Xmin" (caption gray400, right)
  - Row 3: Duration chip + warranty chip (if present)
  - Row 4: expertMessage (body gray600, 2 lines max, numberOfLines={2})
  - "Accept Bid" primary Button (full width, bottom of card)

  Bid response shape from GET /jobs/:jobId/bids:
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

**Accept bid flow (BottomSheet):**
When homeowner taps "Accept Bid":
1. Open BottomSheet (ref.current.present())
2. Bottom sheet content:
   - Expert Avatar (56px, centered) + name + verified badge
   - Price (28px 700 primary600, centered)
   - "Arrives in ~Xmin" (body gray600, centered)
   - "Estimated duration: X hours" (caption gray400, centered)
   - Divider
   - Body text gray600: "Once you accept, this expert will be assigned to your job and you can start chatting."
   - "Confirm & Accept" primary Button
   - "Go back" ghost Button

3. On "Confirm & Accept":
   - Call bidsService.accept(jobId, bidId)
   - POST /jobs/:jobId/bids/:bidId/accept (no body)
   - Response: { job: {..., status: 'ASSIGNED'}, bid: {...} }
   - On success: close sheet, show toast "Bid accepted — chat is now open with [Expert name]", reload job (status now ASSIGNED), navigate to /(homeowner)/active-job/[id] (since job is now active)

**Cancel job button:**
- Destructive Button "Cancel Job" below content — only shown when status === 'OPEN'
- On press: BottomSheet with reason input (optional) + "Cancel Job" danger button
- Call jobsService.cancel(id, reason)
- On success: navigate back to My Jobs tab + toast "Job cancelled"

**Status display for non-OPEN jobs (read-only view):**
- Show assigned expert info if status > OPEN: "Expert: [name]" block with avatar + verified badge
- Show status Pill prominently
- "Message Expert" secondary Button → router.push(`/(shared)/chat/${id}`) — only if status ≥ ASSIGNED
- For COMPLETED jobs: show "Leave a review" ghost button → router.push(`/(shared)/review/${id}`)
- For DISPUTED jobs: show DISPUTED pill + "View dispute status" label

### 2. apps/mobile/app/(expert)/job/[id].tsx

Read id from params.

Load on mount:
- jobsService.get(id) → set job
- Check if expert already has a bid: bidsService.listForJob(id) → find own bid (the expert only sees their own bid per API rules)
- usersService.getMe() → for credit balance

Standard stack header: back arrow + "Job Details".

Content (ScreenWrapper with scroll):

**Image carousel** — same as homeowner view.

**White content card:**
- Job title (heading1 primary600)
- Row: category Pill + urgency Pill
- Zone nameEn + time (caption gray400)
- Divider
- Section label "DESCRIPTION"
- Full description (body gray600)
- Divider
- Section label "HOMEOWNER" (trust block)
  - "Posted by [homeowner.firstName]" (bodyMd gray900) — homeowner.phone is NOT shown at OPEN status
  - "★ [positivePoints] positive reviews · [jobsPosted] jobs posted" (caption gray400)
  - NOTE: homeowner.phone is omitted in the API response for OPEN jobs — never try to display it
- Divider
- Section label "LOCATION"
- Zone nameEn + address (body gray600)

**Sticky bottom bar (position absolute bottom, white bg, borderTop 1px gray200, padding Spacing.s4):**
- Credit balance caption (left): "[X] credits remaining"
- "Place Bid · 1 credit" primary Button (right, width 180) → opens bid form

**If expert already has a bid on this job:**
- Show existing bid details in a card (price, message, status)
- "Edit Bid" secondary button + "Withdraw Bid" ghost danger button
- No "Place Bid" button

**Bid form (full-screen, push on stack: router.push(`/(expert)/job/${id}/bid`) — OR open as a tall BottomSheet):**
Use a BottomSheet approach (snapPoints ['85%']):

Fields (all stacked, Input components):
1. Price in AFN (required, numeric keyboard, label "Your price (AFN)", placeholder "e.g. 1500") — large, prominent
2. Estimated arrival (required, label "Estimated arrival", placeholder "e.g. Within 30 minutes"): store as minutes (or just a string for display — backend expects estimatedArrivalMinutes as number; show a numeric input labeled "Estimated arrival in minutes" with placeholder "e.g. 30")
3. Estimated duration hours (required, numeric, label "Estimated duration (hours)", placeholder "e.g. 2.5")
4. Warranty (optional, label "Warranty", placeholder "e.g. 3 months on parts and labor")
5. Message to homeowner (optional, textarea, label "Message", placeholder "Introduce yourself and explain your approach...")

Caption above submit: "Placing this bid will use 1 credit. You have X credits remaining."

"Submit Bid" primary Button:
- Disabled until price, estimatedArrivalMinutes, estimatedDurationHours filled
- On press: call bidsService.place(jobId, { price, estimatedArrivalMinutes, estimatedDurationHours, warrantyDescription, expertMessage })
  POST /jobs/:jobId/bids request shape:
  ```json
  { "price": 1500, "estimatedArrivalMinutes": 30, "estimatedDurationHours": 2.5, "warrantyDescription": "...", "expertMessage": "..." }
  ```
  Error 400 "Insufficient credits. Please purchase more credits to place a bid." → toast error
  Error 409 "You have already placed a bid on this job." → toast error (shouldn't happen if UI guards against it)
  On success: close sheet, show toast "Bid placed — 1 credit used", navigate back to Browse, update the job card to show "Bid Placed ✓" state

## After building

Run `cd apps/mobile && npx tsc --noEmit` — fix all type errors.
Update PROGRESS.md: mark Phase 6 complete.
```

---

## Phase 7 — Active Jobs

```
You are continuing the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen/state, read ALL the corresponding images using the Read tool — there are multiple images per screen showing different lifecycle states.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image file |
|---|---|
| expert/active-job/[id].tsx — ASSIGNED state CTA | docs/designs/32-job-lifecycle-assigned-expert-CTA.png |
| expert/active-job/[id].tsx — IN_PROGRESS state CTA | docs/designs/34-job-lifecycle-in-progress-expert-CTA.png |
| expert/active-job/[id].tsx — Request Completion bottom sheet | docs/designs/35-job-lifecycle-request-completion-bottom-sheet.png |
| expert/active-job/[id].tsx — COMPLETED state | docs/designs/37-job-lifecycle-completed-expert-view.png |
| homeowner/active-job/[id].tsx — EN_ROUTE view (homeowner waiting) | docs/designs/33-job-lifecycle-enroute-homeowner-view.png |
| homeowner/active-job/[id].tsx — COMPLETION_REQUESTED (confirm/dispute) | docs/designs/36-job-lifecycle-completion-requested-homeowner-confirms.png |
| shared/dispute/[jobId].tsx — dispute form | docs/designs/38-job-lifecycle-dispute-form-homeowner-view.png |

## Current state

Phases 0–6 are complete. Navigation pushes to /(expert)/active-job/[id] and /(homeowner)/active-job/[id] from My Bids and My Jobs screens respectively. Those routes don't exist yet.

Available:
- src/services/jobs.service.ts — jobsService.get(id), jobsService.markEnRoute(id), jobsService.markArrived(id), jobsService.markInProgress(id), jobsService.requestCompletion(id), jobsService.confirmCompletion(id)
- src/services/disputes.service.ts (created in Phase 5 prep) — disputesService.submit(jobId, data)
- src/components/ui/BottomSheet.tsx

## What to build this session

### 1. apps/mobile/app/(expert)/active-job/[id].tsx

Read id from params.

Load jobsService.get(id) on mount. Poll or pull-to-refresh for status changes.

Standard stack header: back arrow + job title (truncated to 24 chars).

Content (ScreenWrapper with scroll):

**Job summary card (Card component):**
- Job title (heading2 gray900) + Status Pill (right) on same row
- Category nameEn + urgency (caption gray400)
- Section label "HOMEOWNER"
- Homeowner name (bodyMd gray900) — homeowner.phone is NOW included in the response at ASSIGNED+ status (per API rules) — show it as a tappable "tel:" link: "📞 +93XXXXXXXXX" (or just display as text with a call icon)
- Section label "LOCATION"
- Zone nameEn + address (body gray600)
- "Open in Maps" ghost button → Linking.openURL(`https://maps.google.com/?q=${address}`)
- Section label "NOTES" (if job.notes exists)
- notes text (body gray600)

**Status timeline (visual progress indicator):**
Show all statuses in order with dots and lines:
ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED
Completed states: filled primary600 circle + primary600 line. Current state: outlined primary600 circle with pulsing animation or just solid. Future states: gray200 circle.

**Sticky CTA bar (bottom, white bg, borderTop, padding Spacing.s4):**
Render exactly ONE button based on current status:

| Status | Button label | Action |
|---|---|---|
| ASSIGNED | "I'm On My Way" | jobsService.markEnRoute(id) |
| EN_ROUTE | "I've Arrived" | jobsService.markArrived(id) |
| ARRIVED | "Start Job" | jobsService.markInProgress(id) |
| IN_PROGRESS | "Request Completion" | opens BottomSheet confirmation |
| COMPLETION_REQUESTED | disabled button "Waiting for confirmation..." | no action |
| COMPLETED | "Leave a Review" secondary button | router.push(`/(shared)/review/${id}`) |

Each CTA (except COMPLETION_REQUESTED) immediately calls the API on press (show loading on button), then reloads the job.

**"Request Completion" BottomSheet:**
- Title "Confirm job completion?" (heading2 gray900)
- "Any notes for the homeowner?" textarea (optional, Input, label omitted, placeholder "Optional notes...")
- "Send Completion Request" primary Button → jobsService.requestCompletion(id), then close sheet + reload job
- "Not yet" ghost Button → close sheet

**Chat button (persistent, above CTA bar):**
Secondary Button "Message Homeowner" with chat_bubble icon → router.push(`/(shared)/chat/${id}`)
Show only when status ≥ ASSIGNED.

**Dispute link (bottom of content, above CTA bar):**
Ghost text "Raise a dispute" in danger600, 13px — at very bottom of scrollable content.
On press: router.push(`/(shared)/dispute/${id}`)
Show only when status is in [ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETION_REQUESTED].

### 2. apps/mobile/app/(homeowner)/active-job/[id].tsx

Read id from params. Load jobsService.get(id) on mount.

Standard stack header: back arrow + "Active Job".

Content (ScreenWrapper with scroll):

**Job summary card:**
Same as expert view but from homeowner perspective:
- Job title (heading2 gray900) + Status Pill
- Assigned expert block (when status > OPEN):
  - Section label "YOUR EXPERT"
  - Expert Avatar (40px) + expert name (bodyMd gray900) + verified badge
  - Rating (caption primary600 "★ X.X") + completedJobs (caption gray400 "X jobs completed")
  - Secondary Button "Message Expert" (icon chat_bubble) → router.push(`/(shared)/chat/${id}`)
  Note: job.acceptedBid.expert is available in job detail response

**Status timeline:** same visual as expert view (both parties see the same progression)

**COMPLETION_REQUESTED state — amber banner (pinned below header, above scroll content):**
- warning100 bg, warning600 text border, padding Spacing.s4
- "Your expert says the job is done. Please review the work and confirm."
- This banner replaces the normal CTA bar content

**Sticky CTA bar:**
| Status | Content |
|---|---|
| ASSIGNED, EN_ROUTE | "Waiting for expert to arrive..." (caption gray400, centered) — no button |
| ARRIVED, IN_PROGRESS | "Job in progress" (caption gray400, centered) — no button |
| COMPLETION_REQUESTED | Two stacked buttons: "Confirm Completion" (primary) + "Raise a Dispute" (destructive ghost, danger600 text) |
| COMPLETED | "Leave a Review" secondary button → router.push(`/(shared)/review/${id}`) |

**"Confirm Completion" action:**
- Direct call (no extra confirmation needed — the banner already explains the action)
- jobsService.confirmCompletion(id)
- POST /jobs/:id/complete (no body)
- Success: reload job (now COMPLETED), show toast "Job completed!", then push to review screen

**"Raise a Dispute" action:**
- router.push(`/(shared)/dispute/${id}`)

**Dispute link (in scrollable content, below timeline):**
Ghost text "Raise a dispute" in danger600 — shown for any non-completed active status.
On press: router.push(`/(shared)/dispute/${id}`)

## After building

Run `cd apps/mobile && npx tsc --noEmit` — fix all type errors.
Update PROGRESS.md: mark Phase 7 complete.
```

---

## Phase 8 — Shared Screens (Chat, Review, Dispute)

```
You are completing the final phase of the Fixr mobile app rebuild on the `mobile-ui-v2` branch.

## Design references

Before building each screen, read ALL the corresponding images using the Read tool.
These are low-fidelity wireframes — layout intent only. Build using tokens from src/constants/theme.ts.

| Screen / State | Image file |
|---|---|
| shared/review/[jobId].tsx — homeowner reviews expert (5 stars, positive tags) | docs/designs/39-job-complete-review-lifecycle-homeowner-reviews-expert-(5_stars).png |
| shared/review/[jobId].tsx — low rating, negative tags appear | docs/designs/40-job-complete-review-lifecycle-homeowner-leaves-low-rating-negative-tags-appear.png |
| shared/review/[jobId].tsx — expert reviews homeowner | docs/designs/41-job-completed-review-lifecycle-expert-reviews-homeowner.png |
| shared/review/[jobId].tsx — review submitted confirmation | docs/designs/43-job-completed-review-lifecycle-review-submitted.png |
| expert profile — reviews received section (reference for profile.tsx review list) | docs/designs/42-expert-tab-profile-reviews-received.png |
| shared/dispute/[jobId].tsx — already referenced in Phase 7's images | docs/designs/38-job-lifecycle-dispute-form-homeowner-view.png |

Note: there is no dedicated chat screen design image. Build the chat screen using Stream Chat's standard UI components styled with Fixr's primary600 teal color overrides.

## Current state

Phases 0–7 are complete. All homeowner and expert screens are built. Three shared screens remain: chat, review, dispute. Navigation pushes to /(shared)/chat/[jobId], /(shared)/review/[jobId], and /(shared)/dispute/[jobId] from multiple places but those routes don't exist yet. The Messages tabs in Phase 3 and 4 used a simplified API-based list — this phase also upgrades them to use Stream Chat's ChannelList.

Available:
- src/services/chat.service.ts — check if getChatToken(jobId) exists; add if not
- src/services/reviews.service.ts — reviewsService.submit(jobId, data) (added in Phase 5 prep)
- src/services/disputes.service.ts — disputesService.submit(jobId, data) (added in Phase 5 prep)
- GET /chat/jobs/:jobId/token returns: { token, channelId, channelType, apiKey }
- Stream Chat SDK: install `stream-chat-react-native` (or check if installed) — this is the Expo-compatible package

## Prep

### Add to src/services/chat.service.ts

```ts
import { api } from './api';
export const chatService = {
  getToken: (jobId: string) =>
    api.get<ChatTokenResponse>(`/chat/jobs/${jobId}/token`),
};
export interface ChatTokenResponse {
  token: string;
  channelId: string;
  channelType: string;
  apiKey: string;
}
```

### Install Stream Chat if not installed:
```bash
cd apps/mobile && bun add stream-chat-react-native stream-chat
```
Check bun.lock / package.json first to avoid re-installing.

## What to build this session

### 1. apps/mobile/app/(shared)/_layout.tsx

```tsx
import { Stack } from 'expo-router';
export default function SharedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 2. apps/mobile/app/(shared)/chat/[jobId].tsx

Stream Chat integration screen.

Read jobId from params: const { jobId } = useLocalSearchParams<{ jobId: string }>()

On mount:
1. Call chatService.getToken(jobId) → { token, channelId, channelType, apiKey }
   Error 403 "Chat is only available after a bid has been accepted." → show EmptyState "Chat not available yet" with back button
2. Initialize Stream Chat client:
   ```ts
   import { StreamChat } from 'stream-chat';
   const chatClient = StreamChat.getInstance(apiKey);
   await chatClient.connectUser({ id: user.id, name: user.name }, token);
   const channel = chatClient.channel(channelType, channelId);
   await channel.watch();
   ```
3. Render the chat UI using stream-chat-react-native components:
   ```tsx
   import { Chat, Channel, MessageList, MessageInput, OverlayProvider } from 'stream-chat-react-native';
   ```

Screen layout:
- Standard back arrow header: "Chat" (or show job title — load from state after channel.watch())
- Full-height Stream Chat Channel component
- Apply Fixr color overrides via Stream's `theme` prop to match primary600 teal

Stream Chat theming overrides (pass as `style` prop to `Chat` component or use `DeepPartial<Theme>`):
- messageSimple.content.containerInner.backgroundColor: Colors.primary600 (own messages)
- colors.accent_blue: Colors.primary600

On unmount (useEffect cleanup): await chatClient.disconnectUser()

Show loading state while connecting.
Show error state if connection fails with retry button.

### 3. Upgrade homeowner messages.tsx and expert messages.tsx to use Stream Chat ChannelList

After building the chat screen, upgrade both Messages tab screens built in Phases 3 and 4.

Replace the simplified job-list approach with Stream Chat's ChannelList.

Pattern for both:
1. On mount: get user's Stream token — but we don't have a single "user token" endpoint, only per-job tokens. Use a different approach: call GET /chat/jobs/list-token (if it exists) or just keep the simplified list approach and only use Stream Chat on the chat/[jobId] screen.

DECISION: Keep the simplified API-based list in the Messages tabs (show jobs with accepted bids as conversation entries). Only the chat/[jobId].tsx screen uses Stream Chat directly. The ChannelList upgrade is a future enhancement. This is the correct implementation for the MVP.

Do NOT change the Messages tab screens. They are correct as built.

### 4. apps/mobile/app/(shared)/review/[jobId].tsx

Read jobId from params.

This screen appears as a bottom-sheet-style overlay after job completion, but implement it as a full screen pushed onto the stack (simpler and works from multiple entry points).

Standard stack header: back arrow + "Leave a Review".

Content (ScreenWrapper, scroll):

Load job from jobsService.get(jobId) to determine reviewer perspective (is current user the homeowner or expert?) and to get the other party's name.

Title: "How was your experience with [other party's name]?" (heading2 gray900, centered, marginBottom Spacing.s4)

**Star rating row (centered, horizontal, gap Spacing.s2):**
5 stars, each MaterialIcons "star" 36px:
- Selected: Colors.primary600 (teal)
- Unselected: Colors.gray200
- Tap to select rating (1–5)

**Tag chips (below stars):**
Positive tags (always shown, multiSelect):
- If current user is HOMEOWNER reviewing EXPERT: "Punctual" · "Quality work" · "Professional" · "Fair price" · "Great communication"
- If current user is EXPERT reviewing HOMEOWNER: "Clear instructions" · "Respectful" · "Payment ready" · "Easy to work with"

Negative tags (shown ONLY when rating ≤ 3, danger100 bg, danger600 text):
- If HOMEOWNER: "Late" · "Poor quality" · "Unprofessional" · "Overpriced"
- If EXPERT: "Unclear instructions" · "Disrespectful" · "Changed scope"

Chip style (TouchableOpacity): gray100 bg unselected, primary100 bg + primary600 border selected (for positive), danger100 bg + danger600 border selected (for negative). Radius.full, padding 6/10, caption-medium text.

**Comment textarea (optional):** Input textarea, placeholder "Add a comment (optional)", minHeight 100.

**"Submit Review" primary Button:**
- Disabled until rating > 0
- On press: call reviewsService.submit(jobId, { rating, comment, isPositive, tags })
  
  isPositive mapping (CRITICAL — apply this logic):
  - rating >= 4 AND selectedPositiveTags.length > 0 → isPositive: true
  - rating <= 2 AND selectedNegativeTags.length > 0 → isPositive: false
  - rating === 3 OR no tags selected → omit isPositive (undefined)
  
  tags: [...selectedPositiveTags, ...selectedNegativeTags] (all selected tag strings as array)
  
  POST /jobs/:jobId/review request body:
  ```json
  { "rating": 5, "comment": "Great work!", "isPositive": true, "tags": ["Punctual", "Quality work"] }
  ```
  Error 400 "The 48-hour review window for this job has closed." → show toast error
  On success: show toast "Review submitted. Thank you!", then router.back()

**"Skip for now" ghost button** (below submit, small, gray400 text): router.back()

### 5. apps/mobile/app/(shared)/dispute/[jobId].tsx

Read jobId from params.

Standard stack header: back arrow + "Raise a Dispute".

Content (ScreenWrapper, no scroll needed — short form):

Title: "What went wrong?" (heading1 primary600)
Caption: "Please describe the issue. Our team will review and respond within 24 hours." (body gray600)

**Reason selector (required):**
Single-select list of reason options (each a TouchableOpacity Card-like row with radio circle on left):
- "NO_SHOW" → display label "Expert didn't show up"
- "PRICE_DISPUTE" → "Price was different from the bid"
- "WORK_QUALITY" → "Work quality was unsatisfactory"
- "COMMUNICATION_ISSUE" → "Communication problems"
- "OTHER" → "Other"

Selected row: primary600 border (2px) + filled primary600 radio circle.

**Description textarea (required, min 20 chars):**
Input textarea, label "Describe what happened", placeholder "Describe what happened in detail...", minHeight 120. Validate on blur.

**"Submit Dispute" primary Button** (danger600 bg, white text — this is the destructive action):
- Disabled until reason selected AND description ≥ 20 chars
- On press: call disputesService.submit(jobId, { reason: selectedReason, description })
  POST /jobs/:jobId/dispute request body:
  ```json
  { "reason": "NO_SHOW", "description": "The expert accepted the bid 3 hours ago and has not arrived or responded." }
  ```
  Error 409 "Dispute already exists for this job." → show toast error
  On success: show toast "Dispute submitted. We'll review and respond within 24 hours.", then router.back() (twice if needed, or replace back to active-job screen)

## Final cleanup tasks

1. Add all missing i18n keys (shared.chat.*, shared.review.*, shared.dispute.*) to src/locales/en.json

2. Run `cd apps/mobile && npx tsc --noEmit` — zero errors required

3. Update PROGRESS.md: mark Phase 8 complete, all phases complete ✅

4. Final review of PROGRESS.md — mark overall project complete
```

---

## Quick Reference — File Locations

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   └── expert-onboarding/
│   │       ├── _layout.tsx ✅
│   │       ├── selfie.tsx ✅
│   │       ├── tazkira.tsx     ← Phase 2
│   │       ├── business.tsx    ← Phase 2
│   │       └── submitted.tsx   ← Phase 2
│   ├── (homeowner)/
│   │   ├── _layout.tsx         ← Phase 3
│   │   ├── home.tsx            ← Phase 3
│   │   ├── my-jobs.tsx         ← Phase 3
│   │   ├── messages.tsx        ← Phase 3
│   │   ├── profile.tsx         ← Phase 3
│   │   ├── post/
│   │   │   ├── create.tsx      ← Phase 5
│   │   │   ├── media.tsx       ← Phase 5
│   │   │   └── review.tsx      ← Phase 5
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
│       ├── _layout.tsx         ← Phase 8
│       ├── chat/[jobId].tsx    ← Phase 8
│       ├── review/[jobId].tsx  ← Phase 8
│       └── dispute/[jobId].tsx ← Phase 8
└── src/
    └── services/
        └── users.service.ts    ← Phase 2 (create)
```
