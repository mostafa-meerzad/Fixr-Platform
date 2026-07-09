# Fixr Mobile — Remaining Features Plan

**Branch:** `mobile-ui-v2`  
**Companion to:** `PROGRESS.md` (Phases 0–8 complete — all 26 screens done)  
**Admin panel credits management:** Already complete — `apps/admin/src/app/(admin)/credits/page.tsx` has Purchase, Adjust, and Ledger modals. No admin work needed.

---

## How to Use This File

1. At the start of a session, read `CLAUDE.md` (project rules) + `PROGRESS.md` (history) + this file.
2. Find the first session whose checkbox is **not** ticked.
3. Follow the spec for that session exactly. Do not start the next session's work.
4. When done, tick the `[ ]` → `[x]` checkboxes and fill in the "Completed" line.
5. Run `npx tsc --noEmit` from `apps/mobile` before marking a session done. Zero errors required.

**Key paths reminder**
- Route screens → `apps/mobile/app/`
- Non-route source → `apps/mobile/src/` (alias `@/`)
- i18n strings → `apps/mobile/src/locales/en.json`
- Design tokens → `apps/mobile/src/constants/theme.ts`
- All UI primitives from `components/ui/` — never raw RN View/Text/TouchableOpacity in screens
- All strings via `t()` — no raw strings in JSX ever

---

## Session 9 — Buy Credits Agency Sheet + Fix Job-Post Edit Flow + Backend Commit

**Goal:** Close the credit loop for experts, fix the edit navigation bug in job posting, and commit the pending backend change.

**Completed:** [x]  
**TypeScript clean:** [x]

---

### Part A — "Buy Credits" Agency Info Sheet (`apps/mobile/app/(expert)/profile.tsx`)

The "Buy Credits" button currently shows a `comingSoon` toast. Replace with a bottom sheet.

**What to change:**

1. Add `buySheetRef = useRef<BottomSheetModal>(null)` alongside the existing `zonesSheetRef`.
2. Change the button's `onPress` from the toast call to `() => buySheetRef.current?.present()`.
3. Add the sheet JSX at the bottom of the screen (same pattern as the zones sheet):

```tsx
<BottomSheet ref={buySheetRef} snapPoints={['55%']}>
  {/* teal icon, title, body copy, office info, dismiss button */}
</BottomSheet>
```

Sheet content (fill in your real office details where marked):
- `MaterialIcons name="storefront"` size 40 color `primary600` centered
- Title: `t('expert.buySheet.title')` → "Purchase Credits"
- Body: `t('expert.buySheet.body')` → "Credits are purchased in person at our Kabul office. 1 credit = 50 AFN. Bring cash — we'll record the purchase and top up your balance on the spot."
- Office row: `place` icon + `t('expert.buySheet.address')` → **fill in real address**
- Phone row: `phone` icon + `t('expert.buySheet.phone')` → **fill in real phone** (wrap in `TouchableOpacity` with `Linking.openURL('tel:+93...')`)
- Hours row: `schedule` icon + `t('expert.buySheet.hours')` → **fill in real hours**
- Primary Button: `t('expert.buySheet.dismiss')` → "Got it" → `buySheetRef.current?.dismiss()`

**i18n keys to add** under `expert.buySheet`:
```json
"buySheet": {
  "title": "Purchase Credits",
  "body": "Credits are purchased in person at our Kabul office. 1 credit = 50 AFN. Bring cash — we'll record the purchase and top up your balance on the spot.",
  "address": "FILL_IN_REAL_ADDRESS",
  "phone": "FILL_IN_REAL_PHONE",
  "hours": "FILL_IN_REAL_HOURS",
  "dismiss": "Got it"
}
```

Remove the `comingSoon` key from `expert.profile` in `en.json` if nothing else references it (search first).

---

### Part B — Fix Job-Post Edit Links (`apps/mobile/app/(homeowner)/post/review.tsx` + `create.tsx`)

