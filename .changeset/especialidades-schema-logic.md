---
"paxtools": minor
---

feat(especialidades): schema, migration & pure-logic prefactor (#41)

- Add `specialtyItemCompletions` table (younger ramoGroup item-level tracking)
- Add `specialtyProjectReports` table (older ramoGroup project-step tracking)
- Mark `specialtyCompletions` as deprecated (kept live during migration window; full purge deferred to #42–44)
- Add `getSpecialtyLevel(approvedCount, totalItems): 0|1|2` pure function
- Update `getCompletedBlockIds` to accept `earnedSpecialtyBlocoIds: Set<string>` (replaces raw specialtyCompletions array); callers now pass empty set until #44 wires the real computed set
- Add `migrations:migrateSpecialtyCompletions` — converts approved older rows to 3-step project reports and younger rows to per-item completions; pending rows dropped; idempotent. Names resolve to canonical catalog ids and are validated against the catalog: unknown names (insígnias, retired/missing specialties) are left in place and reported in `unknownSpecialties` instead of being converted or deleted; item counts come from the catalog entry itself
- Add `toSpecialtySlug(name)` and `toCanonicalSpecialtyId(name)` pure functions (exported from `src/lib/completion-logic.ts`; shared by migrations, earned-specialty matching and deep-links). `toCanonicalSpecialtyId` resolves 2025-guide renames via `LEGACY_SPECIALTY_SLUG_ALIASES` (Ciências da Terra → geologia, Tradições dos Povos Indígenas → tradicoes-dos-povos-originarios, Natureza e Ciências Ambientais → natureza-e-ciencias-naturais)
