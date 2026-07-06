---
"paxtools": minor
---

Unified E2E Playwright suite (#58): one suite targeting local or staging via `E2E_TARGET`, always-reseeded deterministic dataset (canonical users + simulated troop on both targets), parallel read-only phase in desktop + mobile viewports followed by a mutating phase parallelized through disjoint persona ownership, full R1–R6/M1–M20 scenario map coverage, and a manually-triggered `e2e-staging.yml` GitHub Actions workflow with failure artifacts.
