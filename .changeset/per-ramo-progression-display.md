---
"paxtools": minor
---

Per-ramo progression display (Workstream A, #35): a new `getRamoRules(ramo)` deep module in `src/data/progression-rules.ts` replaces the escoteiro-only `STAGES`/`LIS_DE_OURO_*` constants, returning each ramo's own etapas (variable count — three or four) and its IRR (name, colours, block threshold of 18, and the five recognition items). The pure progression helpers (`getCurrentStage`/`getNextStage`/`getBlocksToIrr`/`allBlocksCompleted`/`isIrrComplete`) now take the ramo and are count-agnostic, so sênior/pioneiro render exactly three etapas at 0/6/12 with no phantom fourth stage. The stage banner, recognition section, escotista pending view, stage-distribution stats, and the level-up toast/event all read the viewed escoteiro's ramo-correct names/colours/items. Escoteiro output is unchanged (regression-locked). No storage, schema, id (`lis_*`), table, or migration changes — those remain Workstream B (#36/#37).
