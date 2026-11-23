# B2 — Marketplace, FYP/ESE Hardware & SkillSwap

> Owned by the `module/marketplace` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Musa |
| Cross-tester | Omer |
| Branch | `module/marketplace` |
| Folders | `client/src/modules/marketplace/`, `server/src/modules/marketplace/`, `docs/modules/marketplace/` |
| Requirements | FR-7, FR-11 |
| Design | WF-04 (`docs/design/wireframes/WF-04.png`); prototype screens `market`, `product` (Product Details); Post an Item |
| Client routes | /marketplace /marketplace/new /marketplace/:id /skillswap |
| API prefix | `/api/marketplace/*` |
| Collections | `marketplace_items`, `marketplace_skillposts` |
| Contracts provided | `searchProvider`, `summaryProvider` (Marketplace Listings), `moderationHooks` |
| Contracts consumed | Session (A1, `verified` + contact preference), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/marketplace` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Marketplace per WF-04: search, chips (All, Electronics, Books, Hostel Essentials, FYP/ESE Hardware, Other), filters (category, price, condition, availability), 3-col product cards
- [ ] Item model, list/search API, seeded sample items
- [ ] Product Details page; Post an Item with image upload (multer, type/size limits)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Journey 3a: Dashboard → Marketplace → Product Details
- [ ] Chips and filters combine; price formatted "PKR 2,500"
- [ ] Upload rejects non-images and oversize files

## Phase 2 — Depth

**Deliverables**

- [ ] Edit, delete, mark as sold; "My listings"
- [ ] Seller profile card with verified badge + contact preference
- [ ] FYP/ESE Hardware fields: component list, project type, hardware condition
- [ ] Auto-archive stale listings

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Only seller can edit/mark sold; Sold badge, dropped from default results
- [ ] Contact info respects seller's privacy preference

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] SkillSwap & Team Finder: offer / request posts, search by skill, contact flow
- [ ] `searchProvider`, `summaryProvider`, `notify()` on interest, ReportButton, moderation hooks
- [ ] Image compression + lazy loading; tests

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] < 3 s on throttled mobile with 50+ listings
- [ ] SkillSwap posts in global search
- [ ] Moderator-hidden items unreachable by URL for students

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
