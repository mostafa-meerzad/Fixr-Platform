# Fixr API Reference

**Base URL:** `http://localhost:3001/api/v1`  
**Auth:** Bearer token in `Authorization` header for all protected routes  
**Content-Type:** `application/json` (multipart/form-data for file uploads)  
**Error shape:** `{ success: false, statusCode, message, path, timestamp }`

---

## Setup

```bash
# 1. Copy env and fill in credentials
cp apps/backend/.env.example apps/backend/.env

# 2. Run migrations
cd apps/backend && bun run prisma:migrate

# 3. Seed admin user, zones, categories
bun run prisma:seed

# 4. Start server
bun run start:dev
# Swagger UI: http://localhost:3001/api/docs
```

**Default admin credentials (from seed):**
- Email: `admin@fixr.af`
- Password: `Fixr@Admin2025!`

---

## Auth

### POST /auth/otp/send
Send WhatsApp OTP to a phone number.

**Rate limit:** 5 requests/min

```json
// Request
{ "phone": "+93701234567" }

// Response 200
{ "message": "Verification code sent via WhatsApp." }

// Error 429 — cooldown active
{ "message": "Please wait 60 seconds before requesting a new code." }
```

---

### POST /auth/otp/verify
Verify the OTP code.

```json
// Request
{ "phone": "+93701234567", "code": "482931" }

// Response 200
{
  "sessionId": "clx...",
  "isNewUser": true
}
```

- If `isNewUser: true` → call `/auth/register`  
- If `isNewUser: false` → call `/auth/login`

---

### POST /auth/register
Register a new user (first time only). Consumes the OTP session.

```json
// Request
{
  "phone": "+93701234567",
  "name": "Ahmad Karimi",
  "role": "HOMEOWNER",        // or "EXPERT"
  "sessionId": "clx...",
  "zoneId": "clx_zone1",     // required when role = HOMEOWNER
  "address": "12th Street, House No. 102, near the blue mosque"  // required when role = HOMEOWNER
}

// Response 201
{
  "accessToken": "eyJ...",
  "refreshToken": "a3f...",
  "user": {
    "id": "clx...",
    "name": "Ahmad Karimi",
    "phone": "+93701234567",
    "role": "HOMEOWNER",
    "avatarUrl": null,
    "homeownerProfile": {       // present when role = HOMEOWNER
      "id": "...",
      "zoneId": "clx_zone1",
      "address": "12th Street, House No. 102",
      "zone": { "id": "clx_zone1", "nameEn": "Karte Seh" },
      "positivePoints": 0,
      "negativePoints": 0
    }
  }
}

// Error 400 — missing zone or address for homeowner
{ "message": "zoneId and address are required for homeowner registration." }
```

---

### POST /auth/login
Login existing user. Consumes the OTP session.

```json
// Request
{ "phone": "+93701234567", "sessionId": "clx..." }

// Response 200 — same shape as register
```

---

### POST /auth/refresh
Rotate refresh token and get new access token.

```json
// Request
{ "refreshToken": "a3f..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "b8d..." }
```

---

### POST /auth/logout
🔒 Protected

```json
// Request (body optional — omit to revoke all devices)
{ "refreshToken": "a3f..." }

// Response 200
{ "success": true }
```

---

### POST /auth/admin/login
Admin email + password login. No OTP.

**Rate limit:** 5 requests/min

```json
// Request
{ "email": "admin@fixr.af", "password": "Fixr@Admin2025!" }

// Response 200
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "name": "Fixr Admin", "email": "admin@fixr.af", "role": "ADMIN" }
}
```

---

## Users

### GET /users/me
🔒 Protected — any role

