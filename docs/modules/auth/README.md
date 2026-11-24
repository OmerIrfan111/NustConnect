# A1 — Auth & Profiles

> Owned by the `module/auth` branch. This file is edited only on that branch.
> Claude sessions: read this first, and append to the **Session log** before ending.

| | |
|-|-|
| Owner | Omer |
| Cross-tester | Ali |
| Branch | `module/auth` |
| Folders | `client/src/modules/auth/`, `server/src/modules/auth/`, `docs/modules/auth/` |
| Requirements | FR-1, FR-2 (O2 Verify, NFR Security) |
| Design | UI-06 Login (`docs/design/hifi/UI-06.png`), UI-07 Registration (`docs/design/hifi/UI-07.png`). Profile & settings: follow the design system. |
| Client routes | /login /register /verify /forgot-password /profile /settings |
| API prefix | `/api/auth/*` |
| Collections | `auth_users`, `auth_tokens` |
| Contracts provided | Session/roles (`session.js`, `useAuth.js`), user lookup `GET /api/auth/users/lookup`, warn/suspend for A3 |
| Contracts consumed | `notify()` (A2) optional |

Full spec: `docs/PROJECT_PLAN.md` (module section). Contract shapes: `docs/CONTRACTS.md`.

## Current state

**Phase:** 1 (Core) built, awaiting live-DB QA. Branch was cut from local `base/server` + `origin/base/client` because `v0.1-base` is not tagged yet; re-merge `main` once it is.  
**Phase 2 (Depth) is built** too. **Next step:** run QA-1 and QA-2 against a real MongoDB (with SMTP or the dev console mailer), then start Phase 3 (roles, alumni verification, delete my data, rate limiting, CSRF, lockout).

## Phase 1 — Core

**Deliverables**

- [x] Login and Register pages exactly per UI-06 / UI-07 (name, NUST email, department/school, batch, password, confirm, terms)
- [x] User model, bcrypt hashing, register/login/logout endpoints, JWT in httpOnly cookie
- [x] Replace base stubs in server `session.js` and client `useAuth.js` (same exported names)
- [x] NUST email domain rule via `ALLOWED_EMAIL_DOMAINS`

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Register → login → refresh keeps session; wrong password / duplicate email show clear errors
- [x] Non-NUST email rejected server-side, not only in UI (API test)
- [ ] Other modules still run; dev fake-user switch keeps working

## Phase 2 — Depth

**Deliverables**

- [x] Email verification link (nodemailer), forgot / reset password, Remember me
- [x] Profile page (view/edit name, department, batch, avatar) and Settings (privacy + contact preferences)
- [x] `verified` flag exposed by `useAuth`
- [x] `GET /api/auth/users/lookup?q=`

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [x] Unverified account cannot reach protected pages; verified one can
- [x] Reset token expires and cannot be reused
- [x] Lookup returns only id, name, verified – never email or phone

## Phase 3 — Integration & hardening

**Deliverables**

- [ ] Roles: student, alumni, moderator, admin; `requireRole()`
- [ ] Alumni verification route; "delete my data" action
- [ ] Rate limiting, CSRF, account lockout, input validation
- [ ] Unit + API tests for auth flows

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Role matrix test: each role vs each protected route
- [ ] Password never in logs or responses; cookies httpOnly + sameSite
- [ ] SRS NFR security checklist passes; lint + tests green

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | public | Create account (name, email, department, batch, password, confirmPassword, acceptTerms). 201 + cookie. 400 with per-field `details`, 409 duplicate email |
| POST | /api/auth/login | public | `{ email, password, remember }`. 200 + cookie. Same 401 for unknown email and wrong password |
| POST | /api/auth/logout | public | Clears the cookie, 204 |
| GET | /api/auth/me | session (unverified allowed) | Current user (`id, name, email, role, verified, department, batch`) |
| POST | /api/auth/verify-email | public | `{ token }`. Marks the account verified. Link works once, 24 h. 400 when invalid, expired or used |
| POST | /api/auth/resend-verification | session (unverified allowed) | Issues a fresh link; the old one stops working |
| POST | /api/auth/forgot-password | public | `{ email }`. Always the same 200 answer, mail only if the account exists |
| POST | /api/auth/reset-password | public | `{ token, password, confirmPassword }`. Token works once, 1 h. Signs out all older sessions |
| PATCH | /api/auth/profile | verified | `name, department, batch` only (role and verified cannot be set here) |
| PATCH | /api/auth/settings | verified | `profileVisibility, contactPreference, emailNotifications, phone` (phone preference needs a phone) |
| POST | /api/auth/profile/avatar | verified | multipart `avatar`, JPEG/PNG/WebP, max 2 MB, random file name under `/uploads/avatars` |
| GET | /api/auth/users/lookup?q= | verified | Contract §7: `[{ id, name, verified }]`, min 2 chars, max 10 results, never email/phone |

