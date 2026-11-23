# C3 — Campus Map & Guide + Bill Splitting

> Owned by the `module/campus` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Ali |
| Cross-tester | Musa |
| Branch | `module/campus` |
| Folders | `client/src/modules/campus/`, `server/src/modules/campus/`, `docs/modules/campus/` |
| Requirements | FR-8, FR-14 |
| Design | Campus Map card (landing / dashboard); Bill Splitting not in designs – follow the design system |
| Client routes | /map /guide /bills /bills/new /bills/:id |
| API prefix | `/api/campus/*` |
| Collections | `campus_locations`, `campus_guides`, `campus_bills` |
| Contracts provided | `GET /api/campus/locations` contract, `searchProvider` (locations, guide), `summaryProvider`, `moderationHooks` |
| Contracts consumed | Session (A1), user lookup (A1), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/campus` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Leaflet campus map with seeded NUST H-12 locations, searchable list, category filter – public
- [ ] Freshie Guide: static articles page
- [ ] Bill Splitting: create bill (title, total), add participants via lookup contract

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Tile failure shows fallback list
- [ ] Guest can open /map and /guide without login
- [ ] Bill with 3 participants saved and viewable

## Phase 2 — Depth

**Deliverables**

- [ ] Split methods: equal, by item, custom; record payments; balances; settle-up view
- [ ] `GET /api/campus/locations` (read-only contract)
- [ ] Directions deep-link per location

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Splits sum exactly to the bill (rounding tested)
- [ ] Only participants see a bill; only creator edits

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Linked from trips by path (`/bills/:id`); `notify()` on creation, payment, deadline
- [ ] `searchProvider`, `summaryProvider`, ReportButton; mobile polish; tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Money math unit tests pass (equal, item, custom, rounding)
- [ ] Bill notifications reach every participant

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