```json
// Response 200 — EXPERT role
{
  "id": "clx...",
  "name": "Ahmad Karimi",
  "phone": "+93701234567",
  "role": "EXPERT",
  "avatarUrl": null,
  "language": "fa",
  "expertProfile": {
    "id": "...",
    "verificationStatus": "PENDING",
    "isAvailable": false,
    "rating": 0,
    "completedJobs": 0,
    "totalJobs": 0,
    "completionRate": 0,
    "noShowCount": 0,
    "positivePoints": 0,
    "negativePoints": 0,
    "shopZoneId": "clx_zone2",
    "shopAddress": "12th Street, Shop No. 4",
    "shopZone": { "id": "clx_zone2", "nameEn": "Shahr-e-Naw" },
    "creditBalance": { "balance": 0 },
    "serviceZones": [],
    "serviceCategories": []
  }
}

// Response 200 — HOMEOWNER role
{
  "id": "clx...",
  "name": "Ahmad Karimi",
  "phone": "+93701234567",
  "role": "HOMEOWNER",
  "avatarUrl": null,
  "language": "fa",
  "homeownerProfile": {
    "id": "...",
    "zoneId": "clx_zone1",
    "address": "12th Street, House No. 102",
    "zone": { "id": "clx_zone1", "nameEn": "Karte Seh" },
    "positivePoints": 0,
    "negativePoints": 0
  }
}
```

---

### PATCH /users/me
🔒 Protected — any role

```json
// Request (all fields optional)
{ "name": "Ahmad Karimi", "language": "en" }
```

---

### PATCH /users/me/fcm-token
🔒 Protected — any role  
Call this on every app launch to keep the device token current.

```json
// Request
{ "fcmToken": "fMx9s..." }

// Response 200
{ "success": true }
```

---

### PATCH /users/me/expert-profile
🔒 Expert only

```json
// Request (all optional)
{ "description": "5 years experience in plumbing", "shopName": "Karimi Plumbing" }
```

---

### PATCH /users/me/availability
🔒 Expert only — must be verified first

```json
// Request
{ "isAvailable": true }

// Error 403 — not yet verified
{ "message": "Your account must be verified before you can receive job alerts." }
```

---

### PATCH /users/me/zones
🔒 Expert only  
Replaces all zone assignments atomically. Min 1, max 10.

```json
// Request
{ "zoneIds": ["clx_zone1", "clx_zone2"] }
```

---

### PATCH /users/me/categories
🔒 Expert only  
Replaces all service category assignments atomically. Min 1, no upper limit.  
Called during onboarding step 3 (categories screen). Returns updated expert profile.

```json
// Request
{ "categoryIds": ["clx_cat1", "clx_cat3"] }

// Response 200 — updated expertProfile including serviceCategories
{
  "serviceCategories": [
    { "category": { "id": "clx_cat1", "nameEn": "Plumbing" } },
    { "category": { "id": "clx_cat3", "nameEn": "Electrical" } }
  ]
}
```

Errors:
- `400` — `categoryIds` is empty
- `400` — one or more IDs are invalid or inactive

---

### POST /users/me/submit-verification
🔒 Expert only  
Requires all 5 media uploads before submission: selfie, tazkira_front, tazkira_back, shop_image, work_license.

```json
// Request
{
  "shopName": "Karimi Plumbing",        // optional
  "description": "5 years experience", // optional
  "shopZoneId": "clx_zone2",           // required
  "shopAddress": "12th Street, Shop No. 4"  // required
}

// Response 200
{
  "verificationStatus": "PENDING",
  "shopZoneId": "clx_zone2",
  "shopAddress": "12th Street, Shop No. 4",
  "shopZone": { "id": "clx_zone2", "nameEn": "Shahr-e-Naw" },
  ...
}

// Error 400 — any required upload missing
{ "message": "Please upload your selfie, Tazkira (front and back), shop image, and work license before submitting." }

// Error 400 — shopZoneId or shopAddress missing
{ "message": "shopZoneId and shopAddress are required." }
```

---

### GET /users/experts/:userId
🔒 Protected — public expert profile (shown when homeowner views bids)

