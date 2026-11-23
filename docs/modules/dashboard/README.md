# A2 — Dashboard, Notifications & Global Search

> Owned by the `module/dashboard` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Omer |
| Cross-tester | Ali |
| Branch | `module/dashboard` |
| Folders | `client/src/modules/dashboard/`, `server/src/modules/dashboard/`, `docs/modules/dashboard/` |
| Requirements | FR-15 (O3 three clicks) |
| Design | WF-02 (`docs/design/wireframes/WF-02.png`) + prototype `dashboard` screen; notifications page; search results page |
| Client routes | /dashboard /notifications /search |
| API prefix | `/api/dashboard/*` |
| Collections | `dashboard_notifications` |
| Contracts provided | `notify()` (`server/src/modules/dashboard/notify.js`), search aggregator, summary aggregator, top-bar NotificationBell + GlobalSearchBar slots |
| Contracts consumed | Every module's `searchProvider` / `summaryProvider`; session (A1) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/dashboard` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Dashboard per WF-02: greeting, 4 stat cards (Active Rides, Marketplace Listings, Saved Reviews, Upcoming Events), Quick access, Recent activity, Recommended opportunities – sample JSON
- [ ] Notification model + API (list, mark read, mark all read)
- [ ] Real `notify(userId, payload)` replacing base stub
- [ ] Top-bar slots: NotificationBell (badge) and GlobalSearchBar

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Dashboard matches wireframe at 1440 / 768 / 375; sample data labelled
- [ ] `notify()` from a test script shows in the bell
- [ ] Sidebar highlights Dashboard; no console errors

## Phase 2 — Depth

**Deliverables**

- [ ] Notifications page with all/unread filter and deep links
- [ ] Global search aggregating every `searchProvider`, grouped by module, type filter
- [ ] Stats + Recent activity from each `summaryProvider` (fallback to sample)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Search skips modules without a provider (no crash)
- [ ] Search < 2 s with seeded data
- [ ] Unread count correct after mark-read

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Bell polling (or SSE); email digest for important events
- [ ] Recommended opportunities and Saved Reviews from reviews providers
- [ ] Empty / loading / error states per widget; notification pagination; API tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] All 9 modules appear in search and summaries
- [ ] Accessibility pass (keyboard, contrast, labels)
- [ ] Lighthouse performance ≥ 80 on mobile

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
