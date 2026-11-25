# C2 — Complaint Tracker, Help Box & FAQ Wiki

> Owned by the `module/support` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Ali |
| Cross-tester | Musa |
| Branch | `module/support` |
| Folders | `client/src/modules/support/`, `server/src/modules/support/`, `docs/modules/support/` |
| Requirements | FR-6, FR-12 (O4 Privacy) |
| Design | Student Support card (landing / dashboard); forms + status timeline from the design system |
| Client routes | /complaints /complaints/new /complaints/:id /help-box /faq /faq/:id · admin: /admin/support |
| API prefix | `/api/support/*` |
| Collections | `support_complaints`, `support_complaint_history`, `support_helpbox`, `support_faq` |
| Contracts provided | `searchProvider` (FAQ only), `summaryProvider` (resolution stats), `moderationHooks`, staff complaint screen via `adminRoutes` |
| Contracts consumed | Session (A1, roles), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** Phases 1, 2, and 3 built (complaints workflow + history, zero-identity anonymous Help Box + in-memory rate limiter, public FAQ/wiki, admin queue, tests).  
**Next step:** Merge with `main` and cross-test with Musa; verify against live MongoDB.

## Phase 1 — Core

**Deliverables**

- [x] Complaint submit (category, description, photo, location) + "My complaints" with status timeline
- [x] Help Box: anonymous form – **no user id stored**
- [x] FAQ/wiki: categorised browse + search (public)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Complaint appears in owner's tracker as Submitted
- [x] DB check: help-box docs contain no user reference
- [x] FAQ search returns matching articles

## Phase 2 — Depth

**Deliverables**

- [x] Status workflow submitted → under review → assigned → in progress → resolved → reopened; history with actor + time
- [x] Staff complaint management via `adminRoutes` (`/admin/support`, role-gated)
- [x] Moderators answer help-box questions and publish as FAQ; FAQ editor

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Only owner + staff read a complaint; others 403
- [x] Invalid status transitions rejected
- [x] Anonymous answer flow never reveals asker

## Phase 3 — Integration & hardening

**Deliverables**

- [x] `notify()` on every complaint status change
- [x] Help-box rate limiting without storing identity (IP held in memory only as ephemeral HMAC key)
- [x] `summaryProvider` (7d complaint progression % + per-user summary), `searchProvider` (FAQ only), ReportButton, tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Privacy test script: no endpoint joins help-box data with accounts
- [x] Complaint notification deep link opens the right complaint

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/support/ping` | Public | Health check |
| GET | `/api/support/complaints` | `requireAuth` | List owner complaints (or all complaints with `?scope=staff` for moderator/admin) |
| POST | `/api/support/complaints` | `requireAuth` | Submit complaint with optional photo upload (JPEG/PNG/WebP, max 5 MB) |
| GET | `/api/support/complaints/:id` | `requireAuth` | Read complaint + timeline (owner or staff only, 403 otherwise) |
| PATCH | `/api/support/complaints/:id/status` | `requireAuth` | Transition complaint status (staff transitions, owner reopen when resolved) + `notify()` |
| POST | `/api/support/helpbox` | Public | Submit anonymous question (no user ID or IP stored; in-memory rate limit) |
| GET | `/api/support/helpbox/answered` | Public | List answered help-box Q&As |
| GET | `/api/support/helpbox` | `requireRole('moderator')` | Staff help-box moderation queue |
| POST | `/api/support/helpbox/:id/answer` | `requireRole('moderator')` | Answer question and optionally publish as FAQ article |
| POST | `/api/support/helpbox/:id/dismiss` | `requireRole('moderator')` | Dismiss help-box entry |
| GET | `/api/support/faq` | `optionalAuth` | Public browse & search FAQ/Wiki (`category`, `q`) |
| GET | `/api/support/faq/:id` | `optionalAuth` | Public FAQ article view (404 if hidden for non-staff) |
| POST | `/api/support/faq` | `requireRole('moderator')` | Create FAQ article |
| PATCH | `/api/support/faq/:id` | `requireRole('moderator')` | Update FAQ article |
| DELETE | `/api/support/faq/:id` | `requireRole('moderator')` | Delete FAQ article |

## Models

- **`SupportComplaint` (`support_complaints`)**: `ownerId`, `ownerName`, `category`, `title`, `description`, `location`, `photo`, `status`, `assignedTo`, `isSample`.
- **`SupportComplaintHistory` (`support_complaint_history`)**: `complaintId`, `fromStatus`, `toStatus`, `actorId`, `actorName`, `actorRole`, `note`.
- **`SupportHelpBox` (`support_helpbox`)**: `strict: 'throw'` schema with ONLY `category`, `question`, `status`, `answer`, `answeredByRole`, `answeredAt`, `publishedFaqId`, `isSample`. Zero identity fields.
- **`SupportFaq` (`support_faq`)**: `title`, `category`, `body`, `tags`, `hidden`, `hiddenAt`, `isSample`.

## Known issues

- `notifyHelper.js` resolves `../dashboard/notify` dynamically via `path.resolve` to satisfy the ESLint import boundary.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| 2026-11-25 | Self-QA (1–3) | Ali | Pass (mocked DB tests, privacy tests, lint, ownership, build) | Pending live MongoDB + Musa cross-test |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-25 | Ali | Built full C2 Support module (Phases 1–3): Complaint tracker + history timeline + status state machine + `notify()`, zero-identity Help Box + in-memory rate limit + FAQ publishing, public FAQ/wiki, `/admin/support` staff queue, `searchProvider` (FAQ-only)/`summaryProvider`/`moderationHooks`/`deleteUserData`, seed script, Jest + Vitest suites. | Merge with `main` and cross-test with Musa; verify against live MongoDB. |
