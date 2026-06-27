# Fixr UI Design System

> The single source of truth for all UI decisions. Claude Code must follow this document exactly and never guess at visual choices.

---

## 1. Brand Identity

**What Fixr is:** A trusted local services marketplace for Afghan homeowners and skilled experts.

**Design personality:** Clean, professional, trustworthy. Think Uber's clarity meets a local Afghan service context. Every screen should feel like it was built by a company that takes your home seriously.

**What to avoid:**

- Childish or playful icons (no emojis, no cartoon-style illustrations)
- Gradients anywhere — buttons, titles, backgrounds, cards. Solid colors only.
- Too many colors on one screen
- Generic "app" feel — every component should feel intentional

---

## 2. Color System

### Primary Palette

| Token         | Hex       | Usage                                       |
| ------------- | --------- | ------------------------------------------- |
| `primary-600` | `#0D9488` | Primary buttons, active tab icons, key CTAs |
| `primary-500` | `#14B8A6` | Hover states, highlights                    |
| `primary-100` | `#CCFBF1` | Pill badges, subtle backgrounds             |
| `primary-50`  | `#F0FDFA` | Screen backgrounds with teal tint           |

### Neutral Palette

| Token      | Hex       | Usage                               |
| ---------- | --------- | ----------------------------------- |
| `gray-900` | `#111827` | Primary text, headings              |
| `gray-600` | `#4B5563` | Secondary text, descriptions        |
| `gray-400` | `#9CA3AF` | Placeholder text, disabled states   |
| `gray-200` | `#E5E7EB` | Dividers, borders, card outlines    |
| `gray-100` | `#F3F4F6` | Input backgrounds, inactive tab bar |
| `white`    | `#FFFFFF` | Card surfaces, modal backgrounds    |

### Semantic Colors

| Token         | Hex       | Usage                                   |
| ------------- | --------- | --------------------------------------- |
| `success-600` | `#16A34A` | Verified badge, job completed, positive |
| `success-100` | `#DCFCE7` | Success pill background                 |
| `warning-600` | `#D97706` | Pending status, urgency: today          |
| `warning-100` | `#FEF3C7` | Warning pill background                 |
| `danger-600`  | `#DC2626` | Errors, dispute, cancel, no-show        |
| `danger-100`  | `#FEE2E2` | Danger pill background                  |
| `info-600`    | `#2563EB` | Informational, en route status          |
| `info-100`    | `#DBEAFE` | Info pill background                    |

### Background System

- **App background:** `#F9FAFB` (gray-50) — never pure white as the page background
- **Card surface:** `#FFFFFF` with `border: 1px solid #E5E7EB` and `border-radius: 16px`
- **Bottom tab bar:** `#FFFFFF` with top border `1px solid #E5E7EB`

---

## 3. Typography

**Font family:** `Inter` (Google Fonts) — clean, highly legible, professional. Load weights: 400, 500, 600, 700.

**Dari/Arabic script:** Deferred to a later phase. Do not configure `Noto Naskh Arabic` or RTL layout now. All text is LTR English only in this phase.

### Type Scale

| Role             | Size | Weight | Line Height | Color                   | Usage                             |
| ---------------- | ---- | ------ | ----------- | ----------------------- | --------------------------------- |
| `display`        | 28px | 700    | 1.2         | `primary-600` `#0D9488` | Screen titles (main tab screens)  |
| `heading-1`      | 22px | 700    | 1.3         | `primary-600` `#0D9488` | Screen titles (secondary screens) |
| `heading-2`      | 18px | 600    | 1.4         | `gray-900` `#111827`    | Card titles, modal headers        |
| `heading-3`      | 16px | 600    | 1.4         | `gray-900` `#111827`    | Sub-section labels                |
| `body`           | 15px | 400    | 1.6         | `gray-600` `#4B5563`    | Body text, descriptions           |
| `body-medium`    | 15px | 500    | 1.6         | `gray-900` `#111827`    | Emphasized body, bid price        |
| `label`          | 13px | 500    | 1.4         | `gray-600` `#4B5563`    | Input labels, metadata            |
| `caption`        | 12px | 400    | 1.4         | `gray-400` `#9CA3AF`    | Timestamps, helper text           |
| `caption-medium` | 12px | 600    | 1.4         | Status pills, badges    |

---

## 4. Spacing System

Use an **8px base grid** exclusively. Never use arbitrary values.

| Token      | Value |
| ---------- | ----- |
| `space-1`  | 4px   |
| `space-2`  | 8px   |
| `space-3`  | 12px  |
| `space-4`  | 16px  |
| `space-5`  | 20px  |
| `space-6`  | 24px  |
| `space-8`  | 32px  |
| `space-10` | 40px  |
| `space-12` | 48px  |

**Screen horizontal padding:** 16px on all sides (never less).

**Card internal padding:** 16px.

**Section gap (between stacked cards):** 12px.

---

## 5. Border Radius

| Token         | Value  | Usage                        |
| ------------- | ------ | ---------------------------- |
| `radius-sm`   | 8px    | Inputs, small buttons        |
| `radius-md`   | 12px   | Chips, tags, small cards     |
| `radius-lg`   | 16px   | Main cards, modals           |
| `radius-xl`   | 24px   | Bottom sheets                |
| `radius-full` | 9999px | Pills, avatars, icon buttons |