**Problem:** All "Edit" buttons in `review.tsx` call `router.back()`, which goes to `media.tsx` regardless of which field the user wants to edit. Category, title, description, urgency, and location are in `create.tsx` steps 1–4 — pressing Edit should go there.

**Fix in `review.tsx`:**

Import `useRouter` (already imported). Replace the `onEdit` callbacks:

```tsx
// Media row — keep going back to media.tsx
onEdit={() => router.back()}

// All other rows (category, title/description, urgency, location) — jump to create at the right step
onEdit={() => router.push({ pathname: '/(homeowner)/post/create', params: { jobId, editStep: '1' } } as any)}
// step 1 = category, step 2 = title+desc, step 3 = urgency, step 4 = location
// Pass the correct editStep number for each row
```

Also pass `jobId` through. Review screen already has `jobId` from its own route params.

**Fix in `create.tsx`:**

Read `editStep` and `jobId` from `useLocalSearchParams` at mount. If `editStep` is present, initialise `step` state to that number and load the existing job data from `GET /jobs/:jobId` so the form fields are pre-populated. On "Next" from the last step route to `/(homeowner)/post/review` (not media) because media was already done.

Pattern:
```tsx
const { jobId, editStep } = useLocalSearchParams<{ jobId?: string; editStep?: string }>();
const isEditMode = !!editStep && !!jobId;
// on mount if isEditMode: fetch job, populate fields, set step = Number(editStep)
// on final Next in editMode: router.push({ pathname: '/(homeowner)/post/review', params: { jobId } })
```

---

### Part C — Commit Backend Notification Change

The file `apps/backend/src/notifications/notifications.service.ts` has an uncommitted change adding `icon: 'notification_icon', color: '#0D9488'` to the Android FCM payload. Commit it:

```bash
git add apps/backend/src/notifications/notifications.service.ts
git commit -m "fix(backend): set Android FCM notification icon and brand color"
```

---

## Session 10 — In-App Notification Inbox

**Goal:** Give users a screen to view their notification history and deep-link from it.

**Completed:** [x]  
**TypeScript clean:** [x]

---

### New screen: `apps/mobile/app/(shared)/notifications.tsx`

Standard header screen (back arrow, title "Notifications", "Mark all read" text button on the right).

**Data:** `GET /notifications/me?page=1&limit=30` via `notificationsService.list()`.

**List row layout:**
- Left: type icon (map `NotificationType` → `MaterialIcons` name — see table below) in a 40×40 `primary100` circle, with an unread blue dot (8×8 `info600` circle) at top-right corner of the icon if `!isRead`
- Middle: `titleEn` in `bodyMd` (15px 500 gray900), `bodyEn` in `body` (15px gray600, 2 lines max), relative time in `caption` (12px gray400)
- Right: chevron_right if `data.jobId` exists

```
Notification type → icon mapping:
BID_RECEIVED         → gavel
BID_ACCEPTED         → check_circle
BID_REJECTED         → cancel
BID_WITHDRAWN        → undo
JOB_ASSIGNED         → assignment_turned_in
JOB_CANCELLED        → cancel
JOB_COMPLETED        → task_alt
COMPLETION_REQUESTED → hourglass_empty
EXPERT_VERIFIED      → verified
EXPERT_REJECTED      → gpp_bad
DISPUTE_OPENED       → report_problem
DISPUTE_RESOLVED     → handshake
JOB_PUBLISHED        → work
default              → notifications
```