## Models

**`auth_users`** (`models/User.js`): `name, email (unique, lowercase), passwordHash (select:false), department, batch, role (student|alumni|moderator|admin), verified, suspended, timestamps`. `toPublic()` is the only shape sent to clients.
User also has `avatarUrl, phone (private), settings { profileVisibility, contactPreference, emailNotifications }, passwordChangedAt`.

**`auth_tokens`** (`models/Token.js`): `userId, type (verify|reset), tokenHash (SHA-256, unique), expiresAt (TTL index), usedAt`. Raw tokens are only in the emailed link. Consumed with one conditional update, so a token cannot be used twice.

Email: `mailer.js` uses SMTP when `SMTP_HOST` is set (Ethereal works). Without it, mail is printed to the server console so the link can be copied in development.

Sessions: `requireAuth` rejects unverified accounts with 403 `details.code = 'unverified'`; `requireSession` (used by `/me` and resend) lets them through. On the client, only verified accounts count as signed in (`useAuth().pendingUser` holds the unverified one).

## Known issues

- Reset link opens `/forgot-password?token=...` (that route is reserved for this module) rather than a separate `/reset-password` page.
- Avatars are stored on local disk; swap behind one helper if Cloudinary is adopted.
- `passwordChangedAt` is compared at 1-second resolution against the token issue time.
- Core test `client/src/core/router/routes.test.jsx` ("guest is redirected from …", 34 cases) asserts the *placeholder's* heading "Login", so it fails now that the real Login page ("Welcome Back") exists. The redirect itself works. Needs a `core-change` to assert on the pathname only.
- API tests use a mocked User model. Not yet run against a real MongoDB.

## QA log

| Date | Gate | Tester | Result | Issues |
|------|------|--------|--------|--------|
| | | | | |

## Session log

> Newest at the bottom. One entry per Claude/dev session: what was done, what is next, blockers.

| Date | Dev | Done | Next / blockers |
|------|-----|------|-----------------|
| 2026-11-24 | Omer + Claude | Phase 1 built: server (User model, register/login/logout/me, real lookup, JWT httpOnly cookie, real `session.js` keeping the fake-auth fallback, validation, domain rule) with 10 API tests; client (real `useAuth` with session restore on refresh, AuthLayout, Login, Register, `safeNext` open-redirect guard) with 11 tests. Needed a core fix on `base/server` so API errors match the client http interceptor. | Run QA-1 on a real MongoDB and at 1440/768/375. Core-change issue for routes.test.jsx. Then Phase 2. |
| 2026-11-24 | Omer + Claude | Phase 2 built: email verification (hashed single-use tokens, nodemailer or dev console), forgot/reset password with session invalidation, verified gating on protected endpoints and on the client (`pendingUser`), profile + avatar upload, settings (privacy, contact preference, phone), `/verify`, `/forgot-password`, `/profile`, `/settings` pages. 18 new API tests, 15 new UI tests. | QA-1/QA-2 on a real MongoDB with SMTP. Phase 3. |
