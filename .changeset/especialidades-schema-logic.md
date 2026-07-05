---
"paxtools": minor
---

feat(especialidades): schema, migration & pure-logic prefactor (#41)

- Add `specialtyItemCompletions` table (younger ramoGroup item-level tracking)
- Add `specialtyProjectReports` table (older ramoGroup project-step tracking)
- Mark `specialtyCompletions` as deprecated (kept live during migration window; full purge deferred to #42–44)
- Add `getSpecialtyLevel(approvedCount, totalItems): 0|1|2` pure function
- Update `getCompletedBlockIds` to accept `earnedSpecialtyBlocoIds: Set<string>` (replaces raw specialtyCompletions array); callers now pass empty set until #44 wires the real computed set
- Add `migrations:migrateSpecialtyCompletions` — converts approved older rows to 3-step project reports and younger rows to per-item completions; pending rows dropped; idempotent
- Add `toSpecialtySlug(name): string` pure function (exported from `src/lib/completion-logic.ts`; shared by migrations and future #42–44 mutations)
- Add `src/data/specialty-catalog.ts` — static item counts for younger-group specialties (sourced from official guide)
