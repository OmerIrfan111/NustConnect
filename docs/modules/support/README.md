# C2 — Complaint Tracker, Help Box & FAQ Wiki

> Owned by the `module/support` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Ali |
| Cross-tester | Musa |
| Branch | `module/support` |
| Folders | `client/src/modules/support/`, `server/src/modules/support/`, `docs/modules/support/` |
| Requirements | FR-6, FR-12 (O4 Privacy) |
| Design | Student Support card (landing / dashboard); forms + status timeline from the design system |
| Client routes | /complaints /complaints/new /complaints/:id /help-box /faq /faq/:id |
| API prefix | `/api/support/*` |
| Collections | `support_complaints`, `support_complaint_history`, `support_helpbox`, `support_faq` |
| Contracts provided | `searchProvider` (FAQ only), `summaryProvider` (resolution stats), `moderationHooks`, staff complaint screen via `adminRoutes` |
| Contracts consumed | Session (A1, roles), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/support` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Complaint submit (category, description, photo, location) + "My complaints" with status timeline
- [ ] Help Box: anonymous form – **no user id stored**
- [ ] FAQ/wiki: categorised browse + search (public)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Complaint appears in owner's tracker as Submitted
- [ ] DB check: help-box docs contain no user reference
- [ ] FAQ search returns matching articles

## Phase 2 — Depth

**Deliverables**

- [ ] Status workflow submitted → under review → assigned → in progress → resolved → reopened; history with actor + time
- [ ] Staff complaint management via `adminRoutes` (role-gated)
- [ ] Moderators answer help-box questions and publish as FAQ; FAQ editor

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Only owner + staff read a complaint; others 403
- [ ] Invalid status transitions rejected
- [ ] Anonymous answer flow never reveals asker

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] `notify()` on every complaint status change
- [ ] Help-box rate limiting without storing identity (IP in memory only)
- [ ] `summaryProvider` (target 70 % past submitted in 7 days), `searchProvider` (FAQ), ReportButton, tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Privacy test script: no endpoint joins help-box data with accounts
- [ ] Complaint notification deep link opens the right complaint

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
