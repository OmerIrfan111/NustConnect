# NUSTConnect

**One campus. One community. Everything connected.**

A NUST-only student community platform that brings everyday campus services into one verified ecosystem: RideShare,
Review Hub, Marketplace, Lost & Found (with OCR), Complaint Tracker, Anonymous Help Box & FAQ, Campus Map, Bill Splitting,
Opportunities, Trips & Meetups, SkillSwap and Donations.

CS-313 Web Engineering semester project. Team: Muhammad Omer Irfan, Muhammad Musa Nadeem, Ali Abdullah Wasif.

## Stack

React (Vite) + React Router · Node.js + Express · MongoDB (Mongoose) · npm workspaces (`client/`, `server/`)

## Status

Pre-base: planning docs only. See [`docs/STATUS.md`](docs/STATUS.md).
Run instructions (`npm run setup && npm run dev`) will be added with the base version (`v0.1-base`).

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