```json
// Response 200
{
  "id": "...",
  "user": { "id": "...", "name": "Ahmad Karimi", "avatarUrl": null },
  "shopName": "Karimi Plumbing",
  "description": "...",
  "rating": 4.8,
  "completedJobs": 24,
  "noShowCount": 0,
  "positivePoints": 18,
  "negativePoints": 1,
  "verificationStatus": "VERIFIED",
  "serviceZones": [{ "zone": { "id": "...", "name": "کارته سه", "nameEn": "Karte Seh" } }],
  "serviceCategories": [{ "category": { "id": "...", "nameEn": "Plumbing" } }]
}
```

---

## Media

All media endpoints use `multipart/form-data` with field name `file`.

### POST /media/avatar
🔒 Protected — any role  
Accepted: JPEG, PNG, WEBP, HEIC — max 10 MB

```json
// Response 200
{ "url": "https://res.cloudinary.com/..." }
```

---

### POST /media/expert/:target
🔒 Expert only  
`target` values: `selfie` | `tazkira_front` | `tazkira_back` | `shop_image` | `work_license`

```json
// Response 200
{ "url": "https://res.cloudinary.com/..." }
```

---

### POST /media/jobs/:jobId
🔒 Homeowner only — job must be DRAFT  
Images: JPEG/PNG/WEBP/HEIC, max 10 MB, max 8 per job  
Video: MP4/MOV, max 100 MB, max 1 per job

```json
// Response 201
{ "id": "...", "jobId": "...", "url": "https://res.cloudinary.com/...", "type": "image" }
```

---

### DELETE /media/jobs/media/:mediaId
🔒 Homeowner only — job must be DRAFT

```json
// Response 200
{ "success": true }
```

---

## Categories

### GET /categories
Public — no auth required.  
Query: `?all=true` to include inactive (admin use)

```json
// Response 200
[
  { "id": "...", "name": "لوله‌کشی", "nameEn": "Plumbing", "icon": "droplets", "isActive": true },
  ...
]
```

---

### POST /categories
🔒 Admin only

```json
// Request
{ "name": "تاسیسات", "nameEn": "HVAC", "icon": "thermometer" }
```

---

### PATCH /categories/:id
🔒 Admin only

```json
// Request (all optional)
{ "nameEn": "Heating & Cooling", "isActive": false }
```

---

### DELETE /categories/:id
🔒 Admin only — soft-delete (sets `isActive: false`)

---

## Zones

Same pattern as Categories.

### GET /zones — public
### POST /zones — admin
### PATCH /zones/:id — admin
### DELETE /zones/:id — admin (soft-delete)

```json
// Create zone request
{
  "name": "کارته سه",
  "nameEn": "Karte Seh",
  "latitude": 34.5143,
  "longitude": 69.1716
}
```

---

## Jobs

### POST /jobs
🔒 Homeowner only — creates a DRAFT

```json
// Request
{
  "title": "Kitchen sink leaking badly",
  "description": "Water dripping constantly from under the cabinet, can't turn off the main tap.",
  "categoryId": "clx_cat1",
  "zoneId": "clx_zone1",
  "address": "Karte Seh, near the blue mosque, house #14",
  "urgency": "EMERGENCY",        // EMERGENCY | TODAY | SCHEDULED
  "scheduledAt": null,           // ISO 8601 date, required if urgency=SCHEDULED
  "notes": "Front door is blue",
  "latitude": 34.5143,
  "longitude": 69.1716
}

// Response 201 — full job object with category, zone, media, bid count
```

---

### PATCH /jobs/:id
🔒 Homeowner only — job must be DRAFT

```json
// Request — any field from create, all optional
{ "title": "Updated title", "urgency": "TODAY" }
```

---

### POST /jobs/:id/publish
🔒 Homeowner only — DRAFT → OPEN  
Requires: ≥1 image uploaded **OR** description ≥50 chars.  
On success: notifies all verified+available experts in the job's zone.

```json
// Response 200 — updated job object
// Error 400 — no media and short description
{ "message": "Job must have at least one photo or a detailed description (50+ chars) before publishing." }
```

---

