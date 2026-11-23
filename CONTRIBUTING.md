# Contributing to NUSTConnect

Three developers, nine modules, one repo. Following this workflow keeps merges conflict-free.
Full background is in `docs/PROJECT_PLAN.md` §2 and §5.

## Branches

| Branch | Purpose | Merges into |
|--------|---------|-------------|
| `main` | Protected. Always runnable. Tagged at each gate. | — |
| `base/client`, `base/server`, `base/tooling` | Building the base (before `v0.1-base`) | `main` |
| `module/<slug>` | One per module, created from tag `v0.1-base` | `main` (via PR at phase end) |
| `module/<slug>/<task>` | Optional task branch | `module/<slug>` only |
| `fix/<topic>` | Phase 4 integration fixes, small and short-lived | `main` |

Never push to `main` directly. Use **merge commits**, not rebase, on shared branches.

## Daily loop

```bash
git checkout module/<slug>
# ... work only inside your three folders ...
git add -A && git commit -m "<slug>: short description"
git push origin module/<slug>
```

Pull `main` into your branch whenever it moves (`git merge main`). This should always be conflict-free. If it isn't,
someone has edited a file outside their folders, so raise it with the team.

## Where you may edit

On `module/<slug>`:
- `client/src/modules/<slug>/`
- `server/src/modules/<slug>/`
- `docs/modules/<slug>/`

Anything else (core, root configs, `.github/`, top-level docs, `package-lock.json` by hand) is off limits.
Open an issue labelled **`core-change`** instead.

## Commit messages

`<slug>: <imperative summary>`, for example `rideshare: add seat request endpoint`, `base/client: sidebar from manifests`.

## End of phase

1. **Self-QA** on your branch: tick the module checklist in `docs/modules/<slug>/README.md` and the standard
   checklist (`PROJECT_PLAN.md` §5.1).
2. `git merge main` into your branch. It must be conflict-free.
3. Run `npm install` if dependencies changed (regenerate the lockfile, don't hand-merge it). Lint + tests must be green.
4. Open a **PR into `main`** with the QA checklist filled in.
5. **Cross-test** on `main`: Omer tests Musa's modules, Musa tests Ali's, Ali tests Omer's. Bugs go in as GitHub issues labelled
   `<slug>` + `S1`/`S2`/`S3`.
6. Once all three groups pass (zero S1, zero S2), update `docs/STATUS.md` on `main` and tag `phase-N`.

## Defect severity

| Level | Meaning |
|-------|---------|
| S1 | Blocks a journey or leaks private data |
| S2 | Wrong behaviour with a workaround |
| S3 | Cosmetic |

## Adding a dependency

Only in your phase-end PR. Add it to your workspace (`client` or `server`) and mention it in the PR description.
After merging main, run `npm install`.

## Working with Claude Code

Every session must follow `CLAUDE.md`. In short: check the branch, read your module's README, stay in your
folders, and append to the module's **Session log** before you finish.
