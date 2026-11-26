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
**Phases 1, 2 and 3 are built.** **Next step:** QA-1/2/3 against a real MongoDB with the real content modules merged (their hide/restore hooks, summary providers and the support module's complaint screen), then the cross-test by Ali.

## Phase 1 — Core

**Deliverables**

- [x] Admin layout under /admin/*, role-gated; sidebar renders all modules' `adminRoutes`
- [x] `POST /api/admin/reports` + Report model; moderation queue
- [x] User management list (read-only, lookup contract)
- [x] Donations: campaign model, admin create/edit, student list + detail with progress bar

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Non-admin on /admin/* is redirected/403 (UI and API)
- [x] Report from any ReportButton shows in queue
- [x] Progress bar correct at 0 %, 50 %, 100 %

## Phase 2 — Depth

**Deliverables**

- [x] Hide / restore via `moderationHooks`; warn / suspend via auth; audit log for every action
- [x] Category management (modules fall back to defaults if empty)
- [x] Donation contribution records (pledges, no gateway) + campaign updates feed

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Hide removes content for students, not moderators; restore reverses
- [x] Audit entry with actor + time for each action
- [x] Contribution totals = sum of records

## Phase 3 — Integration & hardening

**Deliverables**

- [x] Analytics page from `summaryProvider`s (no personal data)
- [x] Complaint management reachable via support module's `adminRoutes`
- [x] Pagination, search, filters on queue and users; tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Moderator vs admin permission matrix verified
- [ ] Analytics shows data from all modules on main
- [x] No admin screen leaks anonymous help-box data

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/admin/reports | session | Contract §6. `{ targetType, targetId, reason?, details? }` -> 202 `{ accepted, id }`. Same reporter + target while open returns the existing report (`duplicate: true`) |
| GET | /api/admin/reports?status=open\|resolved\|dismissed\|all&page&limit | moderator, admin | Moderation queue, newest first |
| GET | /api/admin/campaigns | session | Students: active + closed. Admins: also drafts |
| GET | /api/admin/campaigns/:id | session | Drafts are 404 for non-admins |
| POST | /api/admin/campaigns | admin | Create (title, description, goalAmount, raisedAmount, status, deadline) |
| PUT | /api/admin/campaigns/:id | admin | Partial update |
| POST | /api/admin/reports/:id/hide | moderator, admin | Calls the owning module's `moderationHooks.hide(targetId)`; report becomes resolved/hidden. 409 if no module can hide it or it is already hidden; 502 if the hook fails (nothing recorded) |
| POST | /api/admin/reports/:id/restore | moderator, admin | Reverses a hide through `moderationHooks.restore`. 409 unless the content is hidden |
| POST | /api/admin/reports/:id/dismiss | moderator, admin | Closes an open report with no change to the content |
| POST | /api/admin/users/:id/warn | moderator, admin | `{ reason }` (required). Through the auth module's `userModeration.warn` |
| POST | /api/admin/users/:id/suspend | admin | `{ reason }` (required). `userModeration.suspend`. Cannot target yourself |
| POST | /api/admin/users/:id/unsuspend | admin | `userModeration.unsuspend` |
| GET | /api/admin/categories?scope= | session | Active categories (admins get all). Empty list means the module uses its own defaults |
| POST/PUT/DELETE | /api/admin/categories[/:id] | admin | Manage categories (scope + name unique) |
| GET | /api/admin/campaigns/:id/contributions | admin | Pledge records and their total (donor names visible here only) |
| POST | /api/admin/campaigns/:id/contributions | admin | `{ amount, donorName?, anonymous?, note? }`. Campaign total is recomputed as the sum of records |
| DELETE | /api/admin/campaigns/:id/contributions/:contributionId | admin | Removes a record, total recomputed |
| POST | /api/admin/campaigns/:id/updates | admin | `{ text }` appends to the updates feed (students read it on the campaign) |
| GET | /api/admin/audit?action=&page=&limit= | admin | Newest first. No endpoint edits or deletes entries |
| GET | /api/admin/reports?...&reason=&type=&q= | moderator, admin | Search (`q` over content type, id and details; regex characters are escaped), `reason`, `type` and `status` filters, pagination. The reporter's identity is never returned |
| GET | /api/admin/analytics | admin | `{ modules: [{ module, label, value }], skipped, moduleCount, platform: { reportsOpen, reportsResolved, reportsDismissed, campaigns, campaignsActive, pledgedTotal, auditEntries } }`. Counts only |

## Models

**`admin_reports`** (`models/Report.js`): `targetType, targetId, reason, details, reporterId, status (open|resolved|dismissed), timestamps`.

**`admin_campaigns`** (`models/Campaign.js`): `title, description, goalAmount, raisedAmount, deadline, status (draft|active|closed), createdBy, sample, timestamps`. `progress` is computed (`progress.js`, clamped 0..100). In Phase 1 `raisedAmount` is set by the admin; Phase 2 derives it from `admin_contributions`.

Seed: `npm run seed -- admin` loads 3 campaigns flagged `sample` (0 %, 50 %, 100 %).

**`admin_audit`** (`models/AuditEntry.js`): `actorId, actorName, actorRole, action, targetType, targetId, reportId, note, createdAt`. Append-only.

**`admin_categories`**: `scope, name, order, active` (unique on scope + name).

**`admin_contributions`**: `campaignId, donorName, anonymous, amount, note, recordedBy, sample`.

Reports also carry `action (none|hidden|restored), note, handledBy, handledAt`. Campaigns carry an `updates` feed.

### Analytics and privacy (Phase 3)

- **Analytics** call each module's `summaryProvider(null, { scope: 'all' })`: no user, so a module answers with its platform-wide figure (for example all active rides). Only `stat.label` and `stat.value` are kept; `recent` (which may describe individual activity) is always dropped. Failing, slow (1.5 s) or missing providers are skipped and listed. Modules that return a per-user figure for `null` simply contribute nothing useful: please return the global count.
- **Complaint management** is not implemented here. The support module (C2) adds it through its own `adminRoutes` (for example `{ label: 'Complaints', path: '/admin/complaints', roles: ['admin','moderator'] }`) and the admin tab bar shows it automatically.
- **Help box:** no admin endpoint or screen reads help-box content or authors. A report about help-box content carries only `targetType` and `targetId`.
- **Reporter identity** (`reporterId`) is kept only for de-duplication and is stripped from every response, so moderators cannot see who reported.
- **Permission matrix** (tested for every route, for student, alumni, moderator, admin and anonymous): moderators read the queue, hide / restore / dismiss and warn. Admins additionally suspend / unsuspend, write categories and campaigns, record pledges and updates, and read the audit log and analytics.

### Contract for content modules (how hide / restore finds you)

A report names its content by `targetType` (for example `ride`). Admin resolves the module without importing it, from the loader's registry, in this order:

1. a module whose `moderationHooks.targetTypes` array contains the type (preferred: add `targetTypes: ['ride', 'trip']` next to your hooks),
2. a module whose slug equals the type,
3. the built-in alias table in `moderation.js` (ride/trip/meetup -> rideshare, item/listing/skillpost -> marketplace, review/entity/opportunity -> reviews, lostitem/founditem/claim -> lostfound, faq/complaint -> support, location/bill -> campus).

The module's `hide(id)` / `restore(id)` must make the item invisible to students (lists, search, direct URL) but still visible to moderators.

### Contract for the auth module

Account actions use `registry.get('auth').userModeration = { warn(userId, note), suspend(userId, note), unsuspend(userId, note) }` (each returns false when the user does not exist). Until the auth module exports it, warn / suspend answer 409 "not available yet".

## Known issues

- If the audit entry cannot be written after a hook already ran, the request fails (500) while the content stays hidden. Rare, and the report stays open so a moderator can retry.
- The user list is a name search through the lookup contract (id, name, verified), not a full listing, because the contract never returns more.
- Role checks use the session contract. With the base stub, the role comes from `VITE_DEV_FAKE_ROLE`.
- Phase 1 let an admin type the raised amount; it is now always the sum of pledge records. Existing campaign rows should be re-seeded or given pledges.
- API tests use mocked models, not yet run against a real MongoDB.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| 2026-11-24 | QA-1..3 (partial) | Omer (self) | Self-QA, API level, live server + real MongoDB: report intake and de-duplication, queue (no reporter identity), dismiss, filters, campaign progress 0 / 50 / 100 %, updates feed, categories, audit entries with actor and time, analytics, role denials. 58-check script, all pass. NOT covered: browser design at 1440/768/375, Lighthouse, screen reader, other modules' hooks and providers. | none found |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-24 | Omer + Claude | Phase 1 built: Report + Campaign models, report intake (202, de-duplicated), moderation queue API, campaign CRUD with role checks (drafts hidden from students), seed, admin layout slot with a tab bar built from every module's `adminRoutes`, Overview, Moderation, Users (lookup contract), campaign admin list + form, student Donations list + detail with progress bar. 12 API + 18 UI tests. | Live-DB QA-1 and responsive check. Core-change issue for 3 placeholder tests. Then Phase 2. |
| 2026-11-24 | Omer + Claude | Phase 2 built: hide / restore / dismiss through module hooks (resolved from the registry, no imports), warn / suspend / unsuspend through the auth `userModeration` contract, append-only audit log + page, categories (API + page), pledge records with totals always = sum, campaign updates feed, campaign manage screen, role-gated tabs. 17 new API tests, 14 new UI tests. | QA-2 with the real content modules' hooks. Phase 3: analytics, pagination/search, permission matrix. |
| 2026-11-24 | Omer + Claude | Phase 3 built: queue search / reason / type filters (regex-safe) with pagination, reporter identity stripped from all responses, analytics endpoint + page (aggregate stats only, provider isolation and timeout), verified filter on Users, full permission matrix (20 routes x 4 roles + anonymous) and privacy tests against the real models, shared `testkit.js`. 19 new API tests, 9 new UI tests. | QA-3 with all modules merged; Ali's cross-test; support module adds its complaint `adminRoutes`. |
| 2026-11-24 | Omer + Claude | Ran the real end-to-end check (58 checks, live server + MongoDB, seed runner and email digest included): all pass. Recorded as a partial self-QA row. Ticked only the QA bullets this run proves. | Browser / responsive / Lighthouse / screen-reader checks, then Ali's cross-test. |
| 2026-11-26 | Omer + Claude | Merged `main` (now includes C2 support). Fixed an integration bug found against the real support hooks: a `moderationHooks.hide/restore` that resolves `false` (no such item) was treated as success, so the report was marked hidden and audited. Now 404 with nothing recorded (2 tests). Analytics tests isolate the module registry. | Cross-test by Ali. Hide/restore with Musa's modules once they exist. |
| 2026-11-26 | Omer + Claude | "Delete my data" support: the manifest exports `deleteUserData(userId)`, which anonymises the reporter on that user's reports (2 tests). Audit entries are kept deliberately. | Cross-test by Ali. |
