---
"paxtools": patch
---

Add env-gated Convex testing module (`testing.ts`) with idempotent seed and predicate-bounded wipe for E2E test data, plus a hidden test-only credentials provider in `convex/auth.ts` and a matching test sign-in form on `/signin` — all gated by `TEST_AUTH` / `VITE_TEST_AUTH`.
