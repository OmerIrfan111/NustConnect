# NUSTConnect: Project Status

> Updated **only on `main`**, as part of a phase-gate PR or a base merge. Never edit this from a module branch
> (it would cause merge conflicts). Day-to-day progress lives in `docs/modules/<slug>/README.md`.

## Current phase: **Pre-base (repo initialised, docs only)**

## Milestones

| Milestone | Tag | Status | Date |
|-----------|-----|--------|------|
| Repo + planning docs | — | ✅ Done | 2026-11-23 |
| Base version (QA gate 0) | `v0.1-base` | ⏳ Not started | |
| Phase 1: Core (QA-1) | `phase-1` | ⬜ | |
| Phase 2: Depth (QA-2) | `phase-2` | ⬜ | |
| Phase 3: Integration & hardening (QA-3) | `phase-3` | ⬜ | |
| Phase 4: Release (QA-4) | `v1.0` | ⬜ | |

## Base tasks

| Task | Owner | Branch | Status |
|------|-------|--------|--------|
| Base-1: client shell, landing, auto-loader, placeholders, fake auth | Musa | `base/client` | ⬜ |
| Base-2: server core, loader, contract stubs, seed runner | Omer | `base/server` | ⬜ |
| Base-3: UI kit, tooling, CI, CODEOWNERS, doc templates | Ali | `base/tooling` | ⬜ |

## Module gate status

| ID | Module | Owner | QA-1 | QA-2 | QA-3 |
|----|--------|-------|------|------|------|
| A1 | auth | Omer | ⬜ | ⬜ | ⬜ |
| A2 | dashboard | Omer | ⬜ | ⬜ | ⬜ |
| A3 | admin | Omer | ⬜ | ⬜ | ⬜ |
| B1 | rideshare | Musa | ⬜ | ⬜ | ⬜ |
| B2 | marketplace | Musa | ⬜ | ⬜ | ⬜ |
| B3 | reviews | Musa | ⬜ | ⬜ | ⬜ |
| C1 | lostfound | Ali | ⬜ | ⬜ | ⬜ |
| C2 | support | Ali | ⬜ | ⬜ | ⬜ |
| C3 | campus | Ali | ⬜ | ⬜ | ⬜ |

Legend: ⬜ not started · ⏳ in progress · 🔍 in cross-test · ✅ passed

## Open core-change requests

_None._

## Decisions log

| Date | Decision |
|------|----------|
| 2026-11-23 | Repo initialised. Word/PDF docs converted to Markdown in `docs/`. Originals kept outside git. |
| 2026-11-23 | Base branches named `base/client`, `base/server`, `base/tooling`. Client module stubs belong to Base-1. |