### POST /jobs/:id/cancel
🔒 Homeowner only — any status except COMPLETED/DISPUTED

```json
// Request
{ "reason": "Found someone directly" }

// Response 200 — cancelled job
// Side effect: if expert was assigned, their bid credit is refunded + they are notified
```

---

### DELETE /jobs/:id
🔒 Homeowner only — DRAFT only

```
// Response 204 No Content
```

---

### POST /jobs/:id/en-route
🔒 Expert only — ASSIGNED → EN_ROUTE  
Homeowner is notified.

### POST /jobs/:id/arrived
🔒 Expert only — EN_ROUTE → ARRIVED  
Homeowner is notified.

### POST /jobs/:id/start
🔒 Expert only — ARRIVED → IN_PROGRESS

### POST /jobs/:id/request-completion
🔒 Expert only — IN_PROGRESS → COMPLETION_REQUESTED  
Homeowner is notified to confirm.

### POST /jobs/:id/complete
🔒 Homeowner only — COMPLETION_REQUESTED → COMPLETED  
Updates expert's `completedJobs`, `totalJobs`, `completionRate`.

---

### GET /jobs
🔒 Protected  
- Homeowner: their own jobs  
- Expert: their active/completed assigned jobs  
- Admin: all jobs

Query params: `status`, `urgency`, `categoryId`, `zoneId`, `page`, `limit`

```json
// Response 200
{
  "data": [ /* job objects */ ],
  "total": 48,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET /jobs/browse
🔒 Expert only  
Returns OPEN jobs in the expert's service zones, excluding ones they've already bid on. Sorted: EMERGENCY first.

Query params: `urgency`, `categoryId`, `page`, `limit`

Each job in the response includes a `homeowner` trust block:
```json
"homeowner": {
  "firstName": "Ahmad",         // first word of user.name only — no phone, no last name
  "positivePoints": 12,         // from homeownerProfile
  "jobsPosted": 4               // total jobs posted by this homeowner
}
```

---

### GET /jobs/:id
🔒 Protected — role-scoped access

**Homeowner phone visibility rules:**
- Homeowner requesting their own job: phone always included
- Admin: phone always included
- Expert viewing an OPEN job (before assignment): `homeowner.phone` is **omitted**
- Expert viewing ASSIGNED / EN_ROUTE / ARRIVED / IN_PROGRESS / COMPLETION_REQUESTED / COMPLETED: `homeowner.phone` is **included**

```json
// Response 200
{
  "id": "clx...",
  "title": "Kitchen sink leaking badly",
  "status": "OPEN",
  "urgency": "EMERGENCY",
  "address": "Karte Seh...",
  "description": "...",
  "category": { "id": "...", "name": "لوله‌کشی", "nameEn": "Plumbing" },
  "zone": { "id": "...", "name": "کارته سه", "nameEn": "Karte Seh" },
  "media": [{ "id": "...", "url": "https://...", "type": "image" }],
  "acceptedBid": null,
  "_count": { "bids": 3 },
  "homeownerId": "...",
  "homeowner": {
    "id": "...",
    "name": "Ahmad Karimi",
    "avatarUrl": null
    // "phone" is included or omitted per the rules above
  },
  "openedAt": "2025-01-01T10:00:00Z",
  "createdAt": "2025-01-01T09:55:00Z"
}
```

---

## Bids

### POST /jobs/:jobId/bids
🔒 Expert only  
Costs 1 credit. Expert must serve the job's zone.

```json
// Request
{
  "price": 1500,
  "estimatedArrivalMinutes": 30,
  "estimatedDurationHours": 2.5,
  "warrantyDescription": "1 month parts and labour",
  "expertMessage": "I have the parts in my van, quick fix."
}

