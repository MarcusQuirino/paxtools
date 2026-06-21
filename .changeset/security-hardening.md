---
"paxtools": patch
---

Security hardening of the backend authorization surface (behavior-preserving for legitimate users; only abuse paths are now rejected):

- **Block self privilege-escalation**: `setRole` can no longer change an existing role once the user is in a group (previously an approved member could self-promote escoteiro→escotista because the join flow never sets `onboardingComplete`).
- **Lock the test-auth provider to `signIn`**: the env-gated test-password provider now rejects every non-`signIn` flow, closing the `signUp` path that could mint `@test.paxtools.local` sessions without the shared secret.
- **Block ramo self-expansion**: `setEscoteiroRamo`/`setEscotistaRamos` now refuse to change ramos once the user is in a group (ramo changes go through the admin-gated member setters).
- **Close cross-ramo IDOR**: `assertEscotistaInSameGroup` now fails the ramo boundary for a ramo-less escoteiro instead of skipping it, matching the read-path filters.
- **Gate pending members**: `assertEscotistaInSameGroup` now rejects targets who are not yet approved members, so a pending member cannot be read/approved before admin approval.
- **Banned-user self-reads**: `viewer`, `getMyCompletions`, and `getMyPlan` now return empty for banned users (mutations already blocked them).
- **Preserve the last-admin invariant**: `joinGroup`/`createGroup` now refuse to strand a group whose sole admin is the caller.
