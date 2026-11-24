# A3 — Admin, Moderation & Donations

> Owned by the `module/admin` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Omer |
| Cross-tester | Ali |
| Branch | `module/admin` |
| Folders | `client/src/modules/admin/`, `server/src/modules/admin/`, `docs/modules/admin/` |
| Requirements | FR-16, FR-17, FR-13 (O4) |
| Design | Not in designs – sidebar shell + tables/cards from the design system |
| Client routes | /admin/* /donations /donations/:id |
| API prefix | `/api/admin/*` |
| Collections | `admin_reports`, `admin_audit`, `admin_categories`, `admin_campaigns`, `admin_contributions` |
| Contracts provided | `POST /api/admin/reports` (behind core ReportButton), admin layout rendering every module's `adminRoutes` |
| Contracts consumed | `moderationHooks` from every content module; user lookup + warn/suspend (A1); `summaryProvider`s for analytics |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** 1 (Core) built, awaiting live-DB QA and a visual check at 1440/768/375. Branch cut from local `base/server` + `origin/base/client` (no `v0.1-base` tag yet); re-merge `main` once it exists.  
**Next step:** QA-1, then Phase 2 (moderation actions via `moderationHooks`, audit log, categories, contributions).

## Phase 1 — Core

**Deliverables**

- [x] Admin layout under /admin/*, role-gated; sidebar renders all modules' `adminRoutes`
- [x] `POST /api/admin/reports` + Report model; moderation queue
- [x] User management list (read-only, lookup contract)
- [x] Donations: campaign model, admin create/edit, student list + detail with progress bar

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Non-admin on /admin/* is redirected/403 (UI and API)
- [ ] Report from any ReportButton shows in queue
- [x] Progress bar correct at 0 %, 50 %, 100 %

## Phase 2 — Depth

**Deliverables**

- [ ] Hide / restore via `moderationHooks`; warn / suspend via auth; audit log for every action
- [ ] Category management (modules fall back to defaults if empty)
- [ ] Donation contribution records (pledges, no gateway) + campaign updates feed

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Hide removes content for students, not moderators; restore reverses
- [ ] Audit entry with actor + time for each action
- [ ] Contribution totals = sum of records

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Analytics page from `summaryProvider`s (no personal data)
- [ ] Complaint management reachable via support module's `adminRoutes`
- [ ] Pagination, search, filters on queue and users; tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Moderator vs admin permission matrix verified
- [ ] Analytics shows data from all modules on main
- [ ] No admin screen leaks anonymous help-box data

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/admin/reports | session | Contract �6. `{ targetType, targetId, reason?, details? }` -> 202 `{ accepted, id }`. Same reporter + target while open returns the existing report (`duplicate: true`) |
| GET | /api/admin/reports?status=open\|resolved\|dismissed\|all&page&limit | moderator, admin | Moderation queue, newest first |
| GET | /api/admin/campaigns | session | Students: active + closed. Admins: also drafts |
| GET | /api/admin/campaigns/:id | session | Drafts are 404 for non-admins |
| POST | /api/admin/campaigns | admin | Create (title, description, goalAmount, raisedAmount, status, deadline) |
| PUT | /api/admin/campaigns/:id | admin | Partial update |

## Models

**`admin_reports`** (`models/Report.js`): `targetType, targetId, reason, details, reporterId, status (open|resolved|dismissed), timestamps`.

**`admin_campaigns`** (`models/Campaign.js`): `title, description, goalAmount, raisedAmount, deadline, status (draft|active|closed), createdBy, sample, timestamps`. `progress` is computed (`progress.js`, clamped 0..100). In Phase 1 `raisedAmount` is set by the admin; Phase 2 derives it from `admin_contributions`.

Seed: `npm run seed -- admin` loads 3 campaigns flagged `sample` (0 %, 50 %, 100 %).

`admin_audit`, `admin_categories` and `admin_contributions` are Phase 2.

## Known issues

- Core test `client/src/core/router/routes.test.jsx` has 3 cases that look for the placeholder text ("lets admins into admin routes and shows the Admin nav item", sidebar items "Donations" and "Admin"). They fail now that the pages are real. Needs a `core-change`.
- The moderation queue is read-only until Phase 2 (hide / restore / warn / audit).
- The user list is a name search through the lookup contract (id, name, verified), not a full listing, because the contract never returns more.
- Role checks use the session contract. With the base stub, the role comes from `VITE_DEV_FAKE_ROLE`.
- API tests use mocked models, not yet run against a real MongoDB.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| | | | | |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-24 | Omer + Claude | Phase 1 built: Report + Campaign models, report intake (202, de-duplicated), moderation queue API, campaign CRUD with role checks (drafts hidden from students), seed, admin layout slot with a tab bar built from every module's `adminRoutes`, Overview, Moderation, Users (lookup contract), campaign admin list + form, student Donations list + detail with progress bar. 12 API + 18 UI tests. | Live-DB QA-1 and responsive check. Core-change issue for 3 placeholder tests. Then Phase 2. |
