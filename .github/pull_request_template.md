## What this PR does

<!-- Module / phase, and a few lines on what is delivered. -->

Branch type: <!-- base/*  |  module/<slug> phase-end PR  |  fix/<topic>  |  core-change/<topic> -->

## Standard QA checklist (`docs/PROJECT_PLAN.md` section 5.1)

- [ ] **Ownership:** only my module's folders were changed (the CI path check is green), and `git merge main` into this branch is conflict-free
- [ ] **Functional:** every item of the phase deliverables list works, and the module-specific QA bullets in `docs/modules/<slug>/README.md` are ticked
- [ ] **Design fidelity:** colours, Inter type scale, radius and spacing come from tokens; matches the wireframe / hi-fi design where one exists
- [ ] **Responsive:** works at 1440, 768 and 375 px with no horizontal scroll; touch targets are usable
- [ ] **States:** loading, empty and error states exist for every list and form
- [ ] **Quality:** no console errors, lint clean, new code covered by tests (API tests from Phase 2), sample data labelled as sample data
- [ ] **Docs:** `docs/modules/<slug>/README.md` lists endpoints, models, contracts used and known issues; a QA log row and a session log entry were added

## Hard rules

- [ ] No import from another module (only the session contract: `auth/useAuth.js`, `auth/session.js`)
- [ ] Privacy: help-box stores no user id; complaints visible only to owner and staff; OCR text masked; lookup never returns email or phone
- [ ] No AI attribution in commits or in this description (CLAUDE.md section 6)
- [ ] `package-lock.json` not hand-merged (run `npm install` after merging main); new dependencies only in a phase-end PR and listed below

## Dependencies added

<!-- None, or: package, version, why. -->

## Not verified / known issues

<!-- Be honest: anything not tested in a browser, against a real MongoDB, etc. -->

## Cross-tester

<!-- Omer tests Musa's modules, Musa tests Ali's, Ali tests Omer's. -->