---

## 6. Elevation / Shadow

| Token       | Value                         | Usage                |
| ----------- | ----------------------------- | -------------------- |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)`  | Cards at rest        |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` | Active cards, modals |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Bottom sheets        |

---

## 7. Icon System

**Library:** `react-native-vector-icons` → `MaterialIcons` set (filled variant).

**Rule:** Always filled icons. Never mix outline and filled. Never use emoji as icons.

### Icon Sizes

| Context             | Size    |
| ------------------- | ------- |
| Tab bar             | 26px    |
| Inside buttons      | 20px    |
| Inline with text    | 18px    |
| Status indicators   | 16px    |
| Large feature icons | 32–40px |

### Icon Colors

- Active / primary action: `primary-600` (`#0D9488`)
- Inactive / secondary: `gray-400` (`#9CA3AF`)
- On dark backgrounds: `#FFFFFF`
- Destructive actions: `danger-600` (`#DC2626`)

---

## 8. Component Library

### 8.1 Buttons

**Primary Button**

```
Background: primary-600
Text: white, 15px, weight 600
Height: 52px
Border radius: radius-sm (8px)
Padding: 0 24px
Icon (optional): left of text, 20px, white
Disabled: background gray-200, text gray-400
```

**Secondary Button**

```
Background: white
Border: 1.5px solid primary-600
Text: primary-600, 15px, weight 600
Height: 52px
Border radius: 8px
```

**Destructive Button**

```
Background: danger-100
Text: danger-600, 15px, weight 600
Height: 52px
Border radius: 8px
```

**Ghost / Text Button**

```
Background: transparent
Text: primary-600, 15px, weight 500
No border
Use only for secondary actions in tight spaces
```

**Icon Button (circular)**

```
Background: gray-100
Size: 40x40px
Border radius: radius-full
Icon: 20px, gray-600
```

---

### 8.2 Inputs

```
Background: white
Border: 1.5px solid gray-200
Border radius: 8px
Height: 52px
Padding: 0 16px
Font: 15px, weight 400, gray-900
Placeholder: gray-400

Focus state:
  Border: 1.5px solid primary-600
  Shadow: 0 0 0 3px rgba(13,148,136,0.15)

Error state:
  Border: 1.5px solid danger-600

Label: above input, 13px, weight 500, gray-600
Helper text: below input, 12px, gray-400
Error text: below input, 12px, danger-600
```

**Textarea:** Same styles, height: 120px minimum, `textAlignVertical: top`, padding-top: 12px.

---

### 8.3 Cards

**Standard Card**

```
Background: white
Border: 1px solid gray-200
Border radius: 16px
Shadow: shadow-sm
Padding: 16px
```

**Job Card (Homeowner & Expert views)**

```
Structure (top to bottom):
  Row 1: Category icon (teal bg, 36px icon) + Title (heading-3, primary-600 #0F766E) + Urgency pill (right)
  Row 2: Zone • Time ago (caption, gray-400)
  Row 3: Description snippet (body, 2 lines max, gray-600)
  Row 4: Divider
  Row 5: Bid count (label, gray-600) + Status pill (right)

No image thumbnails in the list view. Images only inside job detail.
```

**Bid Card**

```
Structure:
  Row 1: Expert avatar (40px) + Name (body-medium) + Rating (caption, teal star icon)
  Row 2: Price (22px, weight 700, gray-900) + Arrival estimate (caption, gray-600, right)
  Row 3: Expert message (body, 2 lines max, gray-600)
  Row 4: Warranty chip (if present) + Duration chip
  CTA: "Accept Bid" primary button (full width, only in homeowner view)
```

---

### 8.4 Status Pills

Always use the semantic color system. Never use raw colors.

```
Structure: rounded pill, 6px vertical padding, 10px horizontal padding
Font: caption-medium (12px, weight 600)
```

| Status               | Background    | Text Color    |
| -------------------- | ------------- | ------------- |
| OPEN                 | `primary-100` | `primary-600` |
| ASSIGNED             | `info-100`    | `info-600`    |
| EN_ROUTE             | `info-100`    | `info-600`    |
| ARRIVED              | `warning-100` | `warning-600` |
| IN_PROGRESS          | `warning-100` | `warning-600` |
| COMPLETION_REQUESTED | `warning-100` | `warning-600` |
| COMPLETED            | `success-100` | `success-600` |
| CANCELLED            | `gray-100`    | `gray-600`    |
| DISPUTED             | `danger-100`  | `danger-600`  |

---

### 8.5 Verification Badge

```
Inline with expert name.
Icon: MaterialIcons "verified" (filled), 16px, success-600
Text next to it: "Verified" caption-medium, success-600
Background: success-100 pill wrapping both
```

Never show an unverified expert without a clear visual indicator. Unverified = no badge, gray name.

---

### 8.6 Avatar

```
Size options: 32px, 40px, 56px, 80px
Shape: circle (radius-full)
Border: 2px solid white (when on colored bg)
Fallback: gray-200 bg + initials (heading-3, gray-600)
Expert avatars: show verified badge as a small overlay on bottom-right (16px icon)
```

---

### 8.7 Bottom Sheet

