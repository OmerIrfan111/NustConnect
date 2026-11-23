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

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/admin` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Admin layout under /admin/*, role-gated; sidebar renders all modules' `adminRoutes`
- [ ] `POST /api/admin/reports` + Report model; moderation queue
- [ ] User management list (read-only, lookup contract)
- [ ] Donations: campaign model, admin create/edit, student list + detail with progress bar

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Non-admin on /admin/* is redirected/403 (UI and API)
- [ ] Report from any ReportButton shows in queue
- [ ] Progress bar correct at 0 %, 50 %, 100 %

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
