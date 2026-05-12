import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";

const ITEM_KEY_PATTERN =
  /^(action:[a-z0-9-]+:(fixed|variable):\d+|specialty:[a-z0-9-]+:.+|custom:[a-z0-9]+)$/;

const MAX_PLANNED_ITEMS = 500;

export const getMyPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_position", (q) => q.eq("userId", userId))
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

    const existing = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_itemKey", (q) =>
        q.eq("userId", user._id).eq("itemKey", args.itemKey),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return;
    }

    const last = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_position", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const nextPosition = last ? last.position + 1 : 0;

    const totalCount = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_PLANNED_ITEMS + 1);
    if (totalCount.length >= MAX_PLANNED_ITEMS) {
      throw new Error("Limite de itens no plano atingido");
    }

    await ctx.db.insert("plannedItems", {
      userId: user._id,
      itemKey: args.itemKey,
      position: nextPosition,
    });
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

    const target = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_itemKey", (q) =>
        q.eq("userId", user._id).eq("itemKey", args.itemKey),
      )
      .unique();
    if (!target) throw new Error("Item não está no plano");

    const before = args.beforeItemKey
      ? await ctx.db
          .query("plannedItems")
          .withIndex("by_userId_and_itemKey", (q) =>
            q.eq("userId", user._id).eq("itemKey", args.beforeItemKey!),
          )
          .unique()
      : null;

    const after = args.afterItemKey
      ? await ctx.db
          .query("plannedItems")
          .withIndex("by_userId_and_itemKey", (q) =>
            q.eq("userId", user._id).eq("itemKey", args.afterItemKey!),
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
