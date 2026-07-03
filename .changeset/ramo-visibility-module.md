---
"paxtools": minor
---

Visibilidade de ramo: one module (`convex/lib/ramoVisibility.ts`) now owns the escotista→escoteiro authorization predicate; all six surfaces (write asserts, pending approvals, group members, timeline, stats, AI suggestions) consume it instead of restating the rule inline. Three deliberate behavior changes: writes on a banned escoteiro's records are rejected; an unstamped (undefined) membershipStatus counts as approved everywhere; the legacy grupo-creator admin fallback applies on every surface.
