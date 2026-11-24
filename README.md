# NUSTConnect

**One campus. One community. Everything connected.**

A NUST-only student community platform that brings everyday campus services into one verified ecosystem: RideShare,
Review Hub, Marketplace, Lost & Found (with OCR), Complaint Tracker, Anonymous Help Box & FAQ, Campus Map, Bill Splitting,
Opportunities, Trips & Meetups, SkillSwap and Donations.

CS-313 Web Engineering semester project. Team: Muhammad Omer Irfan, Muhammad Musa Nadeem, Ali Abdullah Wasif.

## Stack

React (Vite) + React Router · Node.js + Express · MongoDB (Mongoose) · npm workspaces (`client/`, `server/`)

## Status

See [`docs/STATUS.md`](docs/STATUS.md) for the current phase.

## Run it

Requirements: Node 20.19 or newer, and a MongoDB (local, or a free Atlas cluster).

```bash
cp .env.example .env        # then edit MONGODB_URI if yours is not on localhost
npm run setup               # installs the client and the server (npm workspaces)
npm run dev                 # client on http://localhost:5173, API on http://localhost:5000
```

With `VITE_DEV_FAKE_AUTH=true` (the default in `.env.example`) you are signed in as the demo user "Ahmed Khan"; change
`VITE_DEV_FAKE_ROLE` to try the other roles. In development the server also starts without MongoDB (`/api/health` then
shows `db: "disconnected"`), and emails are printed to the server console instead of being sent.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Client + server together with reload |
| `npm test` | Client (Vitest) and server (Jest) tests |
| `npm run lint` | ESLint, including the rule that modules may not import each other |
| `npm run test:tooling` | Tests for the CI path-ownership check and the import-boundary rule |
| `npm run check` | Lint + tooling tests + all tests (run this before a PR) |
| `npm run format` | Prettier |
| `npm run seed -- all` | Load demo data (`-- <slug>` for one module) |
| `npm run build` | Production build of the client |

The UI kit (buttons, inputs, badges, star rating, ...) is shown at `/dev/ui` while developing.

## Documentation

| Doc | What's in it |
|-----|--------------|
| [CLAUDE.md](CLAUDE.md) | Rules for every Claude Code session (read first) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, PR and QA-gate workflow |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Module split, ownership, phases, QA gates |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Proposal + SRS: FR-1 to FR-17, NFRs, sitemap |
| [docs/DESIGN.md](docs/DESIGN.md) | Design tokens, typography, components, screens, journeys |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | The interfaces modules use to talk to each other |
| [docs/STATUS.md](docs/STATUS.md) | Project-wide progress |
| [docs/modules/](docs/modules/) | Per-module scope, checklist and session log |
| [docs/design/](docs/design/) | Wireframes, hi-fi screens, design board, clickable prototype |

Figma: https://www.figma.com/design/w48djUFeKM5mkgF7JCW7bu

## Modules

| ID | Module | Owner |
|----|--------|-------|
| A1 | Auth & Profiles | Omer |
| A2 | Dashboard, Notifications & Search | Omer |
| A3 | Admin, Moderation & Donations | Omer |
| B1 | RideShare & Trips/Meetups | Musa |
| B2 | Marketplace, FYP/ESE Hardware & SkillSwap | Musa |
| B3 | Review Hub & Opportunities | Musa |
| C1 | Lost & Found with OCR | Ali |
| C2 | Complaints, Help Box & FAQ | Ali |
| C3 | Campus Map & Guide + Bill Splitting | Ali |

*All data shown in designs and demos is sample data. Not officially affiliated with NUST.*