// Response 201 — bid object with expert public profile
// Error 400 — insufficient credits
{ "message": "Insufficient credits. Please purchase more credits to place a bid." }
// Error 409 — already bid
{ "message": "You have already placed a bid on this job." }
```

---

### PATCH /bids/:bidId
🔒 Expert only — before acceptance, while job is OPEN

```json
// Request — all optional
{ "price": 1200, "expertMessage": "Updated note" }
```

---

### DELETE /bids/:bidId
🔒 Expert only — before acceptance  
Soft-withdraws bid (`isWithdrawn: true`). No credit refund on voluntary withdrawal.

---

### POST /jobs/:jobId/bids/:bidId/accept
🔒 Homeowner only — job must be OPEN, no bid already accepted

```json
// Response 200
{
  "job": { /* full job object, status now ASSIGNED */ },
  "bid": { /* accepted bid */ }
}
// Side effects:
//   - job.acceptedBidId set, job.status = ASSIGNED
//   - Expert notified via FCM
//   - Chat channel created in Stream Chat
```

---

### GET /jobs/:jobId/bids
🔒 Protected  
- Homeowner (owns job): all non-withdrawn bids with expert profile  
- Expert: only their own bid for this job  
- Admin: all bids including withdrawn

```json
// Response 200 — array of bids
[
  {
    "id": "...",
    "price": 1500,
    "estimatedArrivalMinutes": 30,
    "estimatedDurationHours": 2.5,
    "warrantyDescription": "1 month parts and labour",
    "expertMessage": "...",
    "isWithdrawn": false,
    "expert": {
      "id": "...",
      "rating": 4.8,
      "completedJobs": 24,
      "positivePoints": 18,
      "negativePoints": 1,
      "verificationStatus": "VERIFIED",
      "user": { "id": "...", "name": "Ahmad Karimi", "avatarUrl": null }
    }
  }
]
```

---

### GET /bids/mine
🔒 Expert only — all bids the expert has placed across all jobs

---

## Chat

### GET /chat/jobs/:jobId/token
🔒 Protected — homeowner or assigned expert only  
Chat is only available after bid acceptance (status ≥ ASSIGNED).

```json
// Response 200
{
  "token": "eyJ...",        // Stream Chat user token (24h expiry)
  "channelId": "job-clx...",
  "channelType": "messaging",
  "apiKey": "your_stream_api_key"
}

// Error 403 — bid not yet accepted
{ "message": "Chat is only available after a bid has been accepted." }
```

Use these values to initialise the Stream Chat client on the mobile app.

---

## Reviews

### POST /jobs/:jobId/review
🔒 Protected — homeowner or assigned expert of a COMPLETED job  
48-hour window after completion. One review per job.

```json
// Request
{
  "rating": 5,              // 1–5
  "comment": "Great work, fast and clean.",
  "isPositive": true,       // optional — adds to reviewee's positive/negative points
  "tags": ["Punctual", "Quality work", "Fair price"]  // optional — UI tag chips
}

// Response 201
// Side effects (homeowner reviewing expert):
//   - expertProfile.rating recalculated (rolling average)
//   - expertProfile.positivePoints or negativePoints incremented
// Side effects (expert reviewing homeowner):
//   - homeownerProfile.positivePoints or negativePoints incremented

// Error 400 — window closed
{ "message": "The 48-hour review window for this job has closed." }
```

---

### GET /jobs/:jobId/review
🔒 Protected

```json
// Response 200 or null
{
  "id": "...",
  "rating": 5,
  "comment": "Great work.",
  "isPositive": true,
  "reviewer": { "id": "...", "name": "...", "avatarUrl": null },
  "reviewee": { "id": "...", "name": "...", "avatarUrl": null },
  "createdAt": "..."
}
```

---

### GET /users/:userId/reviews
🔒 Protected — reviews received by a user

---

## Disputes

### POST /jobs/:jobId/dispute
🔒 Protected — homeowner or assigned expert  
Job must be in an active status (ASSIGNED through COMPLETION_REQUESTED).  
Moves job to DISPUTED.

```json
// Request
{
  "reason": "NO_SHOW",      // PRICE_DISPUTE | WORK_QUALITY | NO_SHOW | COMMUNICATION_ISSUE | OTHER
  "description": "The expert accepted the bid 3 hours ago and has not arrived or responded."
}

