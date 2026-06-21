---
"paxtools": patch
---

Fix multi-ramo rollout breakage from the 3-part → 4-part action ID change:

- `convex/plan.ts`: widen `ITEM_KEY_PATTERN` to accept 4-part action keys (`action:ramo:blocoId:type:index`) — previously it only accepted legacy 3-part keys, so starring/planning any action threw "Chave de item inválida". The pattern is transition-tolerant (accepts 3- and 4-part) so it works regardless of migration timing.
- `convex/migrations.ts`: add `prefixLegacyPlannedItemKeys` to migrate `plannedItems.itemKey` action keys (the existing migration only covered `actionCompletions`), and make both migrations collision-safe — if a legacy row and an already-migrated 4-part row exist for the same `(userId, key)`, merge/drop the legacy one instead of creating a duplicate that would break `.unique()`.
- `convex/testing.ts` seed data and the escoteiro e2e specs now use the 4-part ID format.
