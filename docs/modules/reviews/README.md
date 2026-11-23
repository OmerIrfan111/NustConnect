# B3 — Review Hub & Opportunities

> Owned by the `module/reviews` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Musa |
| Cross-tester | Omer |
| Branch | `module/reviews` |
| Folders | `client/src/modules/reviews/`, `server/src/modules/reviews/`, `docs/modules/reviews/` |
| Requirements | FR-4, FR-5 |
| Design | WF-05 (`docs/design/wireframes/WF-05.png`); prototype screens `reviews`, `write` (Write Review), `reviewok` (Confirmation); Opportunities dashboard widget |
| Client routes | /reviews /reviews/:id /reviews/new /reviews/confirmation /opportunities /alumni |
| API prefix | `/api/reviews/*` |
| Collections | `reviews_entities`, `reviews_reviews`, `reviews_opportunities`, `reviews_mentorship` |
| Contracts provided | `searchProvider`, `summaryProvider` (Saved Reviews, Recommended opportunities), `moderationHooks` |
| Contracts consumed | Session (A1, roles incl. alumni), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/reviews` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Review Hub per WF-05: tabs (Teachers, Cafes, Hostels, Mess, Schools), filter bar (search, category, rating, department), review cards, "Popular on campus" panel
- [ ] Entity + Review models, list/search API, seeded sample data
- [ ] Write a Review form → Review Confirmation

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Journey 3b: Dashboard → Review Hub → Write Review → Confirmation
- [ ] Tabs and filters combine; stars handle 0–5 and halves

## Phase 2 — Depth

**Deliverables**

- [ ] Aggregated rating per entity, entity detail page, compare two entities
- [ ] One review per user per entity; edit/delete own; helpful votes
- [ ] Opportunities board: list, post, filter (internship / job / referral), deadlines

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Second review by same user blocked / edit-only
- [ ] Average recalculates after add/edit/delete
- [ ] Past-deadline opportunities marked closed

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Alumni directory and mentorship requests
- [ ] `searchProvider`, `summaryProvider`, `notify()`, ReportButton, moderation hooks
- [ ] Anonymous-style display (name hidden, Verified Student badge); tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Reviewer identity not exposed in API to other students
- [ ] Dashboard recommended-opportunities widget shows real data
- [ ] Phase 1 journey regression passes

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
