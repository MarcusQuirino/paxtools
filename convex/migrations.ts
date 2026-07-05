import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const RAMO_PREFIXES = ["lobinho:", "escoteiro:", "senior:", "pioneiro:"];

function hasRamoPrefix(actionId: string): boolean {
  return RAMO_PREFIXES.some((p) => actionId.startsWith(p));
}

/**
 * One-off migration: prefix legacy unprefixed actionIds with `escoteiro:`.
 *
 * Before the multi-ramo rollout, only the escoteiro curriculum existed and
 * action IDs were stored as `${blocoId}:${type}:${index}`. The new format is
 * `${ramo}:${blocoId}:${type}:${index}`. This migration prepends `escoteiro:`
 * to any `actionCompletions` row that still uses the legacy format.
 *
 * Idempotent: rows that already have a ramo prefix are skipped.
 *
 * Collision-safe: if a user already has a new-format (4-part) row for the same
 * action — possible if they re-toggled it after the frontend deployed but
 * before this ran — we merge into the existing row (preferring `approved`) and
 * delete the legacy duplicate, so the unique `by_userId_and_actionId` index is
 * never violated (which would break `.unique()` lookups in progression.ts).
 *
 * Invoke via the Convex dashboard or CLI:
 *   bunx convex run migrations:prefixLegacyActionIds '{"dryRun": true}'
 *   bunx convex run migrations:prefixLegacyActionIds '{}'
 */
export const prefixLegacyActionIds = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const all = await ctx.db.query("actionCompletions").collect();

    let migrated = 0;
    let merged = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const doc of all) {
      if (hasRamoPrefix(doc.actionId)) {
        skipped++;
        continue;
      }
      const next = `escoteiro:${doc.actionId}`;
      if (samples.length < 5) samples.push({ from: doc.actionId, to: next });

      const existing = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId_and_actionId", (q) =>
          q.eq("userId", doc.userId).eq("actionId", next),
        )
        .unique();

      if (existing) {
        // Merge legacy row into the already-migrated one, then drop the legacy.
        merged++;
        if (!dryRun) {
          const status =
            existing.status === "approved" || doc.status === "approved"
              ? ("approved" as const)
              : existing.status;
          await ctx.db.patch(existing._id, {
            status,
            approvedBy: existing.approvedBy ?? doc.approvedBy,
            approvedAt: existing.approvedAt ?? doc.approvedAt,
            completedAt: Math.min(existing.completedAt, doc.completedAt),
          });
          await ctx.db.delete(doc._id);
        }
      } else {
        migrated++;
        if (!dryRun) {
          await ctx.db.patch(doc._id, { actionId: next });
        }
      }
    }

    return { dryRun, total: all.length, migrated, merged, skipped, samples };
  },
});

/**
 * One-off migration: prefix legacy plan keys with the `escoteiro:` ramo.
 *
 * `plannedItems.itemKey` encodes an action key as `action:${actionId}`
 * (see src/lib/plan-keys.ts). Legacy rows therefore hold
 * `action:${blocoId}:${type}:${index}`; the new format is
 * `action:${ramo}:${blocoId}:${type}:${index}`. Only `action:` keys changed —
 * `specialty:` and `custom:` keys are left untouched (blocoIds and custom
 * action ids did not change).
 *
 * Idempotent (skips keys whose action portion already has a ramo prefix) and
 * collision-safe against the unique `by_userId_and_itemKey` index.
 *
 *   bunx convex run migrations:prefixLegacyPlannedItemKeys '{"dryRun": true}'
 *   bunx convex run migrations:prefixLegacyPlannedItemKeys '{}'
 */
