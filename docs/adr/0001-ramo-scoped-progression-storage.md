---
status: accepted
---

# Ramo-scoped progression storage, and IRR as the generic recognition

An escoteiro moves up through the ramos over the years (lobinho → escoteiro → sênior → pioneiro), and each ramo's progression must be retained and kept separate for life — never lost on a ramo change, never mixed into the next ramo. We are making every progression completion **ramo-scoped**, and renaming the escoteiro-specific "Lis de Ouro" concept to the generic **IRR (Insígnia de Reconhecimento de Ramo)** in code and stored data, while keeping "Lis de Ouro" only as escoteiro's display name.

## Context

All four ramos reuse identical `blocoId`s and identical `lis_*` recognition-item ids, and the completion queries fetch every row `by_userId` with no ramo filter. Actions were already safe (`actionId` embeds the ramo, e.g. `lobinho:bloco:fixed:0`), but three record kinds were **not** ramo-tagged — `specialtyCompletions` and `customActions` (keyed by bare `blocoId`) and `lisDeOuroCompletions` (keyed by shared `lis_*` itemId), plus the `specialty:`/`custom:` `plannedItems` keys. Changing ramo never deleted data, but on a transition those un-tagged rows **bled** into the new ramo's view (a lobinho's Cruzeiro item stored as `lis_jornada` would be reinterpreted as escoteiro's Jornada de Travessia). Latent today because prod holds only escoteiros with no transitions.

## Decision

- Identity of a completion becomes **`(userId, ramo, itemId/blocoId)`**. Add a `ramo` field to `specialtyCompletions`, `customActions`, `plannedItems`, and the recognition table; filter all completion reads by `(userId, ramo)` via a `by_userId_and_ramo` index. Actions stay as-is (ramo already in the id).
- Rename the recognition concept **Lis de Ouro → IRR** everywhere in code (symbols) and stored data (item ids `lis_*` → `irr_*`, table `lisDeOuroCompletions` → `irrCompletions`). "Lis de Ouro" survives **only** as escoteiro's display string, returned by `getRamoRules("escoteiro").irr.name`. Each ramo's etapas, IRR name, items, and colours come from a single per-ramo `getRamoRules(ramo)` deep module.

## Considered options

- **Keep shared `lis_*` ids as opaque slot keys** (no migration). Rejected: leaves stale escoteiro-flavoured ids standing in for other ramos' items, and does not by itself close the bleed — the read path still matches across ramos.
- **Per-ramo item ids** (`cruzeiro_promessa`, `bp_expedicao`, …). Rejected as the *mechanism*: the ramo belongs in a first-class field, not encoded into every id string. Adding `ramo` achieves the isolation the per-ramo ids were reaching for, and keeps the 5-slot ids stable.

## Consequences

- Migration is safe by construction: prod is all escoteiros with no transitions, so backfill stamps `escoteiro` everywhere (asserted, not assumed, by checking every `actionCompletions` id is `escoteiro:*`). The table rename is a **copy-forward** to `irrCompletions`, leaving the source table intact until the copy is verified.
- Shipped in two workstreams: **A** — display generalization only (`getRamoRules`, per-ramo etapa/IRR names, ramo threaded through the pure helpers), safe alone because the bleed is latent; **B** — the atomic IRR-ify + ramo-scope + migration, landed before any real ramo transition can occur.
