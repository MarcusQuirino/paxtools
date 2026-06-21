---
"paxtools": patch
---

Add convex-test characterization tests for the backend mutation/query surface (groups, approvals, progression, plan, onboarding, users, authHelpers), pinning current behavior with a bias toward the security-critical paths: cross-group/ramo authorization, banned-user gating, the approval lock, and pending→approved transitions. Test-only change; no runtime behavior is modified.
