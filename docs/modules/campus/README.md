# C3 — Campus Map & Guide + Bill Splitting

> Owned by the `module/campus` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Ali |
| Cross-tester | Musa |
| Branch | `module/campus` |
| Folders | `client/src/modules/campus/`, `server/src/modules/campus/`, `docs/modules/campus/` |
| Requirements | FR-8, FR-14 |
| Design | Campus Map card (landing / dashboard); Bill Splitting not in designs – follow the design system |
| Client routes | /map /guide /bills /bills/new /bills/:id |
| API prefix | `/api/campus/*` |
| Collections | `campus_locations`, `campus_guides`, `campus_bills` |
| Contracts provided | `GET /api/campus/locations` contract, `searchProvider` (locations, guide), `summaryProvider`, `moderationHooks`, `deleteUserData` |
| Contracts consumed | Session (A1), user lookup (A1), `notify()` (A2), ReportButton (A3) |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** Phases 1, 2 and 3 are built and self-QA'd with mocked models (no database needed for the tests).
**Next step:** run the checklist against a real MongoDB (seed, map in a real browser at 1440 / 768 / 375 px), then cross-test by Musa once merged into `main`.

## Phase 1 — Core

**Deliverables**

- [x] Leaflet campus map with seeded NUST H-12 locations, searchable list, category filter – public
- [x] Freshie Guide: static articles page
- [x] Bill Splitting: create bill (title, total), add participants via lookup contract

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Tile failure shows fallback list (a notice appears and the list of places keeps working)
- [x] Guest can open /map and /guide without login (public routes, API tested with no session)
- [x] Bill with 3 participants saved and viewable

## Phase 2 — Depth

**Deliverables**

- [x] Split methods: equal, by item, custom; record payments; balances; settle-up view
- [x] `GET /api/campus/locations` (read-only contract)
- [x] Directions deep-link per location (OpenStreetMap link on each place)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Splits sum exactly to the bill (rounding tested)
- [x] Only participants see a bill; only creator edits

## Phase 3 — Integration & hardening

**Deliverables**

- [x] Linked from trips by path (`/bills/:id`); `notify()` on creation, payment, deadline
- [x] `searchProvider`, `summaryProvider`, mobile polish, tests (ReportButton is not used: bills are private, so there is nothing for others to report)

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Money math unit tests pass (equal, item, custom, rounding)
- [x] Bill notifications reach every participant (creation notifies everyone else on the bill; a recorded payment notifies the other side; reminders go to everyone who still owes)

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/campus/ping` | public | Health check |
| GET | `/api/campus/locations` | public | Locations contract: `[{ id, name, category, lat, lng, description, landmark, directionsUrl }]`. `?category=` and `?q=`. Serves labelled sample points if the database is down or empty |
| GET | `/api/campus/guides` | public | `{ guides: [...] }`, `?section=`. Same sample fallback |
| GET | `/api/campus/bills` | signed in | Bills the user created or is on (`?status=open|settled`) |
| POST | `/api/campus/bills` | signed in | Create. Body: `title, total, splitMethod (equal/item/custom), participants[{userId,name,verified,owedAmount?}], items[{label,amount,sharedBy[]}]?, dueDate?, description?`. The creator is added automatically and their own share is marked paid |
| GET | `/api/campus/bills/:id` | participants | `{ bill, settlement, isCreator }`. 403 for anyone else (staff included), 404 for a hidden bill |
| PATCH | `/api/campus/bills/:id` | creator | Title, notes, due date; amounts/people only while no payment exists (409 afterwards) |
| DELETE | `/api/campus/bills/:id` | creator | Delete |
| POST | `/api/campus/bills/:id/payments` | participants | `{ userId?, amount, note? }`. Creator records for anyone, a participant for themselves. Cannot exceed the balance |
| POST | `/api/campus/bills/reminders/run` | admin | Sends due-date reminders (bills due within 24 h or overdue, once per due date). Intended for a daily job |

## Models

- **`campus_locations`** (`CampusLocation`): `name`, `category` (gate/academic/food/hostel/admin/sports/medical/other), `lat`, `lng`, `description`, `landmark`, `hidden`, `isSample`.
- **`campus_guides`** (`CampusGuide`): `title`, `section`, `summary`, `body`, `order`, `hidden`, `isSample`.
- **`campus_bills`** (`CampusBill`): `title`, `description`, `totalCents`, `splitMethod`, `creatorId/Name`, `dueDate`, `reminderSentAt`, `participants[{ userId, name, verified, owedCents, paidCents, settledAt }]`, `items[]`, `payments[]`, `status` (open/settled), `hidden`, `isSample`. Index on `participants.userId`.
- All money is stored as integer paisa. The first shares of an uneven split get the extra paisa, so shares always sum to the total (`billMath.js`).

## Known issues

- The participant list comes from the browser (people picked through the user-lookup contract). The server cannot check those ids without importing the auth module, so it trusts the ids but never the names or flags of the creator, and the lookup contract never exposes e-mail or phone.
- Deadline reminders need something to call `POST /api/campus/bills/reminders/run` once a day (cron / Task Scheduler).
- Map coordinates are approximate sample points, labelled as sample data in the UI.
- `core/router/routes.test.jsx` renders the real `/map` page for a guest, which now tries a real request in jsdom and logs a harmless `AggregateError`. The test still passes. Fixing the noise is a `core-change`.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| 2026-11-25 | Self-QA (1–3) | Ali | Pass: 47 server + 112 client tests, lint, ownership check, build | Real MongoDB run and visual check at 1440 / 768 / 375 px still to do; cross-test by Musa pending |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-25 | Ali | Built all of C3: public locations contract with sample fallback, Leaflet map (list + category chips + search + tile-failure notice + directions links), Freshie Guide, bill splitting (equal / by item / custom with exact paisa maths, payments, balances, settle-up, creator-only edit, participants-only access), `notify()` on creation / payment / deadline, search + summary + moderation providers, `deleteUserData`, seed script, Jest + Vitest suites. | Run against a real MongoDB with `npm run seed -- campus`; check the layout at 1440 / 768 / 375; cross-test by Musa. |
