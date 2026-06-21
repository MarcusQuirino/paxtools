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
 * to any record that still uses the legacy format.
 *
 * Idempotent: rows that already have a ramo prefix are skipped.
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
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const doc of all) {
      if (hasRamoPrefix(doc.actionId)) {
        skipped++;
        continue;
      }
      const next = `escoteiro:${doc.actionId}`;
      if (samples.length < 5) samples.push({ from: doc.actionId, to: next });
      if (!dryRun) {
        await ctx.db.patch(doc._id, { actionId: next });
      }
      migrated++;
    }

    return {
      dryRun,
      total: all.length,
      migrated,
      skipped,
      samples,
    };
  },
});
