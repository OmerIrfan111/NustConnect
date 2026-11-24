# <ID> — <Module name>

> Owned by the `module/<slug>` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.
> Copy this template to `docs/modules/<slug>/README.md` and fill in the `<...>` parts.

| | |
|-|-|
| Owner | <name> |
| Cross-tester | <name> (Omer tests Musa, Musa tests Ali, Ali tests Omer) |
| Branch | `module/<slug>` |
| Folders | `client/src/modules/<slug>/`, `server/src/modules/<slug>/`, `docs/modules/<slug>/` |
| Requirements | <FR-x, NFRs> |
| Design | <wireframe / hi-fi / prototype screens, or "follow the design system"> |
| Client routes | <paths> |
| API prefix | `/api/<slug>/*` |
| Collections | `<slug>_...` (always prefixed with the slug) |
| Contracts provided | <searchProvider, summaryProvider, moderationHooks, notify use, ...> |
| Contracts consumed | <what you call, through the registry or by route path> |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`. Registry contracts: `CLAUDE.md` section 7.

## Current state

**Phase:** <not started | 1 | 2 | 3>
**Next step:** <one line>

## Phase 1 — Core

**Deliverables**

- [ ] <copy from PROJECT_PLAN.md>

**QA gate (plus the standard checklist in PROJECT_PLAN section 5.1)**

- [ ] <copy the QA-1 bullets>

## Phase 2 — Depth

**Deliverables**

- [ ] <...>

**QA gate**

- [ ] <...>

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] <...>

**QA gate**

- [ ] <...>

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| | | | |

## Models

_Each Mongoose model: collection name, key fields, indexes._

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
