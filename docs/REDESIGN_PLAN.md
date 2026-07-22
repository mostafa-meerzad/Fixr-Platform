# Fixr Mobile — Redesign Build Plan

---

## ⚡ Pickup Prompt
> Copy everything inside the box and paste it as your first message in a new session.

```
Read docs/REDESIGN_PLAN.md in full. Then read CLAUDE.md.

We are rebuilding the Fixr mobile app UI from the current teal design to a new
warm terra-cotta + cream design system. All screens are already built — this is
a visual redesign and UX improvement effort, not a greenfield build.

Design references (renamed mockups) live in docs/redesigns/. The filename tells
you exactly which screen each image shows.

Find the first unchecked task [ ] in docs/REDESIGN_PLAN.md and implement it.
After completing it, mark it [x], update the "Last completed" line at the top
of the Status section, then stop and report what you did.

Follow all rules in CLAUDE.md. Use only tokens from src/constants/theme.ts —
never hardcode colors, sizes, or spacing. Use t() for every user-visible string.
```

---

## Status

**Last completed:** Phase 3e — Buy credits screen
**Current phase:** Phase 0 — Design System Token Swap

---

## Decisions Already Made (do not re-debate these)

- **Color direction:** teal (`#0D9488`) → burnt sienna / terra cotta (`#B5432A`). Background from cool gray (`#F9FAFB`) → warm cream (`#FAF6F1`).
- **Job posting:** collapse from 6 steps (4 internal + 2 screens) to **3 screens**: category grid → single scrollable details form → review & publish. Location pre-fills from homeowner profile. Title auto-derived from category name (hidden from user until review). Photos upload inline on the details screen.
- **My Bids tabs:** restructure from "Bids | Active Jobs" toggle to **Active | Won | Lost** pill tabs.
- **Expert onboarding:** add a new overview/pitch screen (`index.tsx`) before step 1 begins.
- **Expert public profile:** add a new screen `(homeowner)/expert/[id].tsx` showing expert's past work gallery, reviews, and "Invite to bid" CTA.
- **Button variants to add:** `dark` (near-black, for auth CTAs) and `success` (dark forest green, for go/confirm actions like "I'm on my way").
- **02a simplified job post:** the single-screen concept is implemented as the new "details" step above — same data, far less navigation.

---

## New Color Tokens (reference for Phase 0)

Update `apps/mobile/src/constants/theme.ts`. Replace the Primary block and Backgrounds. Keep Semantic and Neutrals unchanged.

```typescript
// Primary (Terra Cotta / Burnt Sienna) — replaces Teal
primary600: '#B5432A',   // main brand: CTAs, headers, active elements
primary500: '#C96347',   // hover / lighter shade
primary100: '#F5D4CC',   // pill backgrounds, light tints
primary50:  '#FDF4F2',   // very light section backgrounds

// Backgrounds
bgApp:  '#FAF6F1',       // warm cream — every screen background
bgCard: '#FFFFFF',       // card surfaces stay white

// New additions
dark:       '#1A1A1A',   // auth screen CTAs (phone, OTP, role select buttons)
sand:       '#E8DDD0',   // +93 prefix box, muted input backgrounds
success700: '#1B3D10',   // strong positive CTAs (I'm on my way, Confirm completion)
amber:      '#E8A020',   // Buy credits CTA on expert profile card
```

All other tokens (gray*, success600/100, warning*, danger*, info*, Spacing, Radius, Shadows, IconSize, Typography) stay exactly as they are.

---

## Phase 0 — Design System + Component Foundation

### 0a — Token swap
- [x] Update `apps/mobile/src/constants/theme.ts` with new color tokens above.
  - Replace Primary block (primary600, primary500, primary100, primary50)
  - Replace bgApp value
  - Add dark, sand, success700, amber tokens

### 0b — Button variants
- [x] Update `apps/mobile/src/components/ui/Button.tsx`
  - Add `variant="dark"` → `dark` bg, white text, same height/radius as primary
  - Add `variant="success"` → `success700` bg, white text

### 0c — ProgressBar
- [x] Update `apps/mobile/src/components/ui/ProgressBar.tsx`
  - Fill color: `primary600` (now terra cotta — no code change needed if already using token)
  - Track color: `sand` instead of `gray200`
  - Confirm height is 3px

