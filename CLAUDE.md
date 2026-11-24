# CLAUDE.md: instructions for every Claude session on NUSTConnect

Three developers each run their own Claude sessions on this repo, in parallel, on separate
branches. Following the rules below is what keeps the merges conflict-free.

## 1. Start of every session (do this first)

1. Run `git branch --show-current` and find the branch in the **ownership table** (section 4).
   It tells you which module you are on and which folders you may edit.
   - On `main`: only read. Never commit to `main` directly.
   - On a `base/*` branch: you are building the base (section 5).
   - On a `fix/*` branch: Phase 4 integration fix. Keep it small and confirm scope with the user.
   - Branch not in the table: ask the user before editing anything.
2. Read `docs/STATUS.md` to see which phase the project is in.
3. Read `docs/modules/<slug>/README.md` for your module. Its **Session log** shows what earlier
   sessions did and what is next.
4. Before you build a feature, read the relevant section of `docs/PROJECT_PLAN.md` (phase
   deliverables and QA bullets for your module) and `docs/DESIGN.md` (tokens and the screen to match).

## 2. Golden rules (non-negotiable)

1. **One folder = one owner.** On `module/<slug>`, edit only:
   - `client/src/modules/<slug>/`
   - `server/src/modules/<slug>/`
   - `docs/modules/<slug>/`

   If you need a change outside these, stop and tell the user. It needs a `core-change` issue.
2. **No shared registry files.** Modules are auto-discovered: the client globs
   `client/src/modules/*/module.config.js` and the server globs `server/src/modules/*/index.js`.
   Don't add your module to a central routes, sidebar or app file. Declare everything in your manifest.
3. **Modules never import each other.** Cross-module coupling goes only through the contracts in
   `docs/CONTRACTS.md`, or by linking to another module's route path (for example `/bills/:id`). Lint and CI enforce this.
   The one exception is the session contract: any module may import `client/src/modules/auth/useAuth.js` and
   `server/src/modules/auth/session.js`.
4. **Core is frozen after `v0.1-base`.** That covers `client/src/core/`, `server/src/core/`, root configs,
   `.github/`, `CLAUDE.md`, `CONTRIBUTING.md` and `docs/*.md` (top level). Changes go through a `core-change` issue,
   and one agreed person makes them on a small branch from `main`.
5. **DB collections are prefixed with the module slug**, for example `rideshare_rides`. Seeds live in
   `server/src/modules/<slug>/seed.js`.
6. **Dependencies:** the base installs the full planned list. To add a package, use your phase-end PR only.
   Never hand-merge `package-lock.json`. Run `npm install` after merging main so it regenerates.
7. **Privacy rules are hard requirements.** Help-box data stores no user id. Complaints are visible only to
   the owner and staff. OCR text is masked and never returned raw. User lookup never returns email or phone.

## 3. Stack and conventions

- **JavaScript** (no TypeScript). Client: **React + Vite + React Router**. Server: **Node + Express + Mongoose** on MongoDB.
- npm workspaces: `client/` and `server/`. The client runs on 5173 and the server on 5000.
- Auth uses JWT in an httpOnly cookie. In dev, `VITE_DEV_FAKE_AUTH=true` logs in the demo user "Ahmed Khan".
- Uploads go to a local `/uploads` folder via multer (gitignored). Email uses nodemailer with Ethereal in dev.
- Tests: Vitest on the client and Jest on the server. ESLint, Prettier and EditorConfig are configured at the root.
- Styling: use the theme tokens from core (see `docs/DESIGN.md`). Never hard-code hex values or font sizes.
  Use the core UI kit (Button, Input, Card, Badge, StarRating, and so on) before writing your own.
- Every list and form needs loading, empty and error states. Every page must work at 1440, 768 and 375 px.
- Label sample or demo data as sample data in the UI.
- Merge commits, not rebase, on shared branches.
- **Use the core HTTP client** (`@core/api/http.js`) for every API call. Auth uses a CSRF double-submit cookie: axios echoes
  `XSRF-TOKEN` as `X-XSRF-TOKEN` on same-origin requests, and `requireAuth` / `requireRole` refuse a state-changing request
  without it. Raw `fetch` calls would be rejected. Errors from the API are `{ status, message, error, details? }`.
