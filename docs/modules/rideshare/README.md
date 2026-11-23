# B1 — RideShare & Trip / Meetup Organizer

> Owned by the `module/rideshare` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Musa |
| Cross-tester | Omer |
| Branch | `module/rideshare` |
| Folders | `client/src/modules/rideshare/`, `server/src/modules/rideshare/`, `docs/modules/rideshare/` |
| Requirements | FR-3, FR-9 |
| Design | WF-03 (`docs/design/wireframes/WF-03.png`); prototype screens `rides`, `ride` (Ride Details), `rideok` (Request Confirmation); Post a Ride |
| Client routes | /rides /rides/new /rides/:id /rides/:id/confirmation /trips /trips/:id |
| API prefix | `/api/rideshare/*` |
| Collections | `rideshare_rides`, `rideshare_requests`, `rideshare_trips` |
| Contracts provided | `searchProvider`, `summaryProvider` (Active Rides, Upcoming Events), `moderationHooks` |
| Contracts consumed | Session (A1), `notify()` (A2), campus locations (C3, free-text fallback), ReportButton (A3); links to `/bills/:id` by path |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/rideshare` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Find a Ride per WF-03: search (From, Destination, Date, Passengers), filters (departure time, price, seats, pickup), "N rides available" list, ride cards with verified badge
- [ ] Ride model, list/search API, seeded sample rides
- [ ] Ride Details page; "Request seat" → Request Confirmation
- [ ] Post a Ride form with validation

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Journey 2: Dashboard → RideShare → Details → Confirmation
- [ ] Search + filters narrow results; empty state on no match
- [ ] Card shows seats, price per passenger, Full badge at 0 seats

## Phase 2 — Depth

**Deliverables**

- [ ] Seat request lifecycle: requested / accepted / declined / cancelled; "My rides" + "My requests"
- [ ] Seat count updates, cost share, pickup points (locations contract + free-text fallback)
- [ ] Auto-archive expired rides (TTL index or job)
- [ ] Trips & Meetups basics: create event, invite, attendance list

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Cannot request own / full ride; double request blocked
- [ ] Expired rides never in search
- [ ] Only owner can edit/cancel; others 403

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Trips link to `rideId` and `billId` by route path only
- [ ] `notify()` on request / accept / decline / event change
- [ ] `searchProvider`, `summaryProvider`, ReportButton on rides and events
- [ ] Request lifecycle tests; mobile polish

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Murree trip: trip → ride → bill links open correct pages
- [ ] Bell notifications for each lifecycle event
- [ ] Moderation hide removes ride from search

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