```
Background: white
Border radius: 24px 24px 0 0
Shadow: shadow-lg
Handle bar: 4px x 32px, gray-200, centered at top, margin-top 12px
Content padding: 24px
```

---

### 8.8 Empty States

```
Icon: large MaterialIcons icon, 64px, gray-300
Title: heading-2, gray-600, centered
Subtitle: body, gray-400, centered, max-width 240px
CTA button (if action available): primary button, centered
```

**Examples:**

- No jobs posted → icon: `work_outline` → "No jobs yet" → "Post your first job and get bids from verified experts."
- No bids yet → icon: `gavel` → "No bids yet" → "Experts in your zone will start bidding shortly."
- Empty notifications → icon: `notifications_none` → "You're all caught up" → no subtitle needed.

---

### 8.9 Toast / Snackbar

```
Background: gray-900
Text: white, body-medium
Border radius: 12px
Padding: 12px 16px
Max width: screen width - 32px
Position: bottom, above tab bar, 16px margin
Duration: 3s auto-dismiss
Success variant: left border 4px success-600
Error variant: left border 4px danger-600
```

---

## 9. Navigation Architecture

### Bottom Tab Bar (Shared Shell, Role-Aware)

The app uses **one bottom tab bar** for both roles. Tab content changes based on the user's active role. There is no tab switcher or toggle visible — the role is set at registration/login.

**Tab bar specs:**

```
Height: 64px + safe area bottom inset
Background: white
Top border: 1px solid gray-200
Active icon + label: primary-600
Inactive icon + label: gray-400
Label font: 11px, weight 500
```

### Badge Rules

- Messages tab: red dot badge when unread messages exist
- My Jobs / My Bids: numeric badge for pending actions (e.g., new bid, completion request)
- Max badge number displayed: 99+

---

## 9A. Homeowner Tab Layouts

### Tab 1 — Home

**Purpose:** Primary entry point. Get the homeowner to post a job.

**Header (large):**

- Small gray greeting: "Good morning, Ahmad"
- Display title (teal): "What needs fixing?"

**Content (top to bottom):**

1. **Post a Job button** — full width, primary teal, `add` icon left, label "Post a Job". First thing they see.
2. **"Recent activity" section label** — only shown if user has at least one job.
3. **Last 2–3 job cards** — compact version: title + status pill + bid count. "See all →" link at section label right.
4. **Empty state (new users only):** `home_repair_service` icon (teal, 64px) + "Your home is in good hands" + "Post your first job and get bids from verified local experts." + Post a Job primary button.

**Rules:**

- No category strip. No carousels. No horizontal scroll.
- If user has jobs, show recent activity. If not, show empty state — never show both.

---

### Tab 2 — My Jobs

**Purpose:** Full job tracker for all active and past jobs.

**Header (large):** "My Jobs" (teal)

**Filter toggle (below header, inside content):**
Two pills side by side: **Active** | **Past** — pill toggle style, not tabs. Active is default selected (teal filled), Past is outlined.

**Active jobs list:**

- Full job cards ordered by: Emergency first → Today → Scheduled → then recency.
- Each card: title (teal), zone + time ago (caption), urgency pill, status pill, bid count if OPEN / expert name if ASSIGNED+.
- Tapping opens Job Detail screen.

**Past jobs list** (Past pill selected):

- Completed jobs: show expert name + star rating given. If not yet reviewed, show "Leave a review" teal ghost button on the card.
- Cancelled jobs: gray card, muted styling, "Cancelled" pill.

**Empty states:**

- Active empty: `work_outline` icon → "No active jobs" → "Post a job and start receiving bids."
- Past empty: `history` icon → "No completed jobs yet."

---

### Tab 3 — Messages

**Purpose:** List of all post-acceptance chats.

**Header (large):** "Messages" (teal)

**Conversation list:**
Each row (height 72px):

- Expert avatar (40px) with verified badge overlay (bottom-right, 14px)
- Expert name (body-medium, gray-900) + job title below (caption, gray-400)
- Last message preview (caption, gray-600, 1 line, truncated)
- Timestamp (caption, gray-400, top-right)
- Unread indicator: teal filled dot (8px) on right if unread

Rows separated by a 1px gray-200 divider (no card style — flat list like iMessage).

**Empty state:** `chat_bubble_outline` icon → "No conversations yet" → "Accept a bid to start chatting with an expert."

**Rules:**

- No chat input on this screen.
- Tapping a row pushes a Chat screen onto the stack (not a tab).
- Stream Chat SDK handles the chat screen UI.

---

### Tab 4 — Profile

**Purpose:** Account overview + settings. Functional, not decorative.

**Header (large):** "Profile" (teal)

**Top block:**

- Avatar (56px, circle) + full name (heading-2) + phone number (caption, gray-400) in a row
- "Edit profile" ghost button (right-aligned)

**Stats row (3 equal chips in a horizontal row):**

- Jobs posted (label + number)
- Completed (label + number)
- Positive points (`thumb_up` teal icon + number)

**Grouped list sections (flat rows with chevron `chevron_right`):**

Section 1:

- My Reviews
- Reported Issues

Section 2:

- Notification Settings
- Language (shows "English" — Dari option added in later phase)

Section 3:

