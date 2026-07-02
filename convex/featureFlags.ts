import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Runtime feature flags stored in the `featureFlags` table. A missing row means
 * the flag is OFF (safe default), so shipping flagged code is inert until the
 * flag is explicitly enabled on the deployment.
 *
 * Toggle without a deploy:
 *   bunx convex run featureFlags:setFlag '{"key":"ai_suggestions","enabled":true}'
 * or edit the row in the Convex dashboard (Data → featureFlags).
 */

/** Every known flag key. Add new flags here so callers stay typo-proof. */
export const flagKeyValidator = v.union(v.literal("ai_suggestions"));
export type FlagKey = typeof flagKeyValidator.type;

/** Server-side check, usable from any query/mutation handler. */
export async function isFlagEnabled(
  ctx: QueryCtx | MutationCtx,
  key: FlagKey,
): Promise<boolean> {
  const row = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.enabled ?? false;
}

/** Public reactive read — the client uses this to show/hide flagged UI. */
export const isEnabled = query({
  args: { key: flagKeyValidator },
  handler: async (ctx, args): Promise<boolean> => isFlagEnabled(ctx, args.key),
});

/** Upsert a flag. Internal on purpose: toggled via CLI/dashboard, not the app. */
export const setFlag = internalMutation({
  args: { key: flagKeyValidator, enabled: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { enabled: args.enabled });
    } else {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        enabled: args.enabled,
      });
    }
    return null;
  },
});
