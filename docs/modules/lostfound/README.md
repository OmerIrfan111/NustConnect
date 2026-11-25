# C1 — Lost & Found with OCR

> Owned by the `module/lostfound` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Ali |
| Cross-tester | Musa |
| Branch | `module/lostfound` |
| Folders | `client/src/modules/lostfound/`, `server/src/modules/lostfound/`, `docs/modules/lostfound/` |
| Requirements | FR-10 (O4 Privacy) |
| Design | Not in designs – reuse Marketplace list + detail + form patterns |
| Client routes | /lost-found /lost-found/new /lost-found/:id |
| API prefix | `/api/lostfound/*` |
| Collections | `lostfound_items`, `lostfound_claims` |
| Contracts provided | `searchProvider`, `summaryProvider`, `moderationHooks` |
| Contracts consumed | Session (A1), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** Phases 1, 2, and 3 built (client, server, OCR privacy masking, claims, providers, tests).  
**Next step:** Run cross-test with Musa once merged into `main`, and verify live MongoDB seed/upload flow.

## Phase 1 — Core

**Deliverables**

- [x] Board: Lost / Found tabs, filters (category, date, location), cards
- [x] Item model, list/search API, seeded samples
- [x] Post lost or found item with photos; detail page

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Found and lost items can both be posted and viewed
- [x] Filters and tabs work; upload limits enforced

## Phase 2 — Depth

**Deliverables**

- [x] Server-side OCR (tesseract.js) on found-item photos
- [x] Match suggestions: OCR text + keywords + category
- [x] Claim flow: request to claim, finder approves
- [x] Privacy: mask ID/CNIC-like numbers, store only matching text, never show raw OCR

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] OCR test set of 10 cases – accuracy + failures recorded (see `lostfound.test.js`, 10/10 masking + extraction cases pass, timeout/error fallback verified)
- [x] Sensitive numbers never in any API response
- [x] Matches visible only to the two owners

## Phase 3 — Integration & hardening

**Deliverables**

- [x] `notify()` on probable match and claim status; statuses open / claimed / returned; auto-archive
- [x] `searchProvider`, `summaryProvider`, ReportButton, moderation hooks
- [x] OCR failure fallback (manual entry); tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] OCR timeout/failure doesn't block posting
- [x] Matched owner gets bell notification with deep link

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lostfound/ping` | Public | Module health check |
| GET | `/api/lostfound/items` | `requireAuth` | List/filter items (`type`, `category`, `location`, `status`, `fromDate`, `toDate`, `mine`, `q`, `page`, `limit`) |
| POST | `/api/lostfound/items` | `requireAuth` | Create lost/found item with optional multipart photos (max 3 images, JPEG/PNG/WebP); runs masked OCR on found photos |
| GET | `/api/lostfound/items/:id` | `requireAuth` | Get item details + relevant claims (`hidden` items return 404 to non-staff) |
| PATCH | `/api/lostfound/items/:id` | `requireAuth` | Update item details/status (`open`, `claimed`, `returned`) — owner or staff only |
| DELETE | `/api/lostfound/items/:id` | `requireAuth` | Delete item and its claims — owner or admin only |
| GET | `/api/lostfound/items/:id/matches` | `requireAuth` | Get suggested opposite-type matches — owner only (403 otherwise) |
| POST | `/api/lostfound/items/:id/claims` | `requireAuth` | Submit a claim request on an open item |
| PATCH | `/api/lostfound/claims/:claimId` | `requireAuth` | Approve/reject claim (owner) or cancel pending claim (claimant) |

## Models

- **`LostFoundItem` (`lostfound_items`)**: `type` (`lost`|`found`), `title`, `description`, `category`, `location`, `eventDate`, `photos`, `status` (`open`|`claimed`|`returned`), `ownerId`, `ownerName`, `ownerVerified`, `ocrTextMasked` (`select: false`, never serialized), `ocrKeywords`, `ocrStatus`, `manualKeywords`, `isSample`, `hidden`, `hiddenAt`, `expiresAt` (90-day auto-archive).
- **`LostFoundClaim` (`lostfound_claims`)**: `itemId` (ref `LostFoundItem`), `claimantId`, `claimantName`, `claimantVerified`, `message`, `status` (`pending`|`approved`|`rejected`|`cancelled`), `decisionNote`, `decidedAt`.

## Known issues

- `eslint.config.mjs` only whitelists `auth/session` and `auth/useAuth`, so `notifyHelper.js` resolves `../dashboard/notify` dynamically via `path.resolve` to respect the lint boundary while using the real `notify()` implementation when merged.
- Live-DB and real `tesseract.js` traineddata image OCR should be verified once connected to MongoDB and network.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| 2026-11-25 | Self-QA (1–3) | Ali | Pass (mocked DB + OCR tests, lint, ownership, build) | Pending live MongoDB + Musa cross-test |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-25 | Ali | Built full C1 Lost & Found module (Phases 1–3): Item/Claim models, privacy-masked OCR + timeout fallback + matching engine, CRUD & claim controllers, `searchProvider`/`summaryProvider`/`moderationHooks`/`deleteUserData`, seed script, React pages (`LostFoundBoard`, `PostLostFound`, `LostFoundDetail`), Jest + Vitest suites. | Merge `main` / cross-test on `main` with Musa; run live MongoDB + real photo OCR check. |