---

## Phase 1 — Auth Screens

Design refs: `04a-auth-phone.png`, `04b-auth-otp.png`, `04c-registration-role-select.png`, `05a-registration-expert-name.png`

### 1a — Phone screen
- [x] `apps/mobile/app/(auth)/phone.tsx`
  - Add "fixr." wordmark + "Post it. Pick your price. Fixed." tagline at top
  - `+93` country code becomes a sand-bg pill left of the input (not inside it)
  - WhatsApp hint row below input (chat bubble icon + "The code arrives on WhatsApp — no SMS charges")
  - CTA button: `variant="dark"` (black button)
  - Background: `bgApp` (warm cream)

### 1b — OTP screen
- [x] `apps/mobile/app/(auth)/otp.tsx`
  - 6 individual box-digit inputs (large, rounded squares)
  - Active box: terra cotta border (`primary600`)
  - Filled boxes: white bg, bold digit
  - Unfilled boxes: sand bg
  - "Wrong number?" inline link → terra cotta color, navigates back
  - "Resend code in 0:42" countdown below boxes
  - Auto-submits on 6th digit (no explicit button)
  - "Verifies automatically when all 6 digits are in" footnote at bottom

### 1c — Role select (register screen, step 1)
- [x] `apps/mobile/app/(auth)/register.tsx` — role selection step
  - "Welcome to Fixr! / How will you use the app?" header
  - Two full-width card options, each with icon + bold title + subtitle + radio circle
  - Selected card: terra cotta border + terra cotta bg tint (`primary50`)
  - "This choice can't be changed later" disclaimer row (info icon + text) below cards
  - CTA: `variant="dark"` (black "Continue" button)

### 1d — Name entry step (expert path `05a`, homeowner path)
- [x] `apps/mobile/app/(auth)/register.tsx` — name entry step
  - Expert: FIRST NAME (required) + LAST NAME (optional) fields
  - Expert: hint note "Next: a quick one-time verification (selfie, Tazkira, shop info)"
  - Expert: CTA "Create Account" → `variant="primary"` (terra cotta)
  - Homeowner: same name fields + zone picker + address input on same screen
  - Homeowner: CTA "Continue" → `variant="primary"`

---

## Phase 2 — Expert Onboarding

Design refs: `02e-expert-onboarding-overview.png`, `05b-expert-onboarding-selfie.png`, `05c-expert-onboarding-tazkira.png`, `05d-expert-onboarding-categories.png`, `05e-expert-onboarding-business.png`, `05f-expert-onboarding-submitted.png`

### 2a — Onboarding overview screen (NEW)
- [x] Create `apps/mobile/app/(auth)/expert-onboarding/index.tsx`
  - "fixr. for experts" small header
  - "Your craft deserves more customers." large headline
  - "Get vetted once — then bid on jobs in your neighbourhood every day." subtitle
  - 3-step promise list with numbered circles:
    1. "Tell us your trade" — "Done — Plumbing, 12 years" (shows after step complete)
    2. "Verify your identity" — "Tazkira or passport — takes 2 minutes"
       - Two small tiles below: "Photo of Tazkira" + "Selfie to match"
    3. "Get approved & start bidding" — "Most experts approved within 24 h"
  - Optional note: "Optional: add a guild reference or ustad's letter — verified experts win 3× more jobs."
  - CTA "Continue verification" → `variant="primary"` (terra cotta)
  - Footnote: "Free to join · Fixr takes 5% only when you win a job"

### 2b — Selfie screen
- [x] `apps/mobile/app/(auth)/expert-onboarding/selfie.tsx`
  - Step indicator bar at top (4 segments, 1 filled)
  - "Take a selfie" heading + "Live camera only — this proves it's really you." subtitle
  - Large circle: avatar placeholder → captured photo preview on success
  - Green check badge on captured photo, "Retake" button (terra cotta outline)
  - Checklist card: "Good light, face camera directly / No hats or sunglasses / Only your photo is used — never shared publicly"
  - CTA "Next" → `variant="primary"`, disabled until photo captured

