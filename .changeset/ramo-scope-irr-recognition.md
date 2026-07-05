---
"paxtools": minor
---

Ramo-scope the recognition (IRR) completions and rename "Lis de Ouro" → IRR in code and stored data (Workstream B, #36). Recognition rows now live in a new `irrCompletions` table keyed by `(userId, ramo, itemId)`: reads (`getMyCompletions`, `getCompletionsForUser`, `snapshotProgression`) return only the subject's current-ramo items via the `by_userId_and_ramo_and_itemId` index, and writes stamp the acting escoteiro's ramo — so a scout who changes ramos keeps a separate, retained recognition record per ramo with no cross-ramo bleed. Item ids are renamed `lis_* → irr_*` and the public mutations become `toggleIrrItem` / `approveIrrItem` / `rejectIrrItem` (bulk arg `irrIds`). "Lis de Ouro" survives only as escoteiro's display name via `getRamoRules("escoteiro").irr.name`; the `events` audit type is left unchanged.

Migration `migrations:copyLisDeOuroToIrr` copies each `lisDeOuroCompletions` row forward into `irrCompletions` with `ramo = "escoteiro"` stamped and its id rewritten, after asserting every `actionCompletions` id is escoteiro-prefixed. It is copy-forward (the source table is left intact for verification/rollback), idempotent, and supports `dryRun`.

Rollout: the app reads `irrCompletions`, which is empty until the migration runs — run `migrations:copyLisDeOuroToIrr` on the dev deploy (handsome-walrus-236) and verify `sourceCount === destCount` before prod, then run it immediately after the prod deploy. Dropping the deprecated `lisDeOuroCompletions` table is a follow-up once prod counts are verified.