- Help & Support
- About Fixr

Section 4:

- **Log Out** — danger-600 text, no icon, no chevron, centered

Sections separated by 8px gray-100 block dividers (like iOS Settings).

---

## 9B. Expert Tab Layouts

### Tab 1 — Browse

**Purpose:** The job feed. Experts make money here — fast, scannable, action-oriented.

**Header (large):**

- Small gray greeting: "Jobs near you"
- Display title (teal): current primary zone name e.g. "Shahr-e-Naw"
- Top-right: zone selector (`location_on` icon + "Change" label, ghost button) → opens bottom sheet
- Top-right alongside zone: credit chip (teal pill: `● 12 credits`)

**Filter bar (below header):**
Horizontally scrollable category chips: All · Plumbing · Electrical · Carpentry · Painting… Default: "All". Tapping filters the feed in place.

**Job feed:**
Cards ordered: Emergency first → then recency. Each card:

- Job title (teal, heading-3)
- Zone + time ago (caption)
- Description snippet (2 lines, gray-600)
- Category chip + bid count chip (row)
- Urgency pill (right-aligned in top row)
- Emergency jobs: red left border (3px, danger-600)
- **"Place Bid · 1 credit"** — full-width primary button
- Already-bid jobs: outlined teal button "Bid Placed ✓" — disabled, non-tappable

**Empty state:** `search_off` icon → "No jobs in this zone" → "Try changing your zone or check back later."

---

### Tab 2 — My Bids

**Purpose:** Track submitted bids and manage active jobs.

**Header (large):** "My Bids" (teal)

**Toggle (below header):** **Bids** | **Active Jobs** — same pill toggle style as homeowner My Jobs.

**Bids view (default):**
All jobs the expert has bid on. Each row:

- Job title (teal) + zone (caption)
- Their bid price (body-medium, gray-900)
- Bid status pill: Pending (warning) / Accepted (success) / Rejected (gray) / Withdrawn (gray)
- Time submitted (caption, gray-400)
- Tapping a Pending bid opens bid detail — expert can edit price/message or withdraw

**Active Jobs view:**
Jobs where their bid was accepted. Each card:

- Job title + homeowner first name (caption)
- Current status pill
- Next action CTA button (full width, primary): "I've Arrived" / "Start Job" / "Request Completion"
- Only one CTA per card — always maps to the single next logical step

**Empty states:**

- Bids empty: `gavel` icon → "No bids placed yet" → "Browse jobs in your zone and place your first bid."
- Active Jobs empty: `assignment` icon → "No active jobs" → "Accepted bids will appear here."

---

### Tab 3 — Messages

**Purpose:** Same structure as homeowner Messages, mirrored perspective.

**Header (large):** "Messages" (teal)

Each conversation row shows **homeowner name + job title** (not expert). Same avatar, unread dot, last message preview, timestamp rules as homeowner side.

**Empty state:** `chat_bubble_outline` icon → "No conversations yet" → "Your chat unlocks once a homeowner accepts your bid."

---

### Tab 4 — Profile

**Purpose:** Account hub — credits, verification, stats, settings.

**Header (large):** "Profile" (teal)

**Top block:**

- Avatar (56px) + name + phone + verification status pill (Verified / Pending / Rejected) inline below name
- "Edit profile" ghost button

**Credit block (contained card, teal-tinted: primary-50 bg, primary-100 border):**

- "Your Credits" section label
- Credit count (22px, weight 700, teal) + "credits available" label beside it
- "Buy Credits" primary button (full width)
- Caption below: "1 credit = 1 bid · Purchased credits never expire"
- Kept compact — single card, does not dominate the screen

**Stats row (4 chips):**

- Jobs completed
- Completion rate %
- Rating (★ + number)
- No-show count — shown only if > 0, in danger-600

**Grouped list sections:**

Section 1:

- My Reviews (reviews received from homeowners)
- Verification Documents (tap to view / resubmit)
- Service Zones (tap to manage zones)

Section 2:

- Notification Settings
- Language

Section 3:

- Help & Support
- About Fixr

Section 4:

- **Log Out** — danger-600, no icon, no chevron, centered

---

### Tool Compatibility Notes (React Native + Expo SDK 55 + Stream Chat)

- All tab navigation: `expo-router` tabs with role-aware rendering — render different tab content based on `user.role` from auth context. No separate navigators per role.
- Toggle pills (Active/Past, Bids/Active Jobs): local `useState` — no library needed.
- Conversation list and chat screen: Stream Chat SDK (`stream-chat-expo`). The Messages tab list uses `ChannelList`, the chat screen uses `Channel` + `MessageList` + `MessageInput`. Style overrides via Stream's theming API to match Fixr colors.
- Zone selector bottom sheet: `@gorhom/bottom-sheet` (Expo-compatible).
- Category filter chips in Browse: `FlatList` horizontal with `showsHorizontalScrollIndicator={false}`.
- Credit chip in Browse header: read from user context / global state — no separate API call on every render.
- Infinite scroll on all lists: `FlatList` `onEndReached` + pagination from NestJS API.
- Pull-to-refresh: `RefreshControl` on all `FlatList` screens.

---

## 10. Screen-Level Layout Rules

### Screen Header

