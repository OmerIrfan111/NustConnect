# NUSTConnect: Module Contracts

Contracts are the **only** allowed coupling between modules. Each one is defined once, stubbed in the base, and later
replaced by its real owner **without changing the exported names or shapes**. Build against the stub. Never import
another module's files.

> Changing a contract shape is a `core-change`: open an issue and agree on it with all three developers first.

## 1. Module manifest (every module)

**Client:** `client/src/modules/<slug>/module.config.js`

```js
export default {
  slug: 'rideshare',
  title: 'RideShare',
  nav: [ { label: 'RideShare', path: '/rides', icon: 'car', group: 'main' | 'more', order: 20 } ],
  routes: [ { path: '/rides', element: lazy(() => import('./pages/FindRide.jsx')), auth: true } ],
  publicRoutes: [ /* routes guests can open, e.g. /map, /faq */ ],
  adminRoutes: [ { label: 'Rides', path: '/admin/rides', element: … } ],   // rendered by A3's admin layout
  slots: { /* optional named UI slots, e.g. topbar widgets (A2 only) */ },
};
```

**Server:** `server/src/modules/<slug>/index.js`

```js
module.exports = {
  slug: 'rideshare',
  router,                                         // Express router, mounted at /api/<slug>
  searchProvider: async (q, { limit }) => [...],  // optional
  summaryProvider: async (userId) => ({...}),     // optional
  moderationHooks: { hide: async (id) => {}, restore: async (id) => {} }, // optional, modules with user content
};
```

Base stub: a placeholder page ("Coming soon – owned by module/&lt;slug&gt;") and `GET /api/<slug>/ping → { ok: true, slug }`.

**Client manifest details (as built in the base):**

- Route objects are `{ path, component, title?, roles? }`. `component` is a React component (use `lazy()` for big pages).
- `publicRoutes[].layout`: `'adaptive'` (default: AppShell when signed in, visitor shell otherwise), `'visitor'` or `'bare'`.
- `nav[].icon` is a `lucide-react` component. `group: 'main'` items are the 12 designed sidebar items (ordered by `order`:
  10, 20, …, 120). Everything else goes in `group: 'more'` (`order` 200+).
- Allowed `slots`: `topbarSearch` and `topbarNotifications` (A2), and `adminLayout` (A3, must render `<Outlet />`).
- The registry reports slug/folder mismatches, duplicate paths and unknown slots as console warnings, and unit tests fail on them.
- Full guide: `client/src/core/README.md`.

## 2. Session / roles (owner: A1)

| Side | Location | Exports |
|------|----------|---------|
| Server | `server/src/modules/auth/session.js` | `requireAuth`, `optionalAuth`, `requireRole(role)` (Express middleware; sets `req.user = { id, name, role, verified }`) |
| Client | `client/src/modules/auth/useAuth.js` | `<AuthProvider>` (core wraps the app in it) and `useAuth() → { user, isAuthenticated, login, logout }`, where `user = { id, name, email, role, verified, department, batch }` |

Roles: `student`, `alumni`, `moderator`, `admin`.
**Stub:** when `VITE_DEV_FAKE_AUTH=true`, the demo user "Ahmed Khan" is logged in. The role is switchable in `.env`.

> These are the one sanctioned cross-module import: every module may import `useAuth` / `session.js` from `auth`.
> The ESLint boundary rule whitelists exactly these two paths.

## 3. `notify()` (owner: A2)

```js
// server/src/modules/dashboard/notify.js
notify(userId, { type, title, body, link })   // link = client route, e.g. '/rides/123'
```

**Stub:** `console.log` only.

## 4. Search provider (A2 aggregates, every module supplies)

```js
searchProvider(q, { limit }) → [{ id, title, snippet, type, url }]
```

**Stub:** no aggregator. Providers are optional, and the aggregator skips modules without one.

## 5. Summary provider (A2 aggregates, every module supplies)

```js
summaryProvider(userId) → { stat: { label, value }, recent: [{ text, url, at }] }
```

**Stub:** the dashboard uses sample JSON.

## 6. Reporting / moderation (owner: A3)

- Core component `<ReportButton targetType="ride" targetId="123" />` POSTs to `/api/admin/reports`.
- Modules with user content export `moderationHooks.hide(id)` / `restore(id)`. Hidden items must not be returned to
  students (lists, search or direct URL) but remain visible to moderators.

**Stub:** the button renders, and the POST returns 202.

## 7. User lookup (owner: A1)

```
GET /api/auth/users/lookup?q=<text>  →  [{ id, name, verified }]
```

Never returns email or phone. **Stub:** returns 3 sample users.

## 8. Campus locations (owner: C3)

```
GET /api/campus/locations  →  [{ id, name, category, lat, lng }]
```

**Stub:** returns 5 sample points. Consumers (RideShare pickup points) must fall back to free text if it fails.

## 9. Admin panels (A3 renders)

A module may list `adminRoutes[]` in its client manifest. A3's admin layout renders them in its sidebar.
**Stub:** empty list.

## 10. Cross-module links

Modules link to each other only by **route path** with IDs, for example a trip storing `rideId` and `billId` and linking to
`/rides/:id` and `/bills/:id`. No shared models, no imports.