### 2c — Tazkira screen
- [x] `apps/mobile/app/(auth)/expert-onboarding/tazkira.tsx`
  - Step indicator bar (2 of 4 filled)
  - "Photograph your Tazkira" heading + "Both sides of your national ID, with the camera." subtitle
  - FRONT SIDE: captured → shows preview + green check + "Retake front" link
  - BACK SIDE: dashed border zone, camera icon, "Tap to photograph the back"
  - CTA "Next" → disabled until both sides captured

### 2d — Categories screen
- [x] `apps/mobile/app/(auth)/expert-onboarding/categories.tsx`
  - Step indicator bar (3 of 4 filled)
  - "What work do you do?" heading + "Choose all your trades — at least one." subtitle
  - 2-column grid of category tiles (icon + label)
  - Selected: terra cotta fill bg, white text
  - Unselected: white bg, gray border
  - "[N] selected" counter below grid
  - CTA "Next" → disabled until ≥ 1 selected

### 2e — Business screen
- [x] `apps/mobile/app/(auth)/expert-onboarding/business.tsx`
  - Step indicator bar (4 of 4 filled)
  - "Your shop" heading
  - SHOP NAME * field
  - ZONE * (dropdown) + ADDRESS * (text) in a 2-col row
  - ABOUT YOUR WORK (optional) textarea
  - SHOP PHOTO * + WORK LICENSE * in a 2-col upload grid
    - Captured slot: filled thumbnail + green check badge
    - Empty slot: dashed border + camera icon + "Camera or gallery" label
  - CTA "Submit for review" → `variant="primary"`, disabled until all 5 docs uploaded

