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

**Phase:** 1 (Core) built, awaiting live-DB QA and visual check at 1440/768/375. Branch cut from local `base/server` + `origin/base/client` (no `v0.1-base` tag yet); re-merge `main` once it exists.  
**Phase 2 (Depth) is built.** **Next step:** QA-1 and QA-2 against a real MongoDB with real modules, then Phase 3 (polling bell, email digest, reviews providers, accessibility, Lighthouse).

## Phase 1 — Core

**Deliverables**

- [x] Dashboard per WF-02: greeting, 4 stat cards (Active Rides, Marketplace Listings, Saved Reviews, Upcoming Events), Quick access, Recent activity, Recommended opportunities – sample JSON
- [x] Notification model + API (list, mark read, mark all read)
- [x] Real `notify(userId, payload)` replacing base stub
- [x] Top-bar slots: NotificationBell (badge) and GlobalSearchBar

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Dashboard matches wireframe at 1440 / 768 / 375; sample data labelled
- [ ] `notify()` from a test script shows in the bell
- [ ] Sidebar highlights Dashboard; no console errors

## Phase 2 — Depth

**Deliverables**

- [x] Notifications page with all/unread filter and deep links
- [x] Global search aggregating every `searchProvider`, grouped by module, type filter
- [x] Stats + Recent activity from each `summaryProvider` (fallback to sample)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Search skips modules without a provider (no crash)
- [x] Search < 2 s with seeded data
- [x] Unread count correct after mark-read

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
| GET | /api/dashboard/notifications?filter=all\|unread&page&limit | session | Own notifications, newest first, with `total` and `unread` |
| GET | /api/dashboard/notifications/unread-count | session | `{ unread }` |
| POST | /api/dashboard/notifications/read-all | session | Marks all own as read |
| POST | /api/dashboard/notifications/:id/read | session | 404 for someone else's id |

Aggregation lives in `aggregate.js`. A module with no provider, a provider that throws, or one slower than the timeout is skipped (listed in `skipped`), so one broken module never breaks search or the dashboard.

`notify(userId, { type, title, body, link })` (`server/src/modules/dashboard/notify.js`): never throws, drops non-`/` links.
| GET | /api/dashboard/search?q=&type=&limit= | verified | Aggregates every module's `searchProvider` in parallel. `{ q, groups: [{ module, results }], types, total, skipped }`. q needs 2+ chars. 1.5 s per-provider timeout. Result URLs must be same-site paths |
| GET | /api/dashboard/summary | verified | Aggregates every module's `summaryProvider(userId)`: `{ stats, recent (newest first, max 8), skipped }` |

## Models

**`dashboard_notifications`** (`models/Notification.js`): `userId (String, indexed), type, title, body, link, read, timestamps`. Index `{ userId, read, createdAt:-1 }`. `userId` is a string because the dev fake user has no DB record.

## Known issues

- The core route tests now render the real dashboard and bell, which call the API; with no server running jsdom prints harmless network errors. Cosmetic (a shared `client/src/test/setup.js` stub would silence it, a core-change).
- Stats and recent activity are live once modules export `summaryProvider`; until then they are labelled sample data. Recommended opportunities stay sample until the reviews provider (Phase 3).
- Bell loads on mount and on open; polling is Phase 3.
- API tests use a mocked model, not yet run against a real MongoDB.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| | | | | |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-24 | Omer + Claude | Phase 1 built: Notification model, list / unread-count / mark-read / read-all API, real `notify()`, Dashboard page (WF-02, sample data labelled), NotificationBell and GlobalSearchBar top-bar slots, Notifications page with filter + pagination. 7 API + 8 UI tests. | Live-DB QA-1 and responsive check. Core-change issue for the 2 placeholder tests. Then Phase 2 (`/search` page, aggregators). |
| 2026-11-24 | Omer + Claude | Phase 2 built: search aggregator (parallel, isolated, timeout, URL sanitising, type filter), summary aggregator, `/search` page with grouped results, type chips and retry, Dashboard stats + recent activity driven by summaries with labelled sample fallback. 12 API + 9 UI tests. | QA-2 with real providers once the other modules land. Phase 3. |
