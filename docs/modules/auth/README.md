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

**Phase:** not started (waiting for `v0.1-base`)  
**Next step:** after the base is tagged, create `module/auth` from `v0.1-base` and start Phase 1.

## Phase 1 — Core

**Deliverables**

- [ ] Login and Register pages exactly per UI-06 / UI-07 (name, NUST email, department/school, batch, password, confirm, terms)
- [ ] User model, bcrypt hashing, register/login/logout endpoints, JWT in httpOnly cookie
- [ ] Replace base stubs in server `session.js` and client `useAuth.js` (same exported names)
- [ ] NUST email domain rule via `ALLOWED_EMAIL_DOMAINS`

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Register → login → refresh keeps session; wrong password / duplicate email show clear errors
- [ ] Non-NUST email rejected server-side, not only in UI
- [ ] Other modules still run; dev fake-user switch keeps working

## Phase 2 — Depth

**Deliverables**

- [ ] Email verification link (nodemailer), forgot / reset password, Remember me
- [ ] Profile page (view/edit name, department, batch, avatar) and Settings (privacy + contact preferences)
- [ ] `verified` flag exposed by `useAuth`
- [ ] `GET /api/auth/users/lookup?q=`

**QA gate (plus the standard checklist in PROJECT_PLAN §5.1)**

- [ ] Unverified account cannot reach protected pages; verified one can
- [ ] Reset token expires and cannot be reused
- [ ] Lookup returns only id, name, verified – never email or phone

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
