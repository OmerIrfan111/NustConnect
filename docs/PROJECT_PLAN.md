# NUSTConnect: Project Division Plan

> Markdown version of `NUSTConnect_Project_Division_Plan.docx`. This file is the source of truth.
> Base version, 9 independent modules, 3 team groups, phased delivery with QA gates.
> **CS-313 Web Engineering** · Stack: React + Node/Express + MongoDB · Single repository, 9 module branches.

There is a base version (landing page, shell and placeholders) that everyone branches from. The whole proposal is split
into 9 modules (3 per person), arranged so that each branch only ever edits its own folders. Each module has 3
phases, and each phase ends in a QA gate. A team-wide integration and release gate follows.

---

## 1. Inputs and assumptions

- **Reviewed:** Assignment 1 (proposal + SRS: 13 modules, FR-1 to FR-17, NFRs, see `REQUIREMENTS.md`), Assignment 2
  (design write-up, see `DESIGN.md`), the design-system board, five wireframes (WF-01 to WF-05), and high-fidelity UI-01
  (landing), UI-06 (login) and UI-07 (registration).
- **Design tokens:** Navy `#173B63`, Teal `#14B8A6`, Amber `#F59E0B`, Background `#F8FAFC`, Surface `#FFFFFF`,
  Text `#1E293B`, Text 2 `#64748B`, Border `#E2E8F0`. Font: Inter (40/32/24/18/16/14 px). Rounded cards and subtle borders.
- **Signed-in shell:** a left sidebar (Dashboard, RideShare, Marketplace, Review Hub, Opportunities, Campus Map,
  Lost & Found, Help Box, Complaints, Bill Splitting, Notifications, Settings) and a top bar with search, notifications and profile.
  **Visitor shell:** top nav (Home, Explore Services, About, Login, Register).
- The 13 proposal modules are packed into 9 (§4). Trips, SkillSwap, Donations, FAQ and Admin have no sidebar entry in the
  designs, so each module adds its own entries through its manifest (§10).
- Ride Details, Ride Confirmation, Product Details, Write Review and Review Confirmation exist **only in the clickable prototype**
  (`docs/design/prototype/index.html`). Owners must open the prototype when building them.

## 2. How the repository stays conflict-free

### 2.1 Golden rules

1. **One folder = one owner.** A module branch may only change files inside its own client folder, server folder and
   docs folder (§2.3).
2. **No shared registry files.** The client discovers modules with a glob over `src/modules/*/module.config.js`. The server
   does the same over `src/modules/*/index.js`. Adding a module never means editing a central list, route table or sidebar file.
3. **The base ships a stub for every module:** a placeholder page, a `/ping` endpoint and a manifest. Owners replace files in their own
   folder and never create files elsewhere.
4. **Modules never import each other.** They talk only through the contracts (§2.4, `CONTRACTS.md`) and by linking to
   route paths and IDs. An ESLint `no-restricted-imports` rule and a CI path check enforce this.
5. **Core files are frozen after `v0.1-base`.** For a core change, open an issue labelled `core-change`. One agreed person
   makes it on a small branch from `main`, and everyone merges `main` in.
6. **Database isolation:** one MongoDB, with every collection prefixed by the module slug (for example `rideshare_rides`). Seeds
   live in each module (`server/src/modules/<slug>/seed.js`).

### 2.2 Repository layout (target, after base)

```
NustConnect/
├─ client/                     React (Vite)
│  └─ src/
│     ├─ core/                 BASE-OWNED, frozen: AppShell, router, theme, landing, ui kit
│     ├─ modules/
│     │  ├─ auth/              module.config.js, pages/, components/, useAuth.js
│     │  ├─ dashboard/ admin/ rideshare/ marketplace/ reviews/
│     │  └─ lostfound/ support/ campus/
│     └─ main.jsx
├─ server/                     Node + Express
│  └─ src/
│     ├─ core/                 BASE-OWNED, frozen: app, db, module loader, error handler
│     └─ modules/
│        ├─ auth/              index.js, routes.js, models/, controllers/, seed.js, session.js
│        └─ dashboard/ admin/ rideshare/ marketplace/ reviews/ lostfound/ support/ campus/
├─ docs/modules/<slug>/        per-module notes, API list, QA log, session log
├─ .github/                    CODEOWNERS, PR template, CI workflow
└─ package.json                npm workspaces: client, server
```

### 2.3 Ownership, branches and reserved prefixes

