# Fixr MVP Specification

## Project Overview

Fixr is a local service marketplace connecting homeowners with verified local experts.

Homeowners can post problems, receive bids from experts, choose the best offer, communicate with the selected expert, and track job completion.

Experts can browse jobs in their service zones, submit bids, communicate with clients after bid acceptance, complete jobs, and build a reputation through successful work.

The platform prioritizes trust, accountability, and simplicity.

---

# Technology Stack

## Mobile Application

* React Native
* Expo
* TypeScript

### Locked Versions

* React Native: 0.81.x
* Expo SDK: 55.x
* React: 19.1.x
* TypeScript: 5.9.x

---

## Admin Panel

* Next.js
* React
* TypeScript

### Locked Versions

* Next.js: 16.x
* React: 19.1.x
* TypeScript: 5.9.x

---

## Backend

* NestJS
* TypeScript

### Locked Versions

* NestJS: 11.x
* Node.js: 24 LTS
* Bun: 1.3.x (development runtime)

---

## Database

* PostgreSQL 17.x
* Prisma ORM 6.x

---

## Media Storage

* Cloudinary

Usage:

* Expert selfies
* Tazkira images
* Shop images
* Work license images
* Job images
* Job videos

---

## Chat

* Stream Chat

Requirements:

* One-to-one communication
* Message history
* Attachments
* Read status
* Notifications

Chat becomes available only after bid acceptance.

---

## Push Notifications

* Firebase Cloud Messaging (FCM)

Notifications must work when:

* App is open
* App is backgrounded
* App is closed
* Device is locked

---

## Authentication

Primary Identifier:

* Phone Number

Verification:

* WhatsApp OTP

Rules:

* One phone number = one account
* No username
* No email requirement
* No password requirement in MVP

---

# User Roles

## Homeowner

Capabilities:

* Register account
* Post jobs
* View bids
* Accept bids
* Chat with selected expert
* Confirm completion
* Submit reviews
* Report issues

---

## Expert

Capabilities:

* Register account
* Complete verification process
* Select service zones
* Receive job notifications
* Place bids
* Chat with accepted clients
* Complete jobs
* Submit reviews
* Report issues

---

## Admin

Capabilities:

* Verify experts
* Suspend users
* Review disputes
* Manage credits
* View analytics
* View jobs
* View bids
* View reports
* Monitor platform activity

---

# Expert Verification

Required:

* Full name
* Phone number
* Selfie photo
* Tazkira front image
* Tazkira back image

Optional:

* Shop name
* Shop image
* Work license image

Verification Status:

* Pending
* Verified
* Rejected

Verification is reviewed manually by admins.

---

# Location System

Zone-based matching.

Examples:

* Karte Seh
* Khair Khana
* Shahr-e-Naw
* Macroyan

Rules:

* Experts choose service zones
* Jobs belong to zones
* Notifications are sent only to experts serving that zone

---

# Credit System

Purpose:
Prevent bid spam and create a sustainable business model.

Rules:

* 1 Bid = 1 Credit

Welcome Credits:

* Granted to newly approved experts
* Configurable from admin panel
* Expire after configurable period

Purchased Credits:

* Never expire

Refund Rule:

If homeowner accepts an expert's bid and then cancels the job before completion:

* Selected expert receives bid credit refund

Credit transactions must be tracked in a ledger.

---

# Job Lifecycle

## States

DRAFT

OPEN

ASSIGNED

EN_ROUTE

ARRIVED

IN_PROGRESS

COMPLETION_REQUESTED

COMPLETED

Alternative States:

CANCELLED

DISPUTED

---

# Job Posting

Required Fields:

* Title
* Description
* Category
* Urgency
* Zone
* Address
* At least one image or detailed description

Optional Fields:

* Video
* Additional notes

---

# Categories

Initial Categories:

* Plumbing
* Electrical
* Carpentry
* Painting
* Appliance Repair
* Cleaning
* Construction
* Other

Categories must be configurable.

---

# Urgency Types

Emergency

Today

Scheduled Date

---

# Bidding System

Bid Fields:

* Price
* Estimated Arrival Time
* Estimated Job Duration
* Warranty
* Expert Message

Rules:

* Experts spend one credit per bid
* Experts can update or withdraw bids until acceptance
* Homeowner can accept only one bid

---

# Communication Rules

Before Bid Acceptance:

* No chat
* No phone number visibility

After Bid Acceptance:

* Chat unlocked
* Contact details visible

---

# Job Completion

Workflow:

1. Expert marks job as completed
2. Completion request sent
3. Homeowner reviews work
4. Homeowner confirms completion
5. Job status becomes COMPLETED

Completion requires homeowner confirmation.

---

# Ratings & Reviews

Only completed jobs can be reviewed.

Expert Metrics:

* Rating
* Completed jobs
* Completion rate
* No-show count
* Positive points
* Negative points

Customer Metrics:

* Jobs posted
* Jobs completed
* Positive points
* Negative points

---

# No-Show Policy

Expert No-Show Threshold:

Estimated Arrival Time
+
2 Hour Grace Period

After threshold:

* No-show count +1

Admins may adjust positive or negative points after investigation.

---

# Cancellation Rules

Customer Cancellation:

* Recorded
* Reason stored

If accepted expert exists:

* Credit refunded to selected expert

---

# Disputes

Dispute Reasons:

* Price dispute
* Work quality
* No-show
* Communication issue
* Other

Admins can review:

* Job details
* Bid details
* Chat history
* Uploaded media
* Timeline

Admins determine outcome.

---

# Warranty

Warranty is provided by the expert.

Platform responsibilities:

* Record warranty information
* Display warranty information
* Assist with dispute tracking

Platform does not become legally responsible for warranty fulfillment.

---

# Notifications

Examples:

* New job posted
* New bid received
* Bid accepted
* New message
* Expert en route
* Expert arrived
* Completion requested
* Job completed
* Review requested

Notification records must be stored in the database.

FCM is only the delivery mechanism.

---

# Admin Panel

Dashboard Metrics:

* Total users
* Active users
* Verified experts
* Open jobs
* Assigned jobs
* Completed jobs
* Cancelled jobs
* Disputed jobs
* Credit sales

Management Sections:

* Users
* Experts
* Verification Queue
* Jobs
* Bids
* Reviews
* Disputes
* Notifications
* Credit Ledger
* Reports
* Zones
* Categories

---

# Platform Disclaimer

Fixr connects homeowners with independent experts.

Fixr is not responsible for:

* Expert warranties
* Property damage
* Emergency response services
* Professional licensing compliance

Users remain responsible for evaluating whether a situation requires emergency services or specialized professional assistance.

---

# UI Design

UI references will be provided separately.

Claude Code should:

* Follow provided design references closely
* Prioritize simplicity
* Prioritize readability
* Prioritize trust indicators
* Prioritize clear status visibility
* Prioritize mobile-first design

Trust indicators should be visible throughout the application, including:

* Verification badges
* Ratings
* Completed jobs
* Completion rate
* No-show count
* Positive points
* Negative points

Status changes should always be visually obvious.