```
Height: 56px
Background: white
Bottom border: 1px solid gray-200
Title: heading-2 (18px, 600), color: primary-600 #0D9488, centered
Left slot: back arrow (MaterialIcons `arrow_back`, 24px) or menu
Right slot: action icon (optional)
```

Use a **large header** only on the main tab screens (Home, Browse):

```
No top border
Title: display (28px, 700), left-aligned, color: primary-600 #0D9488
Background: white
Padding: 16px horizontal
```

### Section Labels

```
Font: caption-medium (12px, weight 600)
Color: primary-600 #0D9488
Text transform: uppercase
Letter spacing: 0.06em
Margin bottom: 4px
```

Section labels are the small uppercase titles above grouped content (e.g. "Active jobs", "New in your zone"). Always teal — never gray.

### List Screens

- Cards stacked vertically with 12px gap
- Pull-to-refresh on all list screens
- Infinite scroll with a subtle loading spinner at bottom (primary-600)
- No horizontal scroll carousels

### Detail Screens

- Top: full-width image (if job has images) with overlay gradient at bottom
- Content below in white card that overlaps the image by 16px (border-radius top 24px)
- Sticky CTA button at bottom (above safe area)

---

## 11. Trust Indicators — Always Visible

These must appear wherever an expert is shown. Never omit them.

```
Expert profile summary block:
  - Avatar with verified badge overlay
  - Full name (heading-3, gray-900)
  - "Verified Expert" pill (success) OR "Pending Verification" pill (warning)
  - ★ Rating (teal star icon + numeric, body-medium)
  - X jobs completed (caption, gray-600)
  - Completion rate % (caption, gray-600)
  - No-show count — only show if > 0 (caption, danger-600, icon: `cancel`)
```

On job cards in expert browse view, show the homeowner's:

- Positive/negative point summary
- Jobs posted count

---

## 12. Role Separation Rules

Claude Code must follow these rules strictly and never mix role-specific UI:

| Screen / Element  | Homeowner                           | Expert                           |
| ----------------- | ----------------------------------- | -------------------------------- |
| Home tab          | Post new job CTA + recent jobs list | Zone job feed                    |
| Job card CTA      | "View Bids (X)"                     | "Place Bid"                      |
| Bid section       | See all bids, accept one            | See own bid status               |
| Chat trigger      | After accepting a bid               | After bid is accepted            |
| Completion action | "Confirm Completion" button         | "Mark as Complete" button        |
| Review prompt     | After homeowner confirms            | After homeowner confirms         |
| Credit display    | Not shown                           | Always visible in header/profile |
| Verification flow | Not applicable                      | Required before bidding          |

**Rule:** If a component is inside a homeowner screen, it must never reference credits, zones, or bidding. If it's inside an expert screen, it must never show bid acceptance controls.

---

## 13. Urgency Visual Treatment

| Urgency   | Pill style                                        | Additional                  |
| --------- | ------------------------------------------------- | --------------------------- |
| Emergency | danger-100 bg, danger-600 text, `flash_on` icon   | Red left border on job card |
| Today     | warning-100 bg, warning-600 text, `schedule` icon | —                           |
| Scheduled | gray-100 bg, gray-600 text, `calendar_today` icon | Show scheduled date inline  |

---

## 14. Key Interaction Patterns

**Bid acceptance flow:**

1. Homeowner taps "Accept" on a bid card
2. Confirmation bottom sheet appears: expert name, price, estimated arrival
3. "Confirm & Accept" primary button
4. On confirm: job status updates, chat unlocks, success toast

**Job status transitions (expert side):**

- Each status has one clear CTA button at the bottom of job detail
- EN_ROUTE → "I've Arrived" → ARRIVED
- ARRIVED → "Start Job" → IN_PROGRESS
- IN_PROGRESS → "Request Completion" → COMPLETION_REQUESTED
- Button label always matches the next action, never generic "Update"

**Credit deduction:**

- Show credit balance in expert header (top right, `toll` icon + count)
- Before placing a bid: show "This will use 1 credit (X remaining)" in the bid form
- After bid: toast "Bid placed — 1 credit used"

---

## 15. What Claude Code Must Never Do

- Never use emoji as UI elements or icons
- Never use gradients anywhere — not on titles, backgrounds, cards, or buttons. Solid colors only, always.
- Never use more than 2 font sizes on a single card
- Never put more than one primary button on a screen at a time
- Never show homeowner credit balance or zone selector
- Never show expert bid acceptance controls
- Never use color alone to convey status — always pair with text or icon
- Never use placeholder lorem ipsum text — always use realistic Fixr content
- Never use `border-radius` values not in the defined radius system
- Never use font sizes not in the defined type scale
- Never invent a new color — use tokens only

---

## 16. File & Folder Convention for UI

```
/components
  /common         — buttons, inputs, cards, pills, avatars (shared)
  /homeowner      — screens and components only for homeowner role
  /expert         — screens and components only for expert role
  /admin          — admin panel components

/constants
  colors.ts       — all color tokens exported as constants
  typography.ts   — all type styles as StyleSheet objects
  spacing.ts      — spacing tokens
  icons.ts        — icon name constants (no magic strings)

/theme
  index.ts        — re-exports all tokens as a unified theme object
```