export const prefixLegacyPlannedItemKeys = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const all = await ctx.db.query("plannedItems").collect();

    let migrated = 0;
    let merged = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const doc of all) {
      const key = doc.itemKey;
      // Only action keys embed an action id; specialty:/custom: are unchanged.
      if (!key.startsWith("action:")) {
        skipped++;
        continue;
      }
      const actionId = key.slice("action:".length);
      if (hasRamoPrefix(actionId)) {
        skipped++;
        continue;
      }
      const next = `action:escoteiro:${actionId}`;
      if (samples.length < 5) samples.push({ from: key, to: next });

      const existing = await ctx.db
        .query("plannedItems")
        .withIndex("by_userId_and_itemKey", (q) =>
          q.eq("userId", doc.userId).eq("itemKey", next),
        )
        .unique();

      if (existing) {
        // A new-format row for this plan item already exists; drop the legacy.
        merged++;
        if (!dryRun) {
          await ctx.db.delete(doc._id);
        }
      } else {
        migrated++;
        if (!dryRun) {
          await ctx.db.patch(doc._id, { itemKey: next });
        }
      }
    }

    return { dryRun, total: all.length, migrated, merged, skipped, samples };
  },
});

/**
 * One-off migration (#36): copy the escoteiro-only `lisDeOuroCompletions` rows
 * forward into the ramo-scoped `irrCompletions`, renaming the recognition
 * concept "Lis de Ouro" → IRR in stored data.
 *
 * Copy-forward (NOT in-place) was chosen for its safety property: the source
 * table is never mutated, so counts can be compared and the change rolled back
 * before the old table is dropped (dropping it is a separate follow-up, done
 * only after prod verification). Each source row is copied with:
 *   - `ramo = "escoteiro"` stamped (prod is all escoteiros — see the assertion),
 *   - its id rewritten `lis_* → irr_*`.
 *
 * Safety: asserts EVERY `actionCompletions` id begins with `escoteiro:` before
 * copying. A non-escoteiro / transitioned action id means the all-escoteiro
 * assumption that makes the escoteiro stamp provably correct is violated, so we
 * stop rather than mislabel a row.
 *
 * Idempotent / safe to re-run: a source row whose (userId, "escoteiro",
 * irr_*id) already exists in `irrCompletions` is skipped, so a partial failure
 * can be retried without duplicating rows.
 *
 * Run and verify on the DEV deploy (handsome-walrus-236) before prod:
 *   bunx convex run migrations:copyLisDeOuroToIrr '{"dryRun": true}'
 *   bunx convex run migrations:copyLisDeOuroToIrr '{}'
 * Verify `sourceCount === destCount` (all copied) before touching prod.
 */
export const copyLisDeOuroToIrr = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // 1. Assert all-escoteiro: every action id must be escoteiro-prefixed.
    // (Ações already encode ramo in their id — this is the cheapest proof that
    // no non-escoteiro/transitioned user exists before we stamp escoteiro.)
    const actions = await ctx.db.query("actionCompletions").collect();
    const offending = actions.find((a) => !a.actionId.startsWith("escoteiro:"));
    if (offending) {
      throw new Error(
        `copyLisDeOuroToIrr: found non-escoteiro action id "${offending.actionId}" ` +
          `— a transitioned/non-escoteiro user exists; migrate manually.`,
      );
    }

    // 2. Copy each recognition row forward, stamping escoteiro + rewriting the id.
    const source = await ctx.db.query("lisDeOuroCompletions").collect();
    let copied = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const row of source) {
      const newItemId = row.itemId.replace(/^lis_/, "irr_");
      if (samples.length < 5)
        samples.push({ from: row.itemId, to: newItemId });

      const existing = await ctx.db
        .query("irrCompletions")
        .withIndex("by_userId_and_ramo_and_itemId", (q) =>
          q
            .eq("userId", row.userId)
            .eq("ramo", "escoteiro")
            .eq("itemId", newItemId),
        )
        .unique();

      if (existing) {
        skipped++;
        continue;
      }

      copied++;
      if (!dryRun) {
        await ctx.db.insert("irrCompletions", {
          userId: row.userId,
          ramo: "escoteiro",
          itemId: newItemId,
          completedAt: row.completedAt,
          status: row.status,
          approvedBy: row.approvedBy,
          approvedAt: row.approvedAt,
        });
      }
    }

    // 3. Verify: destCount should equal sourceCount once fully copied. On a
    // dryRun destCount reflects only pre-existing rows (nothing inserted).
    const destCount = (await ctx.db.query("irrCompletions").collect()).length;

    return {
      dryRun,
      sourceCount: source.length,
      copied,
      skipped,
      destCount,
      samples,
    };
  },
});
