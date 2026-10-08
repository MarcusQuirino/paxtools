import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { currentRamo } from "./lib/progression";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { Ramo } from "../src/data/progression-data";

// Action keys carry the ramo prefix since the multi-ramo refactor
// (`action:ramo:blocoId:type:index`). We accept 1 or 2 segments before
// `type:index` so legacy 3-part keys (`action:blocoId:type:index`) still
// validate during/after the data migration — see migrations.ts.
// `especialidade:<id>` is a catalog specialty starred on /especialidades.
const ITEM_KEY_PATTERN =
  /^(action:([a-z0-9-]+:){1,2}(fixed|variable):\d+|specialty:[a-z0-9-]+:.+|especialidade:[a-z0-9-]+|custom:[a-z0-9]+)$/;

const MAX_PLANNED_ITEMS = 500;

export const getMyPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.bannedAt) return [];

    // Ramo-scoped (#37): only the current ramo's plan, ordered by position, so a
    // past ramo's planned items don't clutter it.
    return await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_ramo_and_position", (q) =>
        q.eq("userId", userId).eq("ramo", currentRamo(user)),
      )
      .take(MAX_PLANNED_ITEMS);
  },
});

export const togglePlanned = mutation({
  args: {
    itemKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!ITEM_KEY_PATTERN.test(args.itemKey)) {
      throw new Error("Chave de item inválida");
    }

    // All lookups/writes are scoped to the acting user's current ramo (#37).
    const ramo = currentRamo(user);

    const existing = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
        q.eq("userId", user._id).eq("ramo", ramo).eq("itemKey", args.itemKey),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return;
    }

    await appendPlanned(ctx, user._id, ramo, args.itemKey);
  },
});

/** Append `itemKey` at the end of the user's Plano for `ramo` (cap-checked). */
async function appendPlanned(
  ctx: MutationCtx,
  userId: Id<"users">,
  ramo: Ramo,
  itemKey: string,
) {
  const last = await ctx.db
    .query("plannedItems")
    .withIndex("by_userId_and_ramo_and_position", (q) =>
      q.eq("userId", userId).eq("ramo", ramo),
    )
    .order("desc")
    .first();

  const nextPosition = last ? last.position + 1 : 0;

  const totalCount = await ctx.db
    .query("plannedItems")
    .withIndex("by_userId_and_ramo_and_position", (q) =>
      q.eq("userId", userId).eq("ramo", ramo),
    )
    .take(MAX_PLANNED_ITEMS + 1);
  if (totalCount.length >= MAX_PLANNED_ITEMS) {
    throw new Error("Limite de itens no plano atingido");
  }

  await ctx.db.insert("plannedItems", { userId, ramo, itemKey, position: nextPosition });
}

/** The caller's Plano row for `itemKey` in their current ramo, validating the key. */
async function findOwnPlanned(ctx: MutationCtx, itemKey: string) {
  const user = await getAuthenticatedUser(ctx);
  if (!ITEM_KEY_PATTERN.test(itemKey)) {
    throw new Error("Chave de item inválida");
  }
  const ramo = currentRamo(user);
  const existing = await ctx.db
    .query("plannedItems")
    .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
      q.eq("userId", user._id).eq("ramo", ramo).eq("itemKey", itemKey),
    )
    .unique();
  return { user, ramo, existing };
}

/**
 * Idempotent add (Revisão rápida): appends the item if absent, does nothing if
 * present — a stale swipe never removes a Plano item. `added` tells the undo
 * whether there is anything to take back. Escoteiro-only: no target argument.
 */
export const addToPlan = mutation({
  args: { itemKey: v.string() },
  handler: async (ctx, args): Promise<{ added: boolean }> => {
    const { user, ramo, existing } = await findOwnPlanned(ctx, args.itemKey);
    if (existing) return { added: false };
    await appendPlanned(ctx, user._id, ramo, args.itemKey);
    return { added: true };
  },
});

/**
 * Remove the item if present (undo of an addToPlan that added it); a no-op
 * otherwise. Escoteiro-only: no target argument.
 */
export const removeFromPlan = mutation({
  args: { itemKey: v.string() },
  handler: async (ctx, args): Promise<{ removed: boolean }> => {
    const { existing } = await findOwnPlanned(ctx, args.itemKey);
    if (!existing) return { removed: false };
    await ctx.db.delete(existing._id);
    return { removed: true };
  },
});

export const reorderPlan = mutation({
  args: {
    itemKey: v.string(),
    beforeItemKey: v.optional(v.string()),
    afterItemKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const ramo = currentRamo(user);

    const target = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
        q.eq("userId", user._id).eq("ramo", ramo).eq("itemKey", args.itemKey),
      )
      .unique();
    if (!target) throw new Error("Item não está no plano");

    const before = args.beforeItemKey
      ? await ctx.db
          .query("plannedItems")
          .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
            q
              .eq("userId", user._id)
              .eq("ramo", ramo)
              .eq("itemKey", args.beforeItemKey!),
          )
          .unique()
      : null;

    const after = args.afterItemKey
      ? await ctx.db
          .query("plannedItems")
          .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
            q
              .eq("userId", user._id)
              .eq("ramo", ramo)
              .eq("itemKey", args.afterItemKey!),
          )
          .unique()
      : null;

    let newPosition: number;
    if (before && after) {
      newPosition = (before.position + after.position) / 2;
    } else if (before) {
      newPosition = before.position + 1;
    } else if (after) {
      newPosition = after.position - 1;
    } else {
      throw new Error("Reordenação inválida");
    }

    await ctx.db.patch(target._id, { position: newPosition });
  },
});