// Response 201 — dispute object
// Error 409 — dispute already exists for this job
```

---

### GET /disputes
🔒 Admin only — all disputes newest first

### GET /disputes/:id
🔒 Admin only — full detail including job, all bids, media, homeowner + expert contact info

### POST /disputes/:id/resolve
🔒 Admin only

```json
// Request
{ "resolution": "Credit refunded to expert. No-show recorded on profile." }
```

---

### GET /users/me/disputes
🔒 Protected — disputes the current user is involved in

---

## Credits

### GET /credits/me/balance
🔒 Expert only

```json
// Response 200
{ "balance": 7 }
```

---

### GET /credits/me/ledger
🔒 Expert only

Query: `page`, `limit`

```json
// Response 200
{
  "data": [
    {
      "id": "...",
      "type": "BID_SPEND",
      "amount": -1,
      "balanceAfter": 6,
      "description": "Bid placed on job clx...",
      "createdAt": "..."
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Transaction types: `WELCOME_GRANT` | `PURCHASE` | `BID_SPEND` | `BID_REFUND` | `ADMIN_ADJUSTMENT`

---

### POST /credits/admin/purchase
🔒 Admin only — record a cash credit purchase

```json
// Request
{
  "expertUserId": "clx...",
  "amount": 10,
  "note": "Paid 500 AFN cash — receipt #42"
}
// Response 200 — [updatedBalance, newTransaction]
```

---

### POST /credits/admin/adjust
🔒 Admin only — positive or negative adjustment

```json
// Request
{
  "expertUserId": "clx...",
  "amount": -2,
  "reason": "Penalty after dispute investigation"
}
// Error 400 — would result in negative balance
```

---

### GET /credits/admin/ledger/:expertUserId
🔒 Admin only

### GET /credits/admin/rate
🔒 Admin only

```json
// Response 200
{ "id": "...", "afnPerCredit": 50, "welcomeCredits": 5, "welcomeExpiryDays": 30 }
```

---

### PUT /credits/admin/rate
🔒 Admin only

```json
// Request
{ "afnPerCredit": 75, "welcomeCredits": 3, "welcomeExpiryDays": 14 }
```

---

## Notifications

### GET /notifications/me
🔒 Protected

Query: `page`, `limit`

```json
// Response 200
{
  "data": [
    {
      "id": "...",
      "type": "BID_RECEIVED",
      "title": "قیمت جدید دریافت شد",
      "titleEn": "New bid received",
      "body": "Ahmad Karimi برای \"Kitchen sink leak\" قیمت داد.",
      "bodyEn": "Ahmad Karimi placed a bid on \"Kitchen sink leak\".",
      "data": { "jobId": "...", "bidId": "..." },
      "isRead": false,
      "sentAt": "2025-01-01T10:05:00Z"
    }
  ],
  "total": 14,
  "unreadCount": 3,
  "page": 1,
  "limit": 30,
  "totalPages": 1
}
```

---

### PATCH /notifications/:id/read
🔒 Protected — 204 No Content

### PATCH /notifications/me/read-all
🔒 Protected — 204 No Content

---

## Admin

All admin endpoints require the admin JWT.

### GET /admin/dashboard

```json
// Response 200
{
  "users": { "total": 142, "active": 138 },
  "experts": { "verified": 45, "pendingVerification": 3 },
  "jobs": { "open": 12, "assigned": 8, "completed": 310, "cancelled": 22, "disputed": 1 },
  "credits": { "purchasedThisMonth": 87 }
}
```

---

### GET /admin/verification/pending
Returns experts with `verificationStatus: PENDING`, oldest first.  
Each record includes: user (name, phone), selfieUrl, tazkiraFrontUrl, tazkiraBackUrl, shopImageUrl, workLicenseUrl, serviceZones.

---

### POST /admin/verification/:userId

```json
// Request
{ "status": "VERIFIED", "note": null }
// or
{ "status": "REJECTED", "note": "Tazkira image is unclear. Please resubmit." }

// Side effects on VERIFIED:
//   - Welcome credits granted (amount from credit rate config)
//   - Expert notified via FCM
```

---

### GET /admin/users
Query: `role` (HOMEOWNER|EXPERT), `page`, `limit`

```json
// Response 200 — paginated user list with expertProfile summary + job count
```

---

### GET /admin/users/:userId
Full detail including expertProfile, zones, credit balance.

---

### PATCH /admin/users/:userId/suspension

```json
// Request
{ "isSuspended": true, "reason": "Repeated no-shows" }
// Suspended users cannot log in — JwtStrategy rejects their tokens
```

---

### PATCH /admin/users/:userId/expert-points

```json
// Request — all optional, values are increments (can be negative)
{ "positivePoints": 1, "negativePoints": 0, "noShowCount": -1 }
```

---

### GET /admin/notifications
Query: `page`, `limit`  
Full platform notification log with recipient info.

---

## Job Lifecycle — Full Flow

```
1. Expert registers → submits verification docs → admin approves
   → welcome credits granted → expert sets zones + availability

2. Homeowner registers → uploads job photos → creates DRAFT job
   → publishes job (DRAFT → OPEN)
   → all verified+available experts in zone are notified

3. Expert browses open jobs (GET /jobs/browse)
   → places bid (costs 1 credit)
   → can update or withdraw bid while job is OPEN

4. Homeowner views bids (GET /jobs/:id/bids)
   → accepts a bid (POST /jobs/:id/bids/:bidId/accept)
   → job becomes ASSIGNED, expert notified
   → both parties can now open chat (GET /chat/jobs/:id/token)

5. Expert progresses:
   ASSIGNED → EN_ROUTE (homeowner notified)
             → ARRIVED (homeowner notified)
             → IN_PROGRESS
             → COMPLETION_REQUESTED (homeowner notified)

6. Homeowner confirms → COMPLETED
   → expert stats updated (completedJobs, completionRate)
   → 48-hour review window opens for both parties

7. Either party can raise a dispute on an active job
   → job moves to DISPUTED, admin reviews and resolves

8. No-show: if expert doesn't arrive within ETA + 2h
   → cron (every 10 min) detects it, increments noShowCount,
     returns job to OPEN so homeowner can accept another bid
```

---

## Notification Types

| Type | Triggered by | Recipient |
|---|---|---|
| `JOB_POSTED` | Job publish | All zone experts |
| `BID_RECEIVED` | Bid placed | Homeowner |
| `BID_ACCEPTED` | Bid accepted | Expert |
| `EXPERT_EN_ROUTE` | Expert marks en route | Homeowner |
| `EXPERT_ARRIVED` | Expert marks arrived | Homeowner |
| `COMPLETION_REQUESTED` | Expert requests completion | Homeowner |
| `JOB_COMPLETED` | Homeowner confirms | Expert |
| `JOB_CANCELLED` | Homeowner cancels | Expert (+ credit refund) |
| `JOB_CANCELLED` | No-show detected by cron | Homeowner |
| `REVIEW_REQUESTED` | (future automation) | Both parties |
| `VERIFICATION_APPROVED` | Admin approves | Expert |
| `VERIFICATION_REJECTED` | Admin rejects | Expert |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Default `30d` |
| `PORT` | Server port, default `3001` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `WHATSAPP_API_URL` | `https://graph.facebook.com/v19.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Business dashboard |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token |
| `OTP_EXPIRY_MINUTES` | Default `5` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FIREBASE_PROJECT_ID` | Firebase project |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `STREAM_API_KEY` | Stream Chat API key |
| `STREAM_API_SECRET` | Stream Chat API secret |
| `ADMIN_EMAIL` | Seed admin email (default `admin@fixr.af`) |
| `ADMIN_PASSWORD` | Seed admin password |
