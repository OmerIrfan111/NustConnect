# client/src/core — base-owned client core

Built on `base/client` (Base-1, Musa). **Frozen after `v0.1-base`.** Changes need a `core-change` issue
(see `CLAUDE.md`). `core/ui/` belongs to Base-3 (Ali) and is not covered here.

## Layout

| Path | What it is |
|------|------------|
| `theme/tokens.css` | **The one theme file.** Every colour, font size, radius, shadow and spacing token (`--nc-*`). |
| `theme/global.css` | Inter font, reset, base element styles. Imported once in `main.jsx`. |
| `modules/registry.js` | Globs `src/modules/*/module.config.js` and builds `registry.{nav, routes, publicRoutes, adminRoutes, slots}`. |
| `router/routes.jsx` | Builds the React Router tree from the registry. `router/guards.jsx` holds `RequireAuth`, `RequireRole` and `AdaptiveLayout`. |
| `layouts/` | `VisitorLayout` (top nav + footer), `AppShell` (sidebar + top bar + content), `Sidebar`, `Topbar`, `Footer`. |
| `landing/` | The real landing page (UI-01). Copy and sample data are in `content.js`. |
| `pages/` | `Placeholder` (used by every module stub), About, Contact, Privacy, 404, 403, loading. |
| `brand/Logo.jsx` | Logo and logo mark. |
| `api/http.js` | Shared axios instance (`/api`, cookies, normalised errors). |

## For module owners — how to build your module

1. Everything you write goes in `client/src/modules/<slug>/`. Start by replacing the `placeholder(...)` components in your
   `module.config.js` with real pages (`pages/FindRide.jsx` and so on). Lazy-load big pages:
   `component: lazy(() => import('./pages/FindRide.jsx'))`. Core wraps every route in `<Suspense>`.
2. Manifest route options:

   | Key | Meaning |
   |-----|---------|
   | `routes[]` | Signed-in only, rendered inside the AppShell. Guests are redirected to `/login?next=…`. |
   | `publicRoutes[]` | Guests allowed. `layout: 'adaptive'` (default) shows the AppShell when signed in and the visitor shell otherwise. `'visitor'` always uses the top-nav shell. `'bare'` uses no shell (for example a full-screen login, UI-06). |
   | `adminRoutes[]` | Admin/moderator only, rendered inside A3's admin layout. |
   | `roles: [...]` | On any route: shows a 403 unless the user has one of these roles. |
   | `title` | Sets the browser tab title. |
   | `nav[]` | Sidebar entries: `{ label, path, icon, group: 'main' \| 'more', order, roles? }`. `icon` is a `lucide-react` component. |
3. Imports you may use from core: `@core/api/http.js`, `@core/pages/Placeholder.jsx`, `@core/ui/*` (once Base-3 lands)
   and tokens via CSS variables. Use CSS modules (`Thing.module.css`) next to your components, with tokens only.
4. Auth: `import { useAuth } from '../auth/useAuth.js'` (the one allowed cross-module import). It returns
   `{ user, isAuthenticated, login, logout }`.
5. Never import from another module's folder. Link to it by path (`<Link to="/bills/123">`).

## Dev fake auth

Set these in the **repo-root** `.env` (Vite reads env from the root via `envDir: '..'`):

```
VITE_DEV_FAKE_AUTH=true      # sign in as demo user "Ahmed Khan" on load
VITE_DEV_FAKE_ROLE=student   # student | alumni | moderator | admin
```

With fake auth off, protected routes redirect to the `/login` placeholder. In dev, that page has a
"continue as demo user" button.

## Running (until the root workspace lands)

```bash
cd client && npm install && npm run dev   # http://localhost:5173 (API proxied to :5000)
npm test                                   # Vitest: registry + routing tests
```

## Handoff notes for the other base tasks

- **Base-2 (server):** the client proxies `/api` and `/uploads` to `http://localhost:5000`. The client stubs expect the same
  slugs as the server modules.
- **Base-3 (tooling / UI kit):**
  - Root `package.json` should list `client` and `server` as workspaces. `client/package.json` already has `dev`, `build` and `test` scripts.
  - `.env.example` needs `VITE_DEV_FAKE_AUTH`, `VITE_DEV_FAKE_ROLE` and `VITE_API_URL` (optional, default `/api`).
  - The Vitest config lives in `client/vite.config.js` (`test:` block, jsdom, `src/test/setup.js`). Extend it rather than adding a second config.
  - UI kit components should use the `--nc-*` tokens from `theme/tokens.css`.
  - Add `core/ui/DevUiPage.jsx` (default export) and it is mounted automatically at `/dev/ui` in development.
  - ESLint boundary rule: modules may import `@core/*` and `../auth/useAuth.js` only.
  - The landing page and shell use local CSS-module styles for buttons and cards. Once the UI kit merges, swap them for
    `core/ui` components in a small core change.

## Session log

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-23 | Musa | Vite + React scaffold, tokens + Inter, module registry + 9 client stubs, auth stub with fake auth, router + guards, VisitorLayout, AppShell (manifest sidebar, top bar slots, profile menu, mobile drawer), landing page (UI-01, 1440/768/375), About/Contact/Privacy/404/403, http client, 15 tests | Swap landing/shell buttons and cards to the `core/ui` kit after Base-3. Wire `npm run setup && npm run dev` once root workspace + server exist. Run the QA gate 0 no-conflict test. |