- **Tests must not need a database or other modules.** Mock your own Mongoose models in memory, and never assert on text that
  another module owns (placeholders, the notification bell's `role="status"` region, top-bar labels). Build per-role apps with
  `jest.resetModules()` + env, and allow generous timeouts for tests that load several modules (bcrypt, full app shell).
- **Docs and scripts on Windows:** write Markdown as UTF-8 (`encoding='utf-8'` in any script that edits docs), or `§`, `—`
  and `…` get corrupted. Prefer the Write/Edit tools over long shell heredocs.

## 4. Ownership table

| ID | Module | Owner | Branch | Client routes | API / collections |
|----|--------|-------|--------|---------------|-------------------|
| A1 | Auth & Profiles | Omer | `module/auth` | /login /register /verify /forgot-password /profile /settings | `/api/auth`, `auth_*` |
| A2 | Dashboard, Notifications & Search | Omer | `module/dashboard` | /dashboard /notifications /search | `/api/dashboard`, `dashboard_*` |
| A3 | Admin, Moderation & Donations | Omer | `module/admin` | /admin/* /donations/* | `/api/admin`, `admin_*` |
| B1 | RideShare & Trips/Meetups | Musa | `module/rideshare` | /rides/* /trips/* | `/api/rideshare`, `rideshare_*` |
| B2 | Marketplace, FYP/ESE Hardware & SkillSwap | Musa | `module/marketplace` | /marketplace/* /skillswap | `/api/marketplace`, `marketplace_*` |
| B3 | Review Hub & Opportunities | Musa | `module/reviews` | /reviews/* /opportunities /alumni | `/api/reviews`, `reviews_*` |
| C1 | Lost & Found with OCR | Ali | `module/lostfound` | /lost-found/* | `/api/lostfound`, `lostfound_*` |
| C2 | Complaints, Help Box & FAQ | Ali | `module/support` | /complaints/* /help-box /faq/* | `/api/support`, `support_*` |
| C3 | Campus Map & Guide + Bill Splitting | Ali | `module/campus` | /map /guide /bills/* | `/api/campus`, `campus_*` |

Sub-branches `module/<slug>/<task>` are allowed and merge into their module branch only.

## 5. Base phase (before `v0.1-base`)

The base is built in parallel on three branches with disjoint files:

| Branch | Owner | May edit |
|--------|-------|----------|
| `base/client` | Musa (Base-1) | `client/src/core/` (except `ui/`), `client/src/modules/*/` (stubs only), `client/src/main.jsx`, `client/index.html`, `client/vite.config.js`, `client/package.json` |
| `base/server` | Omer (Base-2) | `server/src/core/`, `server/src/modules/*/` (stubs only), `server/package.json` |
| `base/tooling` | Ali (Base-3) | `client/src/core/ui/`, `.github/`, root configs (`package.json`, ESLint, Prettier, EditorConfig, `.env.example`), `docs/modules/*/` templates |

See `docs/PROJECT_PLAN.md` §3 for the full scope and QA gate 0.

## 6. End of every session (do this before stopping)

1. Append an entry to the **Session log** in `docs/modules/<slug>/README.md`: date, developer, what was done,
   what is next, and any blockers or contract questions.
2. Tick off completed deliverables in that file's phase checklist.
3. Commit on your branch with a clear message. Don't push or open PRs unless the user asks.
   **No AI attribution:** never add `Co-Authored-By: Claude` trailers, "Generated with Claude Code" lines, or
   any other AI attribution to commits, PRs or issues. Commits are authored only by the developer's own git identity.
4. Never edit `docs/STATUS.md` from a module branch. It is updated on `main` at phase gates.

## 7. Server-side registry contracts (as built)

Modules still never import each other. The server loader keeps every manifest in `app.locals.modules` (slug to manifest), and a
module may read optional members from another module's manifest through it. All are optional: always handle "missing", "throws"
and "slow" (1.5 s) by skipping that module. Full details live in the owning module's `docs/modules/<slug>/README.md` until they are
folded into `docs/CONTRACTS.md` through a `core-change`.

| Manifest member | Owner | Called by | Meaning |
|-----------------|-------|-----------|---------|
| `searchProvider(q, { limit })` | every module | dashboard `/api/dashboard/search` | `[{ id, title, snippet, type, url }]`, same-site `url`. Reviews returns opportunities with `type: 'opportunity'` for the dashboard widget |
| `summaryProvider(userId)` | every module | dashboard `/api/dashboard/summary` | `{ stat: { label, value }, recent: [...] }`. Labels match the dashboard cards ("Active Rides", "Marketplace Listings", "Saved Reviews", "Upcoming Events") |
| `summaryProvider(null, { scope: 'all' })` | every module | admin analytics | Platform-wide figure, no user. Only `stat` is used, `recent` is dropped |
| `moderationHooks.hide(id)` / `restore(id)` and optional `targetTypes: [...]` | content modules | admin moderation | Hidden content is invisible to students (lists, search, direct URL) and visible to moderators |
| `userModeration = { warn, suspend, unsuspend }` | auth | admin | `(userId, note) => true / false` |
| `contactForNotifications(userIds)` | auth | dashboard email digest | In-process only, returns verified users who allow email. No HTTP route may ever return an email |
| `deleteUserData(userId)` | any module storing personal data | auth "delete my data" | Delete or anonymise that user's data |
| `notify(userId, { type, title, body, link, important })` | dashboard | any module | `important: true` also goes into the daily email digest |
| `adminRoutes[]` with `label` | any module | admin layout | Shown as an admin tab. Use `roles` to restrict (the admin layout is already limited to moderators and admins) |

Until `v0.1-base` is tagged, module branches may be cut from a local merge of `base/server` and `origin/base/client`; re-merge `main`
once the tag exists.

## 8. Where things are

| Need | File |
|------|------|
| Full plan: modules, phases, QA gates, workflow | `docs/PROJECT_PLAN.md` |
| Requirements (FR-1 to FR-17, NFRs, roles, sitemap) | `docs/REQUIREMENTS.md` |
| Design tokens, typography, components, screens, journeys | `docs/DESIGN.md` |
| Contract shapes and stub behaviour | `docs/CONTRACTS.md` |
| Project-wide phase status | `docs/STATUS.md` |
| Git workflow, PR and QA process | `CONTRIBUTING.md` |
| Wireframes, hi-fi screens, design board | `docs/design/` |
| Clickable prototype (open in a browser) | `docs/design/prototype/index.html` |
| Figma source | https://www.figma.com/design/w48djUFeKM5mkgF7JCW7bu |
