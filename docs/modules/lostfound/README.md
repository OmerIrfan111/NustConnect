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

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/lostfound` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Board: Lost / Found tabs, filters (category, date, location), cards
- [ ] Item model, list/search API, seeded samples
- [ ] Post lost or found item with photos; detail page

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Found and lost items can both be posted and viewed
- [ ] Filters and tabs work; upload limits enforced

## Phase 2 — Depth

**Deliverables**

- [ ] Server-side OCR (tesseract.js) on found-item photos
- [ ] Match suggestions: OCR text + keywords + category
- [ ] Claim flow: request to claim, finder approves
- [ ] Privacy: mask ID/CNIC-like numbers, store only matching text, never show raw OCR

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] OCR test set of 10 images – accuracy + failures recorded
- [ ] Sensitive numbers never in any API response
- [ ] Matches visible only to the two owners

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] `notify()` on probable match and claim status; statuses open / claimed / returned; auto-archive
- [ ] `searchProvider`, `summaryProvider`, ReportButton, moderation hooks
- [ ] OCR failure fallback (manual entry); tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] OCR timeout/failure doesn't block posting
- [ ] Matched owner gets bell notification with deep link

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| | | | |

## Models

_Document each Mongoose model (collection name, key fields, indexes)._

## Known issues

_None yet._

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| | | | | |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| | | | |
