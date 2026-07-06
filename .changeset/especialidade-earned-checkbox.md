---
"paxtools": patch
---

fix(especialidades): mark the specialty checkbox when a bloco is auto-completed via items

A bloco satisfied by an earned especialidade (level ≥ 1 via `specialtyItemCompletions`, #44)
showed 100% complete, but the especialidade's checkbox in the bloco view stayed empty — the
escoteiro had to re-mark it by hand. The bloco's completion came from `earnedSpecialtyBlocoIds`
while the checkbox only read legacy `specialtyCompletions` rows, so the two disagreed.

- Backend: `readEarnedSpecialtyBlocoIds` now also returns `specialtyIds` (the earned canonical
  ids), and `getMyCompletions` / `getCompletionsForUser` return `earnedSpecialtyIds` alongside
  `earnedSpecialtyBlocoIds` — blocos list many alternatives, so the blocoId alone can't say which
  one to mark.
- Pure logic: add `getSpecialtyMark` in `src/lib/completion-logic.ts` — resolves a specialty's
  checked/pending/locked state from both sources (earned-via-items wins: checked, approved, and
  read-only since toggling can't undo item completions).
- Client: thread `earnedSpecialtyIds` through `use-progression` → `Dashboard` / plan view →
  `EixoSection` → `BlocoCard` → `SpecialtySection`, and through `resolvePlanItems` for the plan
  list view. An especialidade earned via items now renders checked, approved, and locked
  everywhere.