| ID | Branch | Folders owned (client + server + docs) | Client routes reserved | API prefix / collections |
|----|--------|----------------------------------------|------------------------|--------------------------|
| A1 | `module/auth` | `modules/auth` | /login /register /verify /forgot-password /profile /settings | `/api/auth` · `auth_*` |
| A2 | `module/dashboard` | `modules/dashboard` | /dashboard /notifications /search | `/api/dashboard` · `dashboard_*` |
| A3 | `module/admin` | `modules/admin` | /admin/* /donations/* | `/api/admin` · `admin_*` |
| B1 | `module/rideshare` | `modules/rideshare` | /rides/* /trips/* | `/api/rideshare` · `rideshare_*` |
| B2 | `module/marketplace` | `modules/marketplace` | /marketplace/* /skillswap | `/api/marketplace` · `marketplace_*` |
| B3 | `module/reviews` | `modules/reviews` | /reviews/* /opportunities /alumni | `/api/reviews` · `reviews_*` |
| C1 | `module/lostfound` | `modules/lostfound` | /lost-found/* | `/api/lostfound` · `lostfound_*` |
| C2 | `module/support` | `modules/support` | /complaints/* /help-box /faq/* | `/api/support` · `support_*` |
| C3 | `module/campus` | `modules/campus` | /map /guide /bills/* | `/api/campus` · `campus_*` |

CODEOWNERS maps each folder to its owner. A CI job fails any PR from `module/<slug>` that touches a path outside
`client/src/modules/<slug>`, `server/src/modules/<slug>` or `docs/modules/<slug>`.

### 2.4 Contracts (the only allowed coupling)

Each contract is defined once and stubbed in the base, so a module can be built and tested before the module that owns the
real implementation exists. Full shapes are in **`CONTRACTS.md`**. Summary:

| Contract | Real owner | Base stub behaviour |
|----------|-----------|---------------------|
| Module manifest (client + server) | Each module | Placeholder page + `/api/<slug>/ping` |
| Session / roles (`requireAuth`, `useAuth`, …) | A1 | Demo user "Ahmed Khan" when `VITE_DEV_FAKE_AUTH=true` |
| `notify()` | A2 | `console.log` only |
| Search provider | A2 aggregates, every module supplies | Aggregator absent; providers optional |
| Summary provider | A2 aggregates, every module supplies | Dashboard uses sample JSON |
| Reporting / moderation | A3 | Button renders, POST returns 202 |
| User lookup | A1 | Returns 3 sample users |
| Campus locations | C3 | Returns 5 sample points |
| Admin panels | A3 renders | Empty list |

### 2.5 Git workflow

See `CONTRIBUTING.md` for the step-by-step version.

- `main` is protected. Nobody pushes to it directly. The base is tagged `v0.1-base`, and all 9 module branches start from that tag.
- Work on `module/<slug>`. Optional sub-branches `module/<slug>/<task>` merge into the module branch only.
- **End of each phase:** (1) self-QA on your branch, (2) `git merge main` into your branch (should be conflict-free),
  (3) PR into `main` with the QA checklist filled in, (4) another group cross-tests on `main`, (5) tag `phase-N` once all
  three groups have passed.
- **Dependencies:** the base installs the full planned list (react-router, axios, mongoose, jsonwebtoken, bcrypt, multer,
  nodemailer, leaflet, tesseract.js, express-rate-limit, helmet, Jest, Vitest and testing utilities). To add another package,
  do it only in your phase-end PR, and run `npm install` after merging main so the lockfile is regenerated, not hand-merged.
- Use merge commits (not rebase) on shared branches. Delete nothing from `main`.

## 3. Base version (`v0.1-base`)

**Goal:** a runnable, good-looking skeleton, so that the very first commit on every module branch already sits in its own
folder. It is split into three disjoint tasks so all three people can build it in parallel.

### 3.1 What is in the base

| Area | Contents |
|------|----------|
| Landing page (real) | Pixel-faithful to UI-01: top nav, navy hero with headline, subtext, search bar and Explore Services / Get Started buttons, hero sample cards, "Everything you need on campus" (6 service cards), Popular campus services (4 cards), How it works (3 steps), Join CTA, footer. Uses tokens + Inter. Responsive at 1440 / 768 / 375 px. |
| Visitor shell | Top navigation + footer. Static About, Contact and Privacy Policy pages (core-owned). |
| Signed-in shell | Sidebar built from module manifests (the 12 designed items + extras), top bar with search slot, notification slot and profile menu, content area. Visible through the dev fake-auth switch. |
| Placeholders (non-working on purpose) | Every module route shows "Coming soon – owned by module/&lt;slug&gt;". Landing search and Explore Services only scroll or route. Login, Register, Dashboard and all module links go to placeholders. Hero cards are static sample data. The bell and global search are inert stubs. |
| UI kit | Button (primary / secondary / outline / disabled), Input with error state, SearchBar, Card, ServiceCard, Badge (Verified Student, New, Available, Full), StarRating, Tabs/Chips, Avatar, PageHeader, EmptyState, Loading, ReportButton stub, sample-data banner. |
| Server skeleton | Express app, MongoDB connection, security middleware (helmet, CORS, rate limit), central error handler, module auto-loader, `/api/health`, `/api/<slug>/ping` for all 9 modules, session / notify / lookup / locations stubs, seed runner (`npm run seed -- <slug>`). |
| Tooling | npm workspaces, ESLint + Prettier + EditorConfig, import-boundary rule, CODEOWNERS, PR template with QA checklist, CI (lint, test, path-ownership check), `.env.example` with every variable, README + CONTRIBUTING, `docs/modules/<slug>/README.md` template, Jest/Vitest setup. |

### 3.2 The base is explicitly NOT

No working login, registration, search, booking, posting, notifications or admin. No real data, only clearly labelled sample data.

### 3.3 Splitting the base work (no overlapping files)

| Task | Branch | Paths | Scope |
|------|--------|-------|-------|
| Base-1 (Musa) | `base/client` | `client/src/core/` (layouts, router, landing, static pages; **not** `ui/`), `client/src/main.jsx`, client Vite config | Vite + React setup, theme tokens + Inter, AppShell and sidebar built from manifests, landing page, module auto-loader, placeholder pages, dev fake-auth switch. |
| Base-2 (Omer) | `base/server` | `server/src/core/`, `server/src/modules/*/` (stubs only), `server/package.json` | Express app, Mongo, middleware, loader, all stubs and contracts (session, notify, lookup, locations, reports), seed runner, health/ping endpoints. |
| Base-3 (Ali) | `base/tooling` | `client/src/core/ui/`, `.github/`, root configs, `docs/modules/*` templates, CODEOWNERS | Component library from the design system, Storybook-style demo page at `/dev/ui`, lint/format/CI, path-ownership check, per-module doc templates. |

> The client module stubs (`client/src/modules/*/module.config.js` + placeholder page) belong to Base-1, because the
> auto-loader and placeholder page live there. Base-1 and Base-3 must agree up front on the theme-token file location
> (`client/src/core/theme/`, owned by Base-1) because the UI kit imports from it.

### 3.4 QA gate 0: base acceptance (all three sign)

- [ ] Fresh clone: `npm run setup && npm run dev` starts the client on 5173 and the server on 5000, and connects to MongoDB with no manual edits.
- [ ] Landing page matches UI-01 at 1440, 768 and 375 px. All design tokens come from one theme file. No horizontal scroll on mobile.
- [ ] With fake auth on, every sidebar item opens its placeholder. With it off, protected routes redirect to the placeholder login.
- [ ] `/api/health` and all nine `/api/<slug>/ping` respond. Lint, unit tests and CI are green.
- [ ] **No-conflict proof:** each member creates their module branch, adds a dummy page and a dummy route inside their own folders,
      then all three branches are merged into a scratch branch. The merge must be clean, and the new pages must appear in the
      sidebar and API without any shared file being edited. If this fails, fix the base before tagging `v0.1-base`.

## 4. The 9 modules at a glance

| ID | Module | Owner | Proposal items | Why it sits here |
|----|--------|-------|----------------|------------------|
| A1 | Auth & Profiles | Omer | FR-1, FR-2 | Identity foundation. The real implementation replaces the base stub. |
| A2 | Dashboard, Notifications & Search | Omer | FR-15 | The hub that aggregates from all modules through contracts. |
| A3 | Admin, Moderation & Donations | Omer | FR-16, FR-17, FR-13 | Governance. Donations are admin-created campaigns. |
| B1 | RideShare & Trips/Meetups | Musa | FR-3, FR-9 | Transport and group travel share the ride model. |
| B2 | Marketplace, FYP/ESE Hardware & SkillSwap | Musa | FR-7, FR-11 | All listing-style content with images and sellers. |
| B3 | Review Hub & Opportunities | Musa | FR-4, FR-5 | The "Reviews & Careers" section of the sitemap: ratings and posts. |
| C1 | Lost & Found with OCR | Ali | FR-10 | Self-contained, privacy-heavy, image processing. |
| C2 | Complaints, Help Box & FAQ | Ali | FR-6, FR-12 | Both privacy-aware support flows, kept apart by design in one module. |
| C3 | Campus Map & Guide + Bill Splitting | Ali | FR-8, FR-14 | Two lighter modules balanced into one workload. |

Workload is balanced by feature count and UI size. Group B carries the most designed UI, Group A the most integration
logic, and Group C the most privacy and processing rules. Groups can be swapped between people without changing anything else.

## 5. Phase model and QA gates

| Phase | Theme (same for every module) | Gate |
|-------|-------------------------------|------|
| Phase 1: Core | Designed screens built against sample data, models, basic CRUD API, seed data. Replaces the placeholder. | **QA-1:** happy path works, matches the design, runs alongside the other modules. |
| Phase 2: Depth | Business rules, permissions, lifecycles, secondary features, contract providers started. | **QA-2:** rules, validation, permissions, edge cases. |
| Phase 3: Integration & hardening | Contracts completed (search, summary, notify, report, moderation), performance, accessibility, security, tests. | **QA-3:** integrated behaviour, NFRs, regression. |
| Phase 4: Release (everyone) | End-to-end journeys across modules on `main`, demo data, bug bash, documentation. | **QA-4:** release sign-off. |

### 5.1 Standard QA checklist (every module, every gate)

| Check | Pass criteria |
|-------|---------------|
| Ownership | PR touches only the module's own folders. CI path check is green. `git merge main` into the branch is conflict-free. |
| Functional | Every item in the phase deliverables list is demonstrated, and all module-specific QA bullets are ticked. |
| Design fidelity | Colours, Inter type scale, radius and spacing come from tokens. Matches the wireframe / hi-fi design where one exists. |
| Responsive | Works at 1440, 768 and 375 px with no horizontal scroll. Touch targets are usable on mobile. |
| States | Loading, empty and error states exist for every list and form. |
| Quality | No console errors, lint clean, new code covered by tests (API tests at minimum from Phase 2), sample data labelled. |
| Docs | `docs/modules/<slug>/` lists endpoints, models, contracts used and known issues. A QA log row has been added. |

### 5.2 Cross-testing and defects

- **Testers:** Omer tests Musa's modules, Musa tests Ali's, and Ali tests Omer's. The tester runs the module checklist on `main`
  and logs bugs as GitHub issues labelled with the module slug and severity.
- **Severity:** S1 blocks the journey or leaks private data. S2 is wrong behaviour with a workaround. S3 is cosmetic. A gate passes
  only with zero S1, zero S2, and every S3 ticketed.
- Fixes are made on the owner's module branch and re-merged. Testers re-verify only the failed items, plus a quick smoke run.
- All three groups must pass before the `phase-N` tag. Development may continue on the branch meanwhile; only merging waits.

---

## 6. Group A: Platform & Governance (Omer)

Owns everything other modules depend on at runtime: identity, the dashboard hub with notifications and search, and
admin/moderation. Every other module is built against base stubs, so nobody waits for Group A. **Group A cross-tests Group B.**

### A1: Auth & Profiles

| | |
|-|-|
| Branch / slug | `module/auth` (client/src/modules/auth, server/src/modules/auth, docs/modules/auth) |
| Requirements | FR-1, FR-2 (O2 Verify, NFR Security) |
| Design reference | UI-06 Login, UI-07 Registration. Profile & settings are not in the designs, so follow the design system. |
| Routes / API | /login /register /verify /forgot-password /profile /settings · `/api/auth/*` |
| Collections | `auth_users`, `auth_tokens` |

**Phase 1: Core**
- Login and Register pages exactly per UI-06 / UI-07 (name, NUST email, department/school, batch, password, confirm, terms checkbox).
- User model, bcrypt hashing, register/login/logout endpoints, JWT in an httpOnly cookie.
- Replace the base stub in server `session.js` and client `useAuth.js` with the real implementation (same exported names).
- NUST email domain rule driven by an env var (`ALLOWED_EMAIL_DOMAINS`).
- *QA-1:* Register → login → refresh keeps the session. Wrong password and duplicate email show clear errors. A non-NUST email is rejected server-side, not only in the UI. Other modules still run, and the dev fake-user switch keeps working.

**Phase 2: Depth**
- Email verification link (nodemailer), forgot / reset password, Remember me.
- Profile page (view/edit name, department, batch, avatar) and Settings (privacy + contact preferences).
- `verified` flag exposed by `useAuth`, so other modules can show the "Verified Student" badge.
- `GET /api/auth/users/lookup?q=` (contract used by bill splitting).
- *QA-2:* An unverified account cannot reach protected pages and a verified one can. A reset token expires and cannot be reused. Lookup returns only id, name and verified, never email or phone.

**Phase 3: Integration & hardening**
- Roles: student, alumni, moderator, admin. `requireRole()` middleware.
- Alumni verification route. "Delete my data" action.
- Rate limiting, CSRF protection, account lockout, input validation.
- Unit + API tests for auth flows.
- *QA-3:* Role matrix test (each role against each protected route). The password never appears in logs or responses. Cookies are httpOnly + sameSite. The SRS NFR security checklist passes. Lint + tests are green.

### A2: Dashboard, Notifications & Global Search

| | |
|-|-|
| Branch / slug | `module/dashboard` |
| Requirements | FR-15 (O3 three clicks) |
| Design reference | WF-02 / Figma Student Dashboard, notifications page, search results page |
| Routes / API | /dashboard /notifications /search · `/api/dashboard/*` |
| Collections | `dashboard_notifications` |

**Phase 1: Core**
- Dashboard per WF-02: greeting, 4 stat cards (Active Rides, Marketplace Listings, Saved Reviews, Upcoming Events), Quick access cards, Recent activity, Recommended opportunities, all from sample JSON.
- Notification model + API (list, mark read, mark all read).
- A real `notify(userId, payload)` replacing the base stub.
- Top-bar slots: NotificationBell (with badge) and GlobalSearchBar replace the base placeholders.
- *QA-1:* Dashboard matches the wireframe at 1440 / 768 / 375 px with sample data labelled. `notify()` called from a test script creates a notification visible in the bell. The sidebar highlights Dashboard. No console errors.

**Phase 2: Depth**
- Notifications page with filters (all/unread) and deep links to the source module.
- Global search aggregates every module's `searchProvider`, grouped by module, with a type filter.
- Dashboard stats and Recent activity driven by each module's `summaryProvider` (falls back to sample data).
- *QA-2:* Search doesn't crash when a module has no provider yet (it skips that module). Search returns in < 2 s with seeded data. The unread count stays correct after mark-read.

**Phase 3: Integration & hardening**
- In-app polling (or SSE) for the bell. Email digest for important events.
- Recommended opportunities and Saved Reviews wired to the reviews module's providers.
- Empty / loading / error states for every widget. Pagination for notifications. API tests for notify, list and read.
- *QA-3:* Each of the 9 modules appears at least once in search and in summaries. Accessibility pass (keyboard, contrast, labels). Lighthouse performance ≥ 80 on mobile.

### A3: Admin, Moderation & Donations

| | |
|-|-|
| Branch / slug | `module/admin` |
| Requirements | FR-16, FR-17, FR-13 (O4) |
| Design reference | Not in the designs. Follow the design system (sidebar shell + tables/cards). |
| Routes / API | /admin/* /donations /donations/:id · `/api/admin/*` |
| Collections | `admin_reports`, `admin_audit`, `admin_categories`, `admin_campaigns`, `admin_contributions` |

**Phase 1: Core**
- Admin layout under /admin/*, gated by role (stub role check until auth lands). Its sidebar renders every module's `adminRoutes` automatically.
- `POST /api/admin/reports` + Report model. Moderation queue list.
- User management list (read-only, uses the lookup contract).
- Donations: campaign model, admin create/edit, student campaign list and detail with a progress bar.
- *QA-1:* A non-admin hitting /admin/* is redirected or gets 403 (UI and API). A report created from any ReportButton shows in the queue. Progress bar math is correct at 0 %, 50 % and 100 %.

**Phase 2: Depth**
- Moderation actions: hide / restore content through each module's `moderationHooks`, and warn / suspend users through the auth contract. Every action is written to the audit log.
- Category management (modules fall back to their own defaults if empty).
- Donation contribution records (manual pledges, no payment gateway) and a campaign updates feed.
- *QA-2:* Hide makes content disappear for students but not for moderators, and restore reverses it. An audit entry exists for each action with actor and time. Contribution totals equal the sum of the records.

**Phase 3: Integration & hardening**
- Analytics page: aggregated usage counts from each module's `summaryProvider` (no personal data).
- Complaint management is reachable through the support module's `adminRoutes` (nothing implemented here).
- Pagination, search and filters on the queue and users. Tests.
- *QA-3:* Moderator vs admin permission matrix verified. Analytics shows data from all modules. No admin screen leaks anonymous help-box data.

---

## 7. Group B: Exchange & Discovery (Musa)

Owns the pages fully designed in Assignment 2 (RideShare, Marketplace, Review Hub, plus their detail and confirmation screens)
and their extensions: the most UI, and the three prototype user journeys. **Group B cross-tests Group C.**

### B1: RideShare & Trip / Meetup Organizer

| | |
|-|-|
| Branch / slug | `module/rideshare` |
| Requirements | FR-3, FR-9 |
| Design reference | WF-03 Find a Ride; Ride Details and Ride Request Confirmation (prototype); Post a Ride |
| Routes / API | /rides /rides/new /rides/:id /rides/:id/confirmation /trips /trips/:id · `/api/rideshare/*` |
| Collections | `rideshare_rides`, `rideshare_requests`, `rideshare_trips` |

**Phase 1: Core**
- Find a Ride per WF-03: search (From, Destination, Date, Passengers), a filter panel (departure time, price, seats, pickup), and an "N rides available" list with ride cards and the verified badge.
- Ride model, list/search API, seeded sample rides.
- Ride Details page, and "Request seat" → Request Confirmation page.
- Post a Ride form with validation.
- *QA-1:* Journey 2 works end to end (Dashboard → RideShare → Details → Confirmation). Search + filters narrow results correctly, with an empty state for no match. The ride card shows seats, price per passenger, and a Full badge at 0 seats.

**Phase 2: Depth**
- Seat request lifecycle: requested / accepted / declined / cancelled. A driver view ("My rides") and a passenger view ("My requests").
- Seat count updates, cost-share display, pickup points (uses the campus locations contract with a free-text fallback).
- Auto-archive expired rides (TTL index or scheduled job).
- Trips & Meetups basics: create event, invite, attendance list.
- *QA-2:* You cannot request your own ride or an already full ride, and double requests are blocked. Expired rides never appear in search. Only the owner can edit/cancel; others get 403.

**Phase 3: Integration & hardening**
- Trips link to a ride (`rideId`) and to a bill (`billId`) by route path only, with no imports from other modules.
- `notify()` on request / accept / decline / event change.
- `searchProvider`, `summaryProvider` (Active Rides, Upcoming Events), ReportButton on rides and events.
- Tests for the request lifecycle. Mobile polish.
- *QA-3:* Murree-trip scenario: the trip → ride → bill links open the correct pages. Notifications arrive in the bell for each lifecycle event. The moderation hide hook removes a ride from search.

### B2: Marketplace, FYP/ESE Hardware & SkillSwap

| | |
|-|-|
| Branch / slug | `module/marketplace` |
| Requirements | FR-7, FR-11 |
| Design reference | WF-04 Student Marketplace; Product Details (prototype); Post an Item |
| Routes / API | /marketplace /marketplace/new /marketplace/:id /skillswap · `/api/marketplace/*` |
| Collections | `marketplace_items`, `marketplace_skillposts` |

**Phase 1: Core**
- Marketplace per WF-04: search, category chips (All, Electronics, Books, Hostel Essentials, FYP/ESE Hardware, Other), filters (category, price, condition, availability), 3-column product cards.
- Item model, list/search API, seeded sample items.
- Product Details page. Post an Item form with image upload (multer, type/size limits).
- *QA-1:* Journey 3a works (Dashboard → Marketplace → Product Details). Chips and filters combine correctly. Prices are formatted "PKR 2,500". Upload rejects non-images and oversize files.

**Phase 2: Depth**
- Edit, delete, mark as sold. "My listings".
- Seller profile card with the verified badge and contact preference.
- FYP/ESE Hardware specifics: component list, project type, hardware condition.
- Auto-archive of stale listings.
- *QA-2:* Only the seller can edit or mark sold. Sold items show a Sold badge and drop out of default results. Contact info respects the seller's privacy preference.

**Phase 3: Integration & hardening**
- SkillSwap & Team Finder: offer / request posts, search by skill, contact flow.
- `searchProvider`, `summaryProvider` (Marketplace Listings), `notify()` on interest, ReportButton, moderation hooks.
- Image compression + lazy loading. Tests.
- *QA-3:* The page loads in < 3 s on throttled mobile with 50+ listings. SkillSwap posts appear in global search. Items hidden by a moderator are not reachable by URL for students.

### B3: Review Hub & Opportunities

| | |
|-|-|
| Branch / slug | `module/reviews` |
| Requirements | FR-4, FR-5 |
| Design reference | WF-05 Campus Review Hub; Write Review and Review Confirmation (prototype); Opportunities (dashboard widget design) |
| Routes / API | /reviews /reviews/:id /reviews/new /reviews/confirmation /opportunities /alumni · `/api/reviews/*` |
| Collections | `reviews_entities`, `reviews_reviews`, `reviews_opportunities`, `reviews_mentorship` |

**Phase 1: Core**
- Review Hub per WF-05: tabs (Teachers, Cafes, Hostels, Mess, Schools), filter bar (search, category, rating, department), review cards, and a "Popular on campus" panel.
- Entity + Review models, list/search API, seeded sample data.
- Write a Review form → Review Confirmation page.
- *QA-1:* Journey 3b works (Dashboard → Review Hub → Write Review → Confirmation). Tabs and filters combine correctly. The star display handles 0–5 and half values.

**Phase 2: Depth**
- Aggregated rating per entity, an entity detail page, compare two entities.
- One review per user per entity. Edit / delete your own review. Helpful votes.
- Opportunities board: list, post, filter (internship / job / referral), deadlines.
- *QA-2:* A second review by the same user is blocked or edit-only. The average rating recalculates after add/edit/delete. Past-deadline opportunities are marked closed.

**Phase 3: Integration & hardening**
- Alumni directory and mentorship requests.
- `searchProvider`, `summaryProvider` (Saved Reviews, Recommended opportunities), `notify()`, ReportButton, moderation hooks.
- Anonymous-style display (name hidden, Verified Student badge shown). Tests.
- *QA-3:* Reviewer identity is not exposed in API responses to other students. The dashboard recommended-opportunities widget shows real data. Regression of the Phase 1 journey passes.

---

## 8. Group C: Campus Life & Support (Ali Abdullah)

Owns the privacy-sensitive and campus-specific services. These have the fewest design screens, so they follow the design system
closely. **Group C cross-tests Group A.**

### C1: Lost & Found with OCR

| | |
|-|-|
| Branch / slug | `module/lostfound` |
| Requirements | FR-10 (O4 Privacy) |
| Design reference | Not in the designs. Use the list + detail + form patterns from Marketplace. |
| Routes / API | /lost-found /lost-found/new /lost-found/:id · `/api/lostfound/*` |
| Collections | `lostfound_items`, `lostfound_claims` |

**Phase 1: Core**
- Lost & Found board: Lost / Found tabs, filters (category, date, location), cards.
- Item model, list/search API, seeded samples.
- Post a lost or found item with photos. Detail page.
- *QA-1:* A found item and a lost item can both be posted and viewed. Filters and tabs work. Upload limits are enforced.

**Phase 2: Depth**
- OCR on found-item photos (tesseract.js, server side) to extract text such as card or ID names.
- Matching: suggested matches between lost and found items by OCR text + keywords + category.
- Claim flow: request to claim, finder approves.
- Privacy safeguards: mask ID / CNIC-like numbers, store only the text needed for matching, never show raw OCR text.
- *QA-2:* Run an OCR test set of 10 sample images and record accuracy and failures. Sensitive numbers never appear in any API response. Match suggestions are visible only to the two owners involved.

**Phase 3: Integration & hardening**
- `notify()` the owner on a probable match and on claim status changes. Statuses: open / claimed / returned. Auto-archive.
- `searchProvider`, `summaryProvider`, ReportButton, moderation hooks.
- OCR failure fallback (manual entry). Tests.
- *QA-3:* An OCR timeout or failure does not block posting. The matched owner receives a bell notification with a deep link.

### C2: Complaint Tracker, Help Box & FAQ Wiki

| | |
|-|-|
| Branch / slug | `module/support` |
| Requirements | FR-6, FR-12 (O4 Privacy) |
| Design reference | Student Support card (landing / dashboard). Forms and timeline follow the design system. |
| Routes / API | /complaints /complaints/new /complaints/:id /help-box /faq /faq/:id · `/api/support/*` |
| Collections | `support_complaints`, `support_complaint_history`, `support_helpbox`, `support_faq` |

**Phase 1: Core**
- Complaint submission (category, description, photo, location) and a "My complaints" tracker with a status timeline.
- Help Box: an anonymous question form. **No user id is stored.**
- FAQ/wiki: categorised browse + search (public, guest-accessible).
- *QA-1:* A complaint appears in the owner's tracker with status Submitted. Database check: help-box documents contain no user reference. FAQ search returns matching articles.

**Phase 2: Depth**
- Status workflow: submitted → under review → assigned → in progress → resolved → reopened. History records actor + time.
- Staff complaint management screen registered through `adminRoutes` (role-gated).
- Moderators answer help-box questions and publish them as FAQ articles. FAQ editor.
- *QA-2:* Only the owner and staff can read a complaint; others get 403. Invalid status transitions are rejected. The anonymous answer flow never reveals the asker.

**Phase 3: Integration & hardening**
- `notify()` on every complaint status change.
- Help-box rate limiting without storing identity (IP held in memory only).
- `summaryProvider` with resolution stats (target: 70 % past "submitted" within 7 days), `searchProvider` (FAQ only), ReportButton, tests.
- *QA-3:* Privacy test script confirms no endpoint joins help-box data with accounts. The complaint notification deep link opens the right complaint.

### C3: Campus Map & Guide + Bill Splitting

| | |
|-|-|
| Branch / slug | `module/campus` |
| Requirements | FR-8, FR-14 |
| Design reference | Campus Map card (landing / dashboard). Bill Splitting is not in the designs, so follow the design system. |
| Routes / API | /map /guide /bills /bills/new /bills/:id · `/api/campus/*` |
| Collections | `campus_locations`, `campus_guides`, `campus_bills` |

**Phase 1: Core**
- Interactive campus map (Leaflet) with seeded NUST H-12 locations, a searchable list and a category filter. Public (guests allowed).
- Freshie Guide: a static articles page.
- Bill Splitting: create a bill (title, total) and add participants via the lookup contract.
- *QA-1:* The map is offline-safe (a tile failure shows a fallback list). A guest can open /map and /guide without logging in. A bill with 3 participants is saved and viewable.

**Phase 2: Depth**
- Split methods: equal, by item, custom amounts. Record payments, outstanding balances, a settle-up view.
- `GET /api/campus/locations` (read-only contract used for ride pickup points).
- A directions deep-link per location.
- *QA-2:* Split amounts sum exactly to the bill (rounding tested). Only participants can see a bill, and only the creator can edit it.

**Phase 3: Integration & hardening**
- Link from trips by route path (`/bills/:id`). `notify()` on bill creation, payment and deadline.
- `searchProvider` (locations, guide), `summaryProvider`, ReportButton, mobile polish, tests.
- *QA-3:* Money math unit tests pass (equal, item, custom, rounding). Notifications for bill events reach every participant.

---

## 9. Phase 4: Integration & release (whole team, on `main`)

Runs only after QA-3 has passed for all nine modules. Work happens on short-lived `fix/<topic>` branches from `main`,
each small enough that two people never edit the same file.

| Journey / area | Pass criteria |
|----------------|---------------|
| Journey 1: Onboarding | Landing → Register → verify → Dashboard. Landing → Login → Dashboard. |
| Journey 2: Find a ride | Dashboard → RideShare → Details → Request → the driver receives a notification. |
| Journey 3: Marketplace & reviews | Dashboard → Marketplace → Product Details. Dashboard → Review Hub → Write Review → Confirmation. Both appear in dashboard activity and global search. |
| Cross-module scenarios | Murree trip (trip → ride → bill). Lost item match → notification. Complaint status change → notification. Report → moderator hides → content disappears for students. |
| Privacy | The help box has no identity link. Complaint access is limited. OCR text is masked. Lookup exposes no email. |
| Non-functional | Page load < 3 s on throttled mobile, search < 2 s, keyboard navigation and contrast, HTTPS-ready config, backup/seed scripts documented. |
| Release | The seed script loads demo data for all modules. README run steps tested on a clean machine. Demo script written. Tag `v1.0`. |

## 10. Open questions and assumed defaults

| Question | Default assumed |
|----------|-----------------|
| Phase timing | No dates. The next phase starts once the current QA gate has passed for everyone. |
| JavaScript or TypeScript? Vite or Next? | JavaScript with Vite + React Router. Express + Mongoose. |
| Image storage | Local `/uploads` via multer (gitignored). Swap to Cloudinary later behind one helper. |
| Email sending | nodemailer with a development SMTP / Ethereal inbox. |
| Alumni verification, donation payments | Alumni: manual approval by admin. Donations: pledge records only, no payment gateway. |
| Sidebar entries for Trips, SkillSwap, Donations, FAQ, Admin | Added by each module through its manifest (a "More" group). |
| Messages / chat (listed in the sitemap) | Out of scope for now. Contact preferences are shown instead. |
