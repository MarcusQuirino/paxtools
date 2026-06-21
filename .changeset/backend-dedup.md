---
"paxtools": patch
---

Internal refactor: remove duplication in the backend approval/membership mutations with no behavior change.

- `convex/approvals.ts`: the six single-item approve/reject mutations now delegate to `approvePendingCompletion` (auth-first) and `rejectPendingCompletion` (existence-first), preserving each path's exact check ordering. `bulkAction`'s three identical loops collapse into `bulkProcessSimple`, and `approveAllForEscoteiro`'s repeated patch loop into `approveRows` (per-table `.take` limits and the custom-action filter kept inline). Shared bulk timestamps preserved.
- `convex/groups.ts`: the seven member-admin mutations share a `loadGroupMember` helper (assert admin → load target → verify same group). `banMember`/`changeMemberRole` no longer double-call `assertAdmin`.

No exported function signatures or error messages changed. Verified by the full unit suite (268 pass), `oxlint` (0 errors), and `tsc --noEmit`.