All color values, spacing, and font sizes must come from these constants. No hardcoded hex values or pixel values anywhere else in the codebase.

---

## 17. Authentication — OTP Strategy

### Chosen Provider: Firebase Phone Auth (SMS) → WhatsApp fallback via Twilio

**Rationale:**

- Firebase Phone Auth is free for the first 10 SMS/day in test mode and costs ~$0.06/SMS for Afghanistan in production — the cheapest reliable option for MVP
- Free tier covers 50,000 MAUs for account management (no MAU cost until scale)
- Already in the stack for FCM (push notifications) — no new vendor to manage
- When budget allows or SMS delivery is unreliable, add Twilio Verify as WhatsApp channel fallback — same API, just a channel swap

**What NOT to use:**

- Free public SMS inboxes (GrizzlySMS, quackr.io) — publicly shared numbers, immediately flagged by WhatsApp/Google, zero reliability
- WhatsApp Business API directly in MVP — requires Meta business verification, significant setup overhead, not worth it at launch

**Backend implementation:**

- NestJS calls Firebase Admin SDK to send OTP to phone number
- Client (React Native) uses `expo-firebase-recaptcha` + Firebase Auth phone sign-in flow
- On verify: Firebase returns a JWT, NestJS validates it via Firebase Admin and issues its own app JWT
- OTP screen: 6-digit input, auto-submit on completion, 60s countdown, "Resend" ghost button after countdown

---

## 18. User Flows

### Global Rules for All Flows

- Progress bars on all multi-step flows: thin teal bar at very top of screen (not inside header)
- Back arrow always available except on OTP screen (going back cancels verification — show confirmation dialog)
- "Continue" / "Next" buttons always at the bottom, full width, disabled until required fields are valid
- Required field errors shown inline below the field on blur, not on submit
- Never clear previously entered data when navigating back within a flow

---

### Flow 1 — Registration & Onboarding

#### Screen 1: Phone Entry

- Fixr logo (centered, 48px) + tagline "Your home, expertly handled" (caption, gray-400)
- Afghanistan flag + `+93` pre-filled, locked (gray, non-editable) + phone number input (numeric keyboard)
- "Continue" primary button (disabled until 9–10 digit number entered)
- Caption below: "By continuing you agree to our Terms of Service"

#### Screen 2: OTP Verification

- "We sent a code to +93 7XX XXX XXXX" (body, gray-600)
- 6-box OTP input (each box: 48x56px, teal border on focus, auto-advance on digit entry)
- Auto-submits when all 6 digits filled — no button needed
- Countdown: "Resend in 0:45" (caption, gray-400) → becomes "Resend code" ghost button at zero
- Loading state: spinner replaces OTP boxes while verifying
- Error state: boxes turn danger-600 border + "Incorrect code. Try again." below

**If existing user:** OTP success → skip all onboarding → land on their role's home tab directly.

#### Screen 3: Role Selection (first-time only)

- No header, no back arrow
- Title: "How will you use Fixr?" (heading-1, teal, centered)
- Two large cards (full width, stacked vertically, 16px gap):

  **Card 1 — Homeowner**
  - Icon: `home` (teal, 40px, inside primary-50 circle)
  - Title: "I need help at home" (heading-2)
  - Subtitle: "Post jobs and hire verified local experts" (body, gray-600)

  **Card 2 — Expert**
  - Icon: `handyman` (teal, 40px, inside primary-50 circle)
  - Title: "I offer services" (heading-2)
  - Subtitle: "Browse jobs and earn by completing them" (body, gray-600)

- Tapping a card: teal border + teal checkmark top-right corner of card
- "Continue" button appears (slides up from bottom) after selection
- Warning caption below button: "This cannot be changed later. One phone number = one role."

---

#### Homeowner Onboarding (post role selection) — 2 steps

**Step 1 — Personal Info**

- Fields (all required):
  - First name
  - Last name
- "Next"

**Step 2 — Your Location**

- Explanation caption: "We use your zone to show your jobs to nearby experts."
- Zone picker (required): searchable dropdown / scrollable list of Kabul zones (e.g. Karte Seh, Khair Khana, Shahr-e-Naw, Qala-e-Fathullah…)
- Address field (required): free text — placeholder: "e.g. 12th Street, House No. 102, near the blue mosque"
- "Finish Setup" primary button → lands on Home tab with a welcome toast: "Welcome to Fixr, [First name]!"

**Phone number is stored from registration and linked to the account. It is never re-entered.**

---

#### Expert Onboarding (post role selection) — 6 steps

**Step 1 — Personal Info**

- Fields (all required):
  - First name
  - Last name
- "Next"

**Step 2 — Your Location**

- Same zone + address approach as homeowner
- Explanation caption: "We use your zone to match you with nearby jobs."
- Zone picker (required)
- Address (required): free text
- "Next"

**Step 3 — Selfie**

- Instruction: "Take a clear, well-lit photo of your face. No sunglasses."
- Camera open button (`photo_camera` icon + "Take Selfie" label)
- On capture: preview image fills the space + "Retake" ghost button below
- "Next" (disabled until photo captured)

**Step 4 — Tazkira Front**

- Instruction: "Photo of the front side of your Tazkira (national ID)"
- Same camera/preview pattern
- "Next"

