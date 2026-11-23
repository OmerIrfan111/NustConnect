# Server core (Base-2)

Frozen after `v0.1-base`. Changes go through a `core-change` issue.

| File | Purpose |
|------|---------|
| `config.js` | Reads the repo-root `.env` once. Modules import settings from here. |
| `app.js` | `createApp()`: helmet, CORS (credentials), JSON, cookies, rate limit, `/uploads`, `/api/health`, module loader, 404 + error handler. No DB or `listen()`, so tests can use it. |
| `loader.js` | Globs `modules/*/index.js`, checks `slug === folder` and a `router`, mounts at `/api/<slug>`. Bad manifests are skipped with a warning (`app.locals.loaderWarnings`). `app.locals.modules` is the slug → manifest registry, used by A2 (search/summary) and A3 (moderation hooks) via `providersOf()`. |
| `errors.js` | `HttpError(status, message, details)`, `notFound`, `errorHandler`. Every error is `{ error: { status, message, details? } }`. |
| `db.js` | `connectDb()`, `disconnectDb()`, `dbState()`. |
| `seed.js` | `npm run seed -- <slug>` or `-- all`. Runs `modules/<slug>/seed.js` (an exported async function). |
| `index.js` | Entry point. In development the server still starts when MongoDB is down (`/api/health` shows `db: "disconnected"`). In production it exits. |

## Run

```
npm run dev --workspace server     # or: npm run dev   (inside server/)
npm test --workspace server
npm run seed --workspace server -- all
```

## Environment variables (read from the repo-root `.env`)

`PORT` (5000), `MONGODB_URI`, `CLIENT_URL` (CORS origin, default `http://localhost:5173`), `JWT_SECRET`, `JWT_EXPIRES_IN`,
`ALLOWED_EMAIL_DOMAINS` (comma list), `UPLOAD_DIR`, `MAX_UPLOAD_MB`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `VITE_DEV_FAKE_AUTH`, `VITE_DEV_FAKE_ROLE`.
Base-3 should list all of these in `.env.example`.

## Contract stubs shipped in the base

| Contract | File | Stub behaviour |
|----------|------|----------------|
| Session / roles | `modules/auth/session.js` | `requireAuth`, `optionalAuth`, `requireRole(...roles)` (admin always passes). Demo user when `VITE_DEV_FAKE_AUTH=true`, else 401. |
| `notify()` | `modules/dashboard/notify.js` | `console.log` only, never throws. |
| User lookup | `GET /api/auth/users/lookup?q=` | 3 sample users (id, name, verified). Needs a session. |
| Campus locations | `GET /api/campus/locations` | 5 sample points. |
| Reporting | `POST /api/admin/reports` | 202, discards. Needs a session. |
| Every module | `GET /api/<slug>/ping` | `{ ok: true, slug }` |

## Writing a module manifest

`modules/<slug>/index.js` exports `{ slug, router, searchProvider?, summaryProvider?, moderationHooks? }` (see `docs/CONTRACTS.md` §1).
Prefix every collection with the slug (`rideshare_rides`). Put seed data in `modules/<slug>/seed.js`.
