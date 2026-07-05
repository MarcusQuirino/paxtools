---
"paxtools": minor
---

feat(especialidades): bloco deep-link & auto-completion via specialty level (#44)

- Wire the younger specialty system into bloco progression: a bloco's ação
  variável section is now satisfied when a linked especialidade reaches level ≥ 1,
  computed purely on read from approved `specialtyItemCompletions` counts — no
  extra storage.
- Pure logic (`src/lib/completion-logic.ts`): add `getEarnedSpecialtyIds` (approved
  item counts + catalog totals → earned specialty slugs at level ≥ 1) and
  `getEarnedSpecialtyBlocoIds` (earned slugs + eixos → satisfied blocoIds, matching
  `alternativeCompletions` names via `toSpecialtySlug`).
- Backend: `readEarnedSpecialtyBlocoIds` + shared `ramoGroupForRamo` in
  `convex/lib/progression.ts`; `snapshotProgression` now populates
  `earnedSpecialtyBlocoIds` (previously an empty-set TODO), so `detectLevelUps`
  picks up etapa advances crossed by a specialty-completed bloco. `getMyCompletions`
  / `getCompletionsForUser` return `earnedSpecialtyBlocoIds` so the client agrees
  with the server. `convex/specialties.ts` now imports the shared `ramoGroupForRamo`.
- Client: `use-progression` builds the earned-bloco set from the query and threads
  it through `Dashboard` → `EixoSection` → `BlocoCard`, so a bloco satisfied via
  especialidade shows as complete.
- Deep-link: bloco cards with `alternativeCompletions` of type `"especialidade"`
  render a "ver →" link to `/especialidades?specialty=<slug>`; the route accepts the
  `specialty` search param and auto-opens, scrolls to, and highlights that specialty
  (younger and older catalogs).
- Older (project-based) blocos are unchanged — auto-completion is derived from
  `specialtyItemCompletions` (younger) per the issue scope.
