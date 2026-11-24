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
**Next step:** QA-1, then Phase 2 (search aggregation, summary providers). The Notifications page already has the all/unread filter and deep links.

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
| GET | /api/dashboard/notifications?filter=all\|unread&page&limit | session | Own notifications, newest first, with `total` and `unread` |
| GET | /api/dashboard/notifications/unread-count | session | `{ unread }` |
| POST | /api/dashboard/notifications/read-all | session | Marks all own as read |
| POST | /api/dashboard/notifications/:id/read | session | 404 for someone else's id |

`notify(userId, { type, title, body, link })` (`server/src/modules/dashboard/notify.js`): never throws, drops non-`/` links.

## Models

**`dashboard_notifications`** (`models/Notification.js`): `userId (String, indexed), type, title, body, link, read, timestamps`. Index `{ userId, read, createdAt:-1 }`. `userId` is a string because the dev fake user has no DB record.

## Known issues

- Core test `client/src/core/router/routes.test.jsx` has 2 cases ("sidebar item Dashboard / Notifications opens the dashboard placeholder") that look for the placeholder text, so they fail now that the pages are real. Needs a `core-change`.
- Dashboard stats, activity and opportunities are sample data (labelled) until Phase 2 summary providers.
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
