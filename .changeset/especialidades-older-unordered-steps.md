---
"paxtools": minor
---

feat(especialidades): drop step blocking for older projects & complete blocos on earn

Older-ramo (sênior/pioneiro) especialidades are three-step projects (conhecer →
fazer → compartilhar). They previously enforced a strict order — a step could
only be submitted once its predecessor was approved, and the UI locked later
steps. In QA this proved to be friction, so we drop the gate (ADR 0002).

- **Unordered steps.** `submitSpecialtyStep` no longer requires the predecessor
  to be approved; the escoteiro writes and submits the three reports in any
  order. The frontend `isLocked` / "Bloqueado" state and its copy are removed.
- **Binary grant on all-three-approved.** Approvals stay per-step and independent
  (trickle into the escotista queue as written). The specialty is earned the
  moment the *third* step reaches `approved` — whichever step that is —
  replacing the `compartilhar`-specific trigger for the level-up cascade.
- **Older especialidades now complete their bloco.** `readEarnedSpecialtyBlocoIds`
  gains an older branch: a specialty earned (all three steps approved) satisfies
  any bloco that names it as an alternative completion, mirroring the younger
  path (#44). Previously this was hard-returned empty for older ramos, so a fully
  approved project never counted toward progression. Derived on read — retroactive,
  no migration.

Rejection stays delete-based for now (preserving the report text on rejection is
deferred; see ADR 0002).