**Step 5 — Tazkira Back**

- Instruction: "Photo of the back side of your Tazkira"
- Same camera/preview pattern
- "Next"

**Step 6 — Business Info (required, not optional)**

- Explanation caption: "This helps us verify you as a legitimate service provider."
- Fields:
  - Shop / business name (required)
  - Shop zone (required) — same zone picker
  - Shop address (required) — free text, same pattern as personal address
  - Shop image (required) — camera picker, same preview pattern
  - Work license image (required) — camera picker
- "Submit for Verification" primary button

**Submission confirmation screen (no tab bar):**

- Large teal checkmark icon (64px)
- "Application submitted!" (heading-1, teal)
- "Our team will review your documents. This usually takes up to 24 hours. We'll notify you once you're verified." (body, gray-600, centered)
- "Got it" primary button → lands on Browse tab

**Pending state (Browse tab while unverified):**

- Amber warning banner pinned below header: "Your account is under review. You'll be notified once verified." (warning-600 bg, white text)
- Job feed is hidden — replaced with a centered empty state: `hourglass_empty` icon (amber, 64px) + "Verification in progress" + "Once approved, you'll see jobs in your zone here."
- Profile tab shows Pending pill clearly
- On approval: FCM push → "You're verified! Start browsing jobs."
- Next app open after approval: banner gone, job feed loads normally

---

### Flow 2 — Job Posting (Homeowner)

Launched from "Post a Job" button on Home tab. Full-screen flow, 6 steps, progress bar at top.

**Step 1 — Category**

- Title: "What do you need help with?" (heading-1, teal)
- 2-column grid of category cards (icon + label each): Plumbing, Electrical, Carpentry, Painting, Appliance Repair, Cleaning, Construction, Other
- Tap to select (teal border highlight + checkmark)
- Auto-advances to Step 2 on selection (no "Next" button needed here)

**Step 2 — Job Details**

- Title input (required): placeholder "e.g. Kitchen sink leaking"
- Description textarea (required, min 20 chars): placeholder "Describe the problem in detail — the more info, the better bids you'll get"
- Character count shown below textarea (gray-400)
- "Next"

**Step 3 — Urgency**

- Title: "How urgent is this?" (heading-1, teal)
- Three stacked selectable cards:
  - ⚡ **Emergency** — "I need help as soon as possible" (danger-600 icon)
  - 🕐 **Today** — "Anytime today works" (warning-600 icon)
  - 📅 **Scheduled** — "I'll pick a specific date" (gray icon) → date picker appears inline below card on selection
- Tap to select (teal border)
- "Next"

**Step 4 — Location**

- Title: "Where is the job?" (heading-1, teal)
- Caption: "Experts in your zone will be notified about this job."
- Zone picker (required) — pre-filled with homeowner's registered zone but editable (job might be at a relative's house)
- Address field (required): free text — placeholder "e.g. 12th Street, House No. 102, near the blue mosque"
- Caption below address: "Your registered phone number (+93 7XX…) will be visible to the expert after bid acceptance."
- "Next"

**Step 5 — Photos & Video**

- Title: "Add photos or a video" (heading-1, teal)
- Caption: "Clear photos help experts understand the job and bid accurately."
- Photo grid: up to 3 photos. Each slot is a dashed-border square (tap to open image picker). Filled slots show thumbnail + `×` remove button.
- Video section below: single "Add Video" button (optional). Max 2 minutes. Shows video thumbnail + duration + `×` remove after adding.
- "Skip for now" ghost button (bottom, small) — only valid if description is ≥ 50 chars, otherwise ghost button is hidden and caption nudges: "Please add at least one photo or write a detailed description."
- "Next"

**Step 6 — Review & Post**

- Title: "Review your job" (heading-1, teal)
- Summary card sections (each with an "Edit" teal ghost link top-right):
  - Category (icon + name)
  - Title + Description (truncated to 3 lines, "Show more" if longer)
  - Urgency pill + date if scheduled
  - Zone + Address
  - Phone number (read-only, gray — "Experts will see this after acceptance")
  - Photos (small thumbnail row, max 3) + video indicator if added
- "Post Job" primary button (full width, bottom)
- On post: navigates back to Home tab + success toast: "Job posted — experts in [Zone] will start bidding shortly."

---

### Flow 3 — Bid Placement (Expert)

**Entry:** Expert taps a job card in Browse tab → Job Detail screen (stack push).

**Job Detail screen:**

- Full-width image carousel at top (if photos exist) with back arrow overlay + page dots
- White content card slides up (border-radius 24px top, overlaps image by 20px):
  - Job title (heading-1, teal)
  - Category chip + urgency pill (row)
  - Zone + posted time (caption, gray-400)
  - Section label: "Description"
  - Full description (body, gray-600)
  - Section label: "Homeowner"
  - Homeowner first name + positive points chip (trust indicator — no phone shown yet)
  - Photo grid if multiple images
- Sticky bottom bar: credit balance caption left ("12 credits remaining") + "Place Bid" primary button right

**Bid Form (full-screen, stack push):**