**Tap behaviour:**
1. Call `notificationsService.markRead(notification.id)` (fire-and-forget, don't await).
2. Decrement `notifStore.unreadCount` by 1 (but clamp to 0 if already 0).
3. Navigate using the same deep-link logic already in `apps/mobile/app/_layout.tsx` lines ~43–75. Extract that logic into a shared util `src/utils/notificationRouter.ts` so both `_layout.tsx` and this screen can call it without duplication.

**"Mark all read" button** (header right): calls `notificationsService.markAllRead()`, sets `notifStore.setUnreadCount(0)`, re-renders list with all rows showing as read.

**Bell icon entry point:** Add a bell `TouchableOpacity` to the `headerRight` of the large-header tab screens. The simplest place is in both `apps/mobile/app/(homeowner)/_layout.tsx` and `apps/mobile/app/(expert)/_layout.tsx` — add a `headerRight` to the `screenOptions` of the Tabs component that renders a `MaterialIcons notifications` (or `notifications_active` when `unreadCount > 0`) icon button with a red dot badge overlay. Tap → `router.push('/(shared)/notifications' as any)`.

**Empty state:** `notifications` icon (40px gray300), "No notifications yet", "Activity on your jobs will appear here."

**Pagination:** Load-more button or `onEndReached` FlatList — fetch next page and append.

**i18n keys** under `shared.notifications`:
```json
"notifications": {
  "title": "Notifications",
  "markAllRead": "Mark all read",
  "empty": "No notifications yet",
  "emptySub": "Activity on your jobs will appear here."
}
```

Add `/(shared)/notifications` to `apps/mobile/app/(shared)/_layout.tsx` Stack (no extra config needed — `headerShown: false` already set on layout).

---

## Session 11 — My Reviews Screen

**Goal:** Let both homeowners and experts view reviews they've received.

**Completed:** [x]  
**TypeScript clean:** [x]

---

### New screen: `apps/mobile/app/(shared)/reviews/[userId].tsx`

Standard header: back arrow, title "My Reviews".

**Data:** `GET /users/:userId/reviews` — add to `reviews.service.ts`:
```ts
getForUser: (userId: string) => api.get(`/users/${userId}/reviews`),
```
Response is an array. Each item has: `rating` (1–5), `comment` (nullable), `tags` (string[]), `isPositive` (boolean | null), `createdAt`, and `reviewer: { name, avatarUrl }`.

**Wire up in both profile screens:**

In `apps/mobile/app/(homeowner)/profile.tsx`, find the `reviews` row (key: `"reviews"`) and add:
```tsx
onPress: () => router.push(`/(shared)/reviews/${user.id}` as any),
```
Same change in `apps/mobile/app/(expert)/profile.tsx`.

**Card layout (one per review):**
- Top row: `Avatar` (size sm, reviewer name initials), reviewer name in `bodyMd`, relative date in `caption` right-aligned
- Star row: 5 `star` / `star_border` MaterialIcons (18px, warning600 for filled) — do not use a library, render inline
- Tags row (if `tags.length > 0`): small pills, `success100`/`success600` for positive, `danger100`/`danger600` for negative — reuse `Pill` component
- Comment (if non-null): `body` text, `gray600`, italic style
- Divider between cards

**Empty state:** `star` icon (40px gray300), "No reviews yet", "Reviews from completed jobs will appear here."

**i18n keys** under `shared.reviews`:
```json
"reviews": {
  "title": "My Reviews",
  "empty": "No reviews yet",
  "emptySub": "Reviews from completed jobs will appear here."
}
```

Add `reviews/[userId]` to `(shared)/_layout.tsx` Stack — no extra options needed.

---

## Session 12 — Expert Credit Ledger Screen

**Goal:** Experts can tap their balance to see the full transaction history.

**Completed:** [x]  
**TypeScript clean:** [x]

---

### New file: `apps/mobile/src/services/credits.service.ts`

```ts
import { api } from './api';

export const creditsService = {
  ledger: (page = 1, limit = 20) =>
    api.get('/credits/me/ledger', { params: { page, limit } }),
};
```

### New screen: `apps/mobile/app/(expert)/credits.tsx`

Standard header: back arrow, title "Credit History".

**Entry point:** In `apps/mobile/app/(expert)/profile.tsx`, wrap the credit balance number (`<Text style={styles.creditCount}>`) in a `TouchableOpacity` that calls `router.push('/(expert)/credits' as any)`. Also add a small "View history →" ghost-style text link below it.

**Top balance card:** Shows current balance (from auth store `expertProfile.creditBalance.balance`) — a simple teal card matching the profile credits card style.

**Transaction list** from `GET /credits/me/ledger`:

Each row:
- Left: type icon in a colored circle
  - `BID_SPEND` → `gavel` danger100/danger600
  - `BID_REFUND` → `undo` success100/success600
  - `PURCHASE` → `add_circle` success100/success600
  - `WELCOME_GRANT` → `card_giftcard` success100/success600
  - `ADMIN_ADJUSTMENT` → `tune` info100/info600
- Middle: type label (human-readable, not the raw enum), description in `caption` (1 line)
- Right: amount (`+2` success600 / `-1` danger600) in `bodyMd`, balance after in `caption` gray400

**Pagination:** `onEndReached` on FlatList fetches next page and appends.

**Empty state:** `receipt_long` icon (40px gray300), "No transactions yet", "Your credit activity will appear here."

**i18n keys** under `expert.credits`:
```json
"credits": {
  "title": "Credit History",
  "currentBalance": "Current Balance",
  "empty": "No transactions yet",
  "emptySub": "Your credit activity will appear here.",
  "types": {
    "BID_SPEND": "Bid placed",
    "BID_REFUND": "Bid refunded",
    "PURCHASE": "Credits purchased",
    "WELCOME_GRANT": "Welcome credits",
    "ADMIN_ADJUSTMENT": "Admin adjustment"
  }
}
```

---

## Session 13 — Disputes History + Expert Re-verify Flow

**Goal:** Homeowners can view their disputes; rejected experts can restart the verification flow.

**Completed:** [x]  
**TypeScript clean:** [x]

---

### Part A — Disputes History (`apps/mobile/app/(homeowner)/disputes.tsx`)

Add to `apps/mobile/src/services/disputes.service.ts`:
```ts
getMyDisputes: () => api.get('/users/me/disputes'),
```

**Wire up in homeowner profile:** Find the `issues` row (key: `"issues"`) and add:
```tsx
onPress: () => router.push('/(homeowner)/disputes' as any),
```

**Screen:** Standard header, title "Reported Issues".

Each dispute card:
- Job title in `heading3`
- Reason label (human-readable map: `NO_SHOW` → "Expert no-show", `PRICE_DISPUTE` → "Price dispute", `WORK_QUALITY` → "Work quality", `COMMUNICATION_ISSUE` → "Communication issue", `OTHER` → "Other") in `label` gray600
- Status pill: `OPEN` → warning, `RESOLVED` → success
- Description excerpt (2 lines) in `body`
- Date in `caption`
- Tap → `router.push('/(homeowner)/active-job/' + dispute.jobId as any)` (fire-and-forget, that job may be in DISPUTED state so the active-job screen will show it)

**Empty state:** `check_circle` icon (40px gray300), "No issues reported", "Disputes from your jobs will appear here."

**i18n keys** under `homeowner.disputes`:
```json
"disputes": {
  "title": "Reported Issues",
  "empty": "No issues reported",
  "emptySub": "Disputes from your jobs will appear here.",
  "reasons": {
    "NO_SHOW": "Expert no-show",
    "PRICE_DISPUTE": "Price dispute",
    "WORK_QUALITY": "Work quality",
    "COMMUNICATION_ISSUE": "Communication issue",
    "OTHER": "Other"
  }
}
```

---

### Part B — Expert Re-verify Docs (`apps/mobile/app/(expert)/profile.tsx`)

Find the `verifyDocs` row (key: `"verifyDocs"`) and add an `onPress` based on the expert's `verificationStatus` from the auth store:

```tsx
onPress: () => {
  if (verificationStatus === 'VERIFIED') {
    toast.show({ message: t('expert.profile.alreadyVerified') });
  } else if (verificationStatus === 'PENDING') {
    toast.show({ message: t('expert.profile.pendingVerification') });
  } else {
    // REJECTED or UNVERIFIED → restart onboarding
    router.push('/(auth)/expert-onboarding/selfie' as any);
  }
},
```

`verificationStatus` is already loaded into the screen from `expertProfile.verificationStatus`.

**i18n keys** to add under `expert.profile`:
```json
"alreadyVerified": "Your account is already verified.",
"pendingVerification": "Your documents are under review. We'll notify you when approved."
```

No new screens — the existing onboarding flow handles the re-upload correctly and routes to `submitted.tsx` → browse at the end.

---

## Session 14 — Help, About, and Notification Settings

**Goal:** Give the four dead profile rows real destinations.

**Completed:** [ ]  
**TypeScript clean:** [ ]

---

### Part A — Help & Support (`apps/mobile/app/(shared)/help.tsx`)

Standard header, title "Help & Support".

Sections (use `Card` component for each group):
1. **Contact us** — WhatsApp button (`Linking.openURL('whatsapp://send?phone=+93...')`) + Call button (`Linking.openURL('tel:+93...')`), displayed as two secondary `Button` components with `leftIcon`
2. **Office** — address row + hours row (static text, same values as the Buy Credits sheet)
3. **FAQ** — 3–4 accordion items (expandable `TouchableOpacity` rows with chevron):
   - "How do I post a job?" — brief answer
   - "How do credits work?" — 1 credit = 50 AFN, purchased at office
   - "What happens if the expert doesn't show up?" — can raise a dispute
   - "How do I contact the expert?" — chat unlocks after bid acceptance

**Wire up in both profiles:** Add `onPress: () => router.push('/(shared)/help' as any)` to the `help` row in both `(homeowner)/profile.tsx` and `(expert)/profile.tsx`.

**i18n keys** under `shared.help` — fill in the actual content strings.

---

### Part B — About Fixr (`apps/mobile/app/(shared)/about.tsx`)

Standard header, title "About Fixr".

Content:
- Large teal app icon / logo placeholder (`home_repair_service` MaterialIcon 64px primary600)
- App name "Fixr" in `display` style
- Version from `import Constants from 'expo-constants'` → `Constants.expoConfig?.version`
- One-paragraph description of Fixr
- Divider
- Two ghost rows: "Privacy Policy" and "Terms of Service" — for now each opens an `Alert.alert` with placeholder text ("Coming soon")

**Wire up:** Add `onPress: () => router.push('/(shared)/about' as any)` to the `about` row in both profiles.

**i18n keys** under `shared.about`.

---

### Part C — Notification Settings (inline bottom sheet, no new file)

In both `(homeowner)/profile.tsx` and `(expert)/profile.tsx`:

1. Add `notifSheetRef = useRef<BottomSheetModal>(null)`.
2. Add `onPress: () => notifSheetRef.current?.present()` to the `notifications` row.
3. Add a bottom sheet with a single row:
   - Label: "Push Notifications"
   - Sub-label: current permission status (check with `Notifications.getPermissionsAsync()` in a `useEffect`)
   - Right side: if `granted` → green "Enabled" text; if `denied` or `undetermined` → "Enable in Settings" secondary button → `Linking.openSettings()`

No backend call. OS-level only. `expo-notifications` is already installed.

**i18n keys** under `shared.notifSettings`:
```json
"notifSettings": {
  "title": "Notification Settings",
  "pushNotifications": "Push Notifications",
  "enabled": "Enabled",
  "openSettings": "Enable in Settings"
}
```

---

### Register new routes in `(shared)/_layout.tsx`

Add `help`, `about`, `notifications` screens to the Stack. No special options needed beyond what's already there.

---

## Session 15 — Expert Category Management in Profile

**Goal:** Experts can edit their service categories after onboarding (mirrors the existing zones multi-select sheet).

**Completed:** [ ]  
**TypeScript clean:** [ ]

---

### Change: `apps/mobile/app/(expert)/profile.tsx` only

No new screens. Mirror the zones sheet pattern exactly.

**What to add:**

1. `categoriesSheetRef = useRef<BottomSheetModal>(null)` alongside `zonesSheetRef`.

2. State: `const [allCategories, setAllCategories] = useState<Category[]>([])` — load from `lookupService.categories()` (already used in onboarding).

3. Derive current selection from `expertProfile.serviceCategories`:
   ```ts
   const selectedCategoryIds = new Set(
     expertProfile?.serviceCategories.map((sc) => sc.category.id) ?? []
   );
   ```

4. `handleToggleCategory` — mirrors `handleToggleZone` but calls `usersService.updateCategories(newIds)`:
   ```ts
   async function handleToggleCategory(cat: Category) {
     const current = new Set(expertProfile?.serviceCategories.map(sc => sc.category.id) ?? []);
     if (current.has(cat.id)) {
       if (current.size === 1) { toast.show({ message: t('expert.profile.minOneCategory'), variant: 'error' }); return; }
       current.delete(cat.id);
     } else {
       current.add(cat.id);
     }
     await usersService.updateCategories(Array.from(current));
     // then refresh user profile via usersService.getMe() and update auth store
   }
   ```

5. Add a **"Service Categories"** row to the settings sections array, between the zones row and the notifications row:
   ```ts
   {
     key: 'categories',
     label: t('expert.profile.serviceCategories'),
     icon: Icons.category,       // 'category' MaterialIcon — add to icons.ts if missing
     onPress: () => { loadCategoriesIfNeeded(); categoriesSheetRef.current?.present(); },
   }
   ```

6. Add the categories sheet JSX below the zones sheet, same structure:
   - Title + subtitle
   - FlatList of category toggle rows (icon + nameEn, checkmark when selected)
   - Loading spinner while fetching
   - Save/close button

**i18n keys** to add under `expert.profile`:
```json
"serviceCategories": "Service Categories",
"minOneCategory": "You must have at least one service category."
```

Add `category: 'category'` to `apps/mobile/src/constants/icons.ts` if not already present.

`usersService.updateCategories` already exists in `src/services/users.service.ts` (line 77–78). No service changes needed.

---

## Completion Checklist

| Session | Feature | Done |
|---|---|---|
| 9 | Buy Credits agency sheet | [x] |
| 9 | Fix job-post edit links | [x] |
| 9 | Commit backend notification change | [x] |
| 10 | Notification inbox screen + bell icon | [x] |
| 11 | My Reviews screen | [x] |
| 12 | Credit ledger screen + `credits.service.ts` | [x] |
| 13 | Disputes history screen | [x] |
| 13 | Expert re-verify flow | [x] |
| 14 | Help & Support screen | [ ] |
| 14 | About Fixr screen | [ ] |
| 14 | Notification settings sheet | [ ] |
| 15 | Expert category management in profile | [ ] |

---

## Patterns Reference (copy these, don't reinvent)

**Bottom sheet (modal pattern):**
```tsx
const sheetRef = useRef<BottomSheetModal>(null);
// open: sheetRef.current?.present()
// close: sheetRef.current?.dismiss()
<BottomSheet ref={sheetRef} snapPoints={['50%']}>
  {/* content */}
</BottomSheet>
```
`BottomSheet` is the wrapper in `src/components/ui/BottomSheet.tsx`. Provider already in root layout.

**Standard stack-screen header:**
```tsx
<View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
  </TouchableOpacity>
  <Text style={[Typography.heading1, { color: Colors.primary600 }]}>{t('...')}</Text>
</View>
```
Back button: 32×32 gray100 circle. Title: heading1 (22px 700 primary600).

**Service call + loading/error/empty states (every screen must have all three):**
```tsx
const [data, setData] = useState<Item[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

async function load() {
  setLoading(true); setError('');
  try { const res = await someService.list(); setData(res.data); }
  catch { setError(t('common.error')); }
  finally { setLoading(false); }
}
useEffect(() => { load(); }, []);

if (loading) return <ActivityIndicator color={Colors.primary600} />;
if (error) return <EmptyState icon="error" title={t('common.error')} subtitle={error} ctaLabel={t('common.retry')} onCta={load} />;
if (!data.length) return <EmptyState icon="..." title="..." subtitle="..." />;
```

**MaterialIcons name cast:**
```tsx
<MaterialIcons name={Icons.someIcon as any} size={IconSize.inline} color={Colors.primary600} />
```

**i18n:**
```tsx
const { t } = useTranslation();
// always t('namespace.key') — never raw strings in JSX
```
