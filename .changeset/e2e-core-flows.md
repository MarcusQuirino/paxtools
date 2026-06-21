---
"paxtools": patch
---

Add end-to-end coverage for the core mutating user workflows, complementing the existing read-only specs:

- `escoteiro/mark-action`: an escoteiro self-marks a progression action (pending) and unmarks it (self-cleaning).
- `escoteiro/onboarding-complete`: the full role → ramo → skip-group onboarding flow lands a new escoteiro on the dashboard (repeatable — the seed resets this fixture each run).
- `escotista/approval-workflow`: an escoteiro marks an action → it appears in the escotista's pending queue → the escotista rejects it → it is removed (two browser contexts; reject deletes the row so no approved/locked state leaks between runs).

All specs follow the existing fixture/storageState conventions and pass against the dev backend (`bun test:e2e`, 13/13).