### 2f — Submitted screen
- [x] `apps/mobile/app/(auth)/expert-onboarding/submitted.tsx`
  - Full cream bg, no header
  - Document-check icon in a light circle (no teal — use `primary100` tint)
  - "Application submitted!" heading
  - "Our team is reviewing your documents. Most experts are approved within 24 hours — we'll notify you on WhatsApp and in the app." body
  - Document status row: 5 colored dots + "5 documents received · under review"
  - "You start with 10 free credits once approved." note
  - CTA "Browse jobs meanwhile" → `variant="primary"` (terra cotta)
  - Back button disabled (can't go back from submitted)

---

## Phase 3 — Expert Tab Screens

Design refs: `05g-expert-browse-verified.png`, `05h-expert-browse-pending.png`, `05i-expert-job-detail-place-bid.png`, `05j-expert-my-bids.png`, `05k-expert-active-job-in-progress.png`, `05l-expert-profile.png`, `05m-expert-buy-credits.png`

### 3a — Browse tab (verified state)
- [x] `apps/mobile/app/(expert)/browse.tsx`
  - Header row: "Jobs in / **[Zone]** Change" left + credits pill `◷ 7 credits` (dark bg, amber text) right
  - Horizontal category chip rail below header (All selected by default, scrollable)
  - Each job card: title bold, urgency badge (EMERGENCY in red, TODAY in warning, SCHEDULED in gray), zone + time-ago, homeowner trust row (avatar + name + "+24 points · 12 jobs posted"), "Place Bid" terra cotta button right-aligned
  - Emergency cards: 3px red left border
  - Pending state (when verificationStatus = PENDING): amber "Verification in progress" banner replaces the zone header; empty state below with search icon + "The job feed unlocks after approval" + "Meanwhile, your 10 welcome credits are ready — each bid costs 1 credit."

### 3b — My Bids tab
- [x] `apps/mobile/app/(expert)/my-bids.tsx`
  - Replace current "Bids | Active Jobs" toggle with **Active | Won | Lost** pill tabs
  - **Active tab contents:**
    - ACCEPTED bid card: green border + "ACCEPTED" pill, bid terms summary, "I'm on my way" (`variant="success"`) + "Message [Name]" secondary buttons
    - PENDING bid card: standard border + "PENDING" pill, bid terms, "Edit bid" + "Withdraw" ghost links
    - OUTBID bid card: terra cotta text "OUTBID" pill, "Your bid X · lowest now Y · Zone", "Lower my bid" terra cotta button
  - **Won tab:** completed job summary cards
  - **Lost tab:** final-state (rejected/withdrawn/expired) cards

### 3c — Expert active job
- [x] `apps/mobile/app/(expert)/active-job/[id].tsx`
  - Homeowner contact card at top: avatar, name, address, phone call icon button (green circle)
  - "Update your status" section with 4-node stepper: Accepted → En route → Working → Done
    - Completed nodes: terra cotta filled circle + check
    - Current node: terra cotta outlined circle (animated pulse)
    - Future nodes: sand/muted
  - "Agreed terms" row: 4 chip pills (price / arrival / duration / warranty)
  - Hint text: "When finished, add a note — [Homeowner] confirms before the job closes"
  - CTA changes by status:
    - ASSIGNED → "I'm on my way" (`variant="success"`)
    - EN_ROUTE / ARRIVED → "I've arrived" then "Start work" (`variant="success"`)
    - IN_PROGRESS → "Mark work as finished" (`variant="success"`)

### 3d — Expert profile
- [x] `apps/mobile/app/(expert)/profile.tsx`
  - Terra cotta header card (full-width, rounded lg): avatar initials (white on terra cotta), name + verified icon, shop name + zone, trade pills (white outline pills)
  - Stats row inside card: ★ rating / jobs done / win % / years exp (4 tiles)
  - Dark credits card below: charcoal bg, credit count + "1 credit per bid · refunds on cancelled jobs", "Buy credits" amber-bg button right
  - Menu list (white card): My Reviews / Shop & services / Notification Settings / Language → each row with chevron right
  - "Log out" terra cotta text link below menu

### 3e — Buy credits screen
- [x] `apps/mobile/app/(expert)/credits.tsx`
  - Header: back arrow + "Buy credits" title + current credits pill top-right
  - Explainer: "Each bid costs 1 credit. Credits are refunded when a homeowner cancels a job you bid on."
  - 3 tier cards (Starter / Regular / Pro):
    - Starter: 10 credits, 200₾ — neutral card
    - Regular: 50 credits, 800₾ — "MOST POPULAR" terra cotta badge, selected state (terra cotta border)
    - Pro: 150 credits, 2000₾ — dark card
    - Each card shows: credit count badge + pack name + per-bid price + savings % + total AFN
  - "Pay with" row: M-Paisa | AWCC Pay | Hawala pill options (UI only for now)
  - CTA: "Buy [N] credits · [Price]₾" terra cotta button, updates when selection changes

---

## Phase 4 — Homeowner Tab Screens

Design refs: `04d-homeowner-home.png`, `04e-homeowner-my-jobs.png`, `04f-homeowner-messages.png`, `04g-homeowner-profile.png`

### 4a — Home tab
- [ ] `apps/mobile/app/(homeowner)/home.tsx`
  - "Good Morning / **[FirstName]**" greeting (12px gray label above 22px bold name)
  - Notification bell icon top-right with red dot badge
  - "Post a Job / Free — experts bid within minutes →" hero card (terra cotta bg, white text, arrow right)
  - "Drafts" section (only if drafts exist): draft job cards with "Continue" + "Delete" actions
  - "Recent Activity" section header with "See All →" link
  - Activity job cards: title + status pill + zone + time-ago (tap → job detail)

### 4b — My Jobs tab
- [ ] `apps/mobile/app/(homeowner)/my-jobs.tsx`
  - "My Jobs" large heading
  - Active | Past pill toggle
  - Job cards in Active: urgency badge (EMERGENCY red, SCHEDULED gray), title, zone + time-ago, status pill right, bid count chip terra cotta right ("4 bids")
  - Emergency cards: 3px red left border
  - "CONFIRM DONE" chip on completion-requested jobs (amber)

### 4c — Messages tab
- [ ] `apps/mobile/app/(homeowner)/messages.tsx`
  - "Messages" large heading
  - Each row: expert avatar (terra cotta initials circle with green online dot), job title bold, last message excerpt + timestamp, status pill right
  - "Chat opens once you accept an expert's bid" hint row at bottom (lock icon)

### 4d — Profile tab
- [ ] `apps/mobile/app/(homeowner)/profile.tsx`
  - "Profile" large heading
  - Identity card (white, shadow-sm): avatar circle (terra cotta initials) + camera icon badge, name bold, phone, "Edit" terra cotta outline button
  - Stats row below card: 3 tiles (jobs posted / completed / positive points)
  - Menu list card: My Reviews / Reported Issues / Notification Settings / Language (shows "English" value) / Help & Support / About Fixr — each with chevron right
  - "Log out" terra cotta text link below

---

## Phase 5 — Job Posting (3-Screen Collapse)

Design refs: `04h-job-post-step1-category.png`, `04i-job-post-step3-urgency.png`, `04j-job-post-step5-media.png`, `04k-job-post-step6-review-publish.png`, `02a-job-post-simplified.png`, `02b-job-posted-live.png`

**Architecture decision:** Replace the current 6-step flow (4 steps in create.tsx + media.tsx + review.tsx) with 3 screens:
1. **create.tsx** → category grid only (keep, minor restyle)
2. **NEW details.tsx** → single scrollable form (description + timing + location + photos)
3. **review.tsx** → summary + publish (keep, minor restyle)
4. **NEW success.tsx** → "Your job is live!" live bid counter

`media.tsx` is removed — photo upload is moved inline into details.tsx.

### 5a — Category screen (create.tsx restyle)
- [ ] `apps/mobile/app/(homeowner)/post/create.tsx`
  - Keep 2-column grid layout
  - "New job / Step 1 of 3" header (was "Step 1 of 6")
  - Category tiles: cream bg unselected, terra cotta border + `primary50` bg selected
  - Icon boxes: sand bg unselected, `primary100` bg selected, terra cotta icon when selected
  - "Tap a category to continue" hint below grid
  - On tap: auto-advance to details.tsx, pass categoryId + categoryName

### 5b — Details screen (NEW)
- [ ] Create `apps/mobile/app/(homeowner)/post/details.tsx`
  - "New job / Step 2 of 3" header with back arrow
  - Progress bar at top (2/3 filled)

  **Section: Describe the problem**
  - Large textarea, placeholder: "What's happening? More detail = better bids"
  - Min 20 chars validation on blur
  - Char count: "X / 500" right-aligned caption

  **Section: When do you need it?**
  - 4 pill chips in a row: Emergency · Today · Flexible · Pick date
  - Selected chip: terra cotta fill, white text
  - Unselected: white bg, gray border
  - "Pick date": reveals a date + time row inline (dropdowns or date picker)

  **Section: Location**
  - Single row: map pin icon + "[Zone], Kabul" pre-filled + "Change →" terra cotta link right
  - Address input below (pre-filled from homeownerProfile.address, editable)
  - "Change →" opens zone picker bottom sheet
  - Pre-fill logic: `GET /users/me` → `homeownerProfile.zone.nameEn` + `homeownerProfile.address`

  **Section: Add photos (optional)**
  - 3 photo slots + 1 video slot in a 2×2 grid
  - Empty slot: dashed border + "+" icon + "Add photo" label
  - Filled slot: thumbnail + × dismiss badge
  - Video slot: "Add a video (optional) · Max 2 min · 100 MB" full-width dashed row
  - "Your draft is saved — you can finish later from Home" hint (info icon)

  **API flow on submit:**
  1. `POST /jobs` with: title (auto = `{categoryName}`), description, categoryId, zoneId, address, urgency, scheduledAt
  2. Upload each photo: `POST /media/jobs/:id` in parallel
  3. Navigate to review.tsx with jobId

  **CTA:** "Continue — it's free" (`variant="dark"`, black button, full-width)
  - Disabled while photos uploading: "Waiting for upload…" label, spinner

### 5c — Review & publish screen (review.tsx restyle)
- [ ] `apps/mobile/app/(homeowner)/post/review.tsx`
  - "Review & publish / Step 3 of 3" header
  - Summary rows (each with "Edit" terra cotta link right): Category / Title / Urgency / Zone / Address / Phone (shown as "shared later") / Photos thumbnails
  - Privacy hint: lock icon + "Your address and phone are shared only with the expert you hire"
  - CTA "Publish Job" → `variant="primary"` (terra cotta)
  - On publish: `POST /jobs/:id/publish` → navigate to success.tsx

### 5d — Job posted success screen (NEW)
- [ ] Create `apps/mobile/app/(homeowner)/post/success.tsx`
  - Full cream bg, no tab bar
  - Green check circle icon
  - "Your job is live!" heading
  - "Nearby [category] experts are looking at it now. First bids usually arrive in ~8 minutes." subtitle
  - Live job summary card: title + LIVE badge, 3 counter chips (bids so far / experts viewed / lowest bid)
  - "Bids arriving" section: live bid cards appear as experts bid (poll `/jobs/:id` every 10s)
    - Each bid: expert avatar + name + verified badge + amount right
    - "· more experts are typing bids…" animated placeholder row
  - Bottom CTAs: "Compare bids (X)" terra cotta button + "Done" ghost button

---

## Phase 6 — Job Detail & Active Job Screens

Design refs: `04l-homeowner-job-detail-open.png`, `04m-homeowner-active-job-completion-requested.png`, `05i-expert-job-detail-place-bid.png`, `05k-expert-active-job-in-progress.png`

### 6a — Homeowner job detail
- [ ] `apps/mobile/app/(homeowner)/job/[id].tsx`
  - Hero photo carousel at top (swipeable, dot indicators, no photos → category icon placeholder)
  - Job meta: category · zone · time-ago + urgency badge, status pill right
  - Description paragraph
  - "Bids Received" section header with count badge + "Price | Arrival" sort toggle pills
  - Bid cards: expert avatar + name + verified badge, bid price bold right, arrival + duration below, warranty badge, "Accept Bid" terra cotta button full-width
  - "Cancel Job" danger text link at bottom

### 6b — Homeowner active job
- [ ] `apps/mobile/app/(homeowner)/active-job/[id].tsx`
  - Amber top banner when COMPLETION_REQUESTED: warning triangle icon + "[Expert] says the work is finished — please check and confirm."
  - Expert card: avatar + name + verified badge + "agreed 900₾", "Message" secondary button right
  - "Job progress" stepper (same 4 nodes as expert view, but homeowner view only — no CTAs to change state)
  - "Completion notes from [Expert]" card (shown when COMPLETION_REQUESTED)
  - "Something wrong? Raise a dispute" terra cotta underline link
  - CTA "Confirm Completion" → `variant="success"` (dark green), only shown when COMPLETION_REQUESTED

### 6c — Expert job detail + bid form
- [ ] `apps/mobile/app/(expert)/job/[id].tsx`
  - Photos in a horizontal scroll at top (or category icon if none)
  - Job title + urgency badge (TODAY / EMERGENCY / SCHEDULED) top-right
  - Description paragraph
  - Homeowner trust row: avatar + name + "+24 points · 12 jobs posted · Zone"
  - Divider then "Your bid" form section:
    - PRICE (AFN) * input (numeric, auto-shows ₾ suffix)
    - ARRIVAL * dropdown (time options: ~1h, ~2h, tomorrow am, etc.)
    - DURATION * dropdown (30 min, 1h, 2h, half day, full day)
    - NOTE TO HOMEOWNER (optional) textarea
    - "Include 30-day warranty" checkbox row
  - "Place Bid · 1 credit" terra cotta CTA, full-width
  - "X credits left · refunded if the homeowner cancels the job" footnote

---

## Phase 7 — New Screens

Design refs: `02c-expert-public-profile.png`, `02e-expert-onboarding-overview.png` (done in Phase 2)

### 7a — Expert public profile (viewed by homeowner)
- [ ] Create `apps/mobile/app/(homeowner)/expert/[id].tsx`
  - Header: back arrow + "Expert profile" title + "…" overflow menu
  - Profile section: avatar initials (large, terra cotta), name + verified badge + guild badge, "ID VERIFIED · GUILD MEMBER" pills
  - Stats row: rating / jobs done / experience / on-time % (4 tiles)
  - Bio paragraph (from expert shop description)
  - "Past work" section: 3-col photo grid + "All X photos →" link
  - "Reviews" section: first review card (reviewer avatar + job title + stars + tags + quote)
  - Bottom fixed CTAs: "Invite to bid" terra cotta + "Chat" dark button

  Route access: tap expert name/avatar from any bid card in homeowner job detail.
  API: `GET /users/:id` → expert profile data

---

## Phase 8 — Shared Screens

Design refs: `04n-chat.png`, `02d-chat-with-bid-card.png`, `04o-review-form.png`, `04p-dispute-form.png`, `04q-reported-issues-and-notifications.png`, `04r-expert-reviews-page.png`, `04s-help-and-about.png`

### 8a — Chat screen
- [ ] `apps/mobile/app/(shared)/chat/[jobId].tsx`
  - Header: back arrow + expert avatar + name + online dot + job status pill right
  - Date separator pills centered (Yesterday / Today)
  - Received messages: white bubble, left-aligned, timestamp below
  - Sent messages: terra cotta bubble, right-aligned, timestamp + read-receipt ticks below
  - Message input bar: white card, "Message…" placeholder, camera icon left, send button (terra cotta circle) right

### 8b — Review form
- [ ] `apps/mobile/app/(shared)/review/[jobId].tsx`
  - "Skip" ghost link top-right
  - Expert avatar large centered + "How was [Expert Name]?" heading + job title + "completed today" below
  - 5 star row (tap to rate, stars fill terra cotta)
  - Tag chips appear conditionally:
    - Rating ≥ 4: positive tags (Punctual, Quality work, Professional, Fair price, Great communication)
    - Rating ≤ 2: negative tags (Late, Poor quality, Rude, Overcharged, No-show)
    - Rating 3: no tags
  - "Anything to add? (optional)" textarea
  - "Submit Review" terra cotta CTA

### 8c — Dispute form
- [ ] `apps/mobile/app/(shared)/dispute/[jobId].tsx`
  - Context line: "About: **[Job title]** with [Expert name]. Our team reviews every report within 24 hours."
  - Radio card options: No Show / Price Dispute / Work Quality / Communication Issue / Other
  - Selected card: terra cotta border + radio filled
  - Description textarea with char count (min 20 chars)
  - "Submit Dispute" destructive CTA (danger600 bg)

### 8d — Notifications screen
- [ ] `apps/mobile/app/(shared)/notifications.tsx`
  - "Notifications" heading + "Mark All Read" terra cotta link top-right
  - Notification rows: icon (contextual — bid=gavel, completion=check, system=bell), bold title, excerpt, time-ago
  - Unread: slightly darker bg row + unread dot right
  - Empty state: bell icon + "No notifications yet"

### 8e — Reviews page
- [ ] `apps/mobile/app/(shared)/reviews/[userId].tsx`
  - "Reviews · [Name]" header
  - Rating summary card: large score left + star bar chart (5→1) right
  - Review cards: reviewer avatar + job title + time-ago + stars right, tag chips row, quote text

### 8f — Help & About screens
- [ ] `apps/mobile/app/(shared)/help.tsx`
  - FAQ accordion rows (tap to expand/collapse)
  - "Call us — 079 000 0000 / Sat–Thu, 8am–6pm · WhatsApp anytime" call CTA card (terra cotta phone icon)
- [ ] `apps/mobile/app/(shared)/about.tsx`
  - Fixr logo + version number
  - Short "Fixr connects…" paragraph
  - Privacy Policy / Terms of Service / Contact links with chevrons
  - "Made with love in Kabul 🇦🇫" footer

---

## Phase 9 — Splash Screen

Design ref: `03a-splash-screen.png`

### 9a — Splash / app loading screen
- [ ] Update `apps/mobile/app/index.tsx` or create `apps/mobile/app/splash.tsx`
  - Full terra cotta background (`primary600`)
  - Wrench icon (white, centered, in a cream rounded square)
  - "fixr." wordmark below (white/cream)
  - Tagline "Post it. Pick your price. Fixed." small
  - Dot indicators at bottom
  - "KABUL" label bottom center
  - Animate: icon scales in → wordmark fades in → auto-navigate to auth or home after 1.5s

---

## Completion Checklist

- [ ] Phase 0 — Design system tokens + Button variants
- [x] Phase 1 — Auth screens (phone, OTP, role select, name)
- [ ] Phase 2 — Expert onboarding (overview, selfie, tazkira, categories, business, submitted)
- [ ] Phase 3 — Expert tabs (browse, my-bids, active-job, profile, credits)
- [ ] Phase 4 — Homeowner tabs (home, my-jobs, messages, profile)
- [ ] Phase 5 — Job posting 3-screen collapse (create, details NEW, review, success NEW)
- [ ] Phase 6 — Job detail & active job (homeowner + expert)
- [ ] Phase 7 — Expert public profile (new screen)
- [ ] Phase 8 — Shared screens (chat, review, dispute, notifications, reviews, help, about)
- [ ] Phase 9 — Splash screen