- Header: "Place a Bid" (teal) + back arrow
- Fields:
  - Price in AFN (required, numeric) — large input, prominent
  - Estimated arrival (required): short text — placeholder "e.g. Within 30 minutes"
  - Estimated job duration (required): short text — placeholder "e.g. 2–3 hours"
  - Warranty (optional): text — placeholder "e.g. 3 months on parts and labor"
  - Message to homeowner (optional but encouraged): textarea — placeholder "Introduce yourself and explain your approach..."
- Gray caption above submit button: "Placing this bid will use 1 credit. You have X credits remaining."
- "Submit Bid" primary button (full width, bottom)
- On submit: success toast "Bid placed — 1 credit used", navigate back to Browse, job card updates to "Bid Placed ✓" (outlined, disabled)

---

### Flow 4 — Bid Acceptance (Homeowner)

**Entry:** Homeowner opens a job from My Jobs or Home → Job Detail screen.

**Job Detail screen (OPEN state):**

- Job summary (same layout as expert view but homeowner perspective)
- Sticky bottom: "View Bids (X)" primary button

**Bids List screen:**

- Header: "Bids received" (teal) + bid count chip (primary-100)
- Sort control (top right): "Price ↑" default — tap to toggle Price / Arrival time
- Bid cards (full-width, stacked):
  - Expert avatar (40px) + verified badge + name (body-medium) + rating + completed jobs count
  - Price (22px, weight 700, gray-900) + arrival estimate (caption, right)
  - Duration chip + warranty chip (if present)
  - Message preview (2 lines, gray-600)
  - "Accept Bid" primary button (full width)

**Accept confirmation (bottom sheet):**

- Handle bar at top
- Expert avatar (56px, centered) + name + verified badge
- Price (display size, teal, centered)
- "Arrives in: [estimate]" (body, gray-600, centered)
- Divider
- Body text (gray-600): "Once you accept, this expert will be assigned to your job and you can start chatting."
- "Confirm & Accept" primary button (full width)
- "Go back" ghost button below

**On confirm:**

- Job status → ASSIGNED
- All other bidding experts receive FCM: "This job has been filled."
- Chat channel created via Stream Chat
- Homeowner navigates back to Job Detail — now shows expert info block + "Message [Expert name]" teal button
- Success toast: "Bid accepted — chat is now open with [Expert name]"

---

### Flow 5 — Job Lifecycle (Expert)

Expert finds accepted job in My Bids → Active Jobs toggle.

Each job card shows the current status and exactly one CTA. No ambiguity.

| Current Status | Card CTA             | Next Status          | FCM to Homeowner                                   |
| -------------- | -------------------- | -------------------- | -------------------------------------------------- |
| ASSIGNED       | "I'm On My Way"      | EN_ROUTE             | "Your expert is on the way"                        |
| EN_ROUTE       | "I've Arrived"       | ARRIVED              | "Your expert has arrived"                          |
| ARRIVED        | "Start Job"          | IN_PROGRESS          | "Your expert has started the job"                  |
| IN_PROGRESS    | "Request Completion" | COMPLETION_REQUESTED | "Your expert says the job is done. Please review." |

**"Request Completion" bottom sheet:**

- "Confirm job completion?" (heading-2)
- Optional note field: "Any notes for the homeowner?" (placeholder)
- "Send Completion Request" primary button
- "Not yet" ghost button

**Homeowner side — COMPLETION_REQUESTED:**

- Job Detail shows amber banner: "Your expert has requested completion. Please review the work."
- Two buttons stacked:
  - "Confirm Completion" (primary, teal, full width)
  - "Raise a Dispute" (danger ghost, full width)

**Confirm → COMPLETED:**

- Success state on both sides
- Review bottom sheet appears (see Flow 6)
- Job moves to Past in My Jobs / My Bids history

**Dispute → DISPUTED:**

- Dispute form screen (stack push):
  - "Reason" selector (single select): Price dispute / Work quality / No-show / Communication issue / Other
  - Description textarea (required): "Describe what happened"
  - "Submit Dispute" primary button (danger-600 bg)
- On submit: job status → DISPUTED, admin notified, both parties see DISPUTED pill on job

---

### Flow 6 — Reviews (Post-Completion)

Triggered immediately after COMPLETED status. Appears as a non-blocking bottom sheet on both sides.

**Bottom sheet:**

- Handle bar
- "How was your experience with [Name]?" (heading-2, centered)
- 5-star row (large stars, tap to select, selected stars fill teal)
- Positive tag chips (multi-select, shown always):
  - Homeowner reviewing expert: "Punctual" · "Quality work" · "Professional" · "Fair price" · "Great communication"
  - Expert reviewing homeowner: "Clear instructions" · "Respectful" · "Payment ready" · "Easy to work with"
- Negative tag chips (shown only if rating ≤ 3, danger-100 bg, danger-600 text):
  - Homeowner: "Late" · "Poor quality" · "Unprofessional" · "Overpriced"
  - Expert: "Unclear instructions" · "Disrespectful" · "Changed scope"
- Comment textarea (optional): "Add a comment (optional)"
- "Submit Review" primary button
- "Skip for now" ghost button (small, gray-400)

**Dismissal behavior:**

- Dismissed: reappears once on next app open if within 7 days of job completion. After that, quietly expires.
- On submit: toast "Review submitted. Thank you!" — review immediately visible on the other party's profile.
