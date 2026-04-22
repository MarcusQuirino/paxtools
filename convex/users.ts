import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const toggleFavoriteEscoteiro = mutation({
  args: { escoteiroId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas podem favoritar escoteiros");
    }

    const target = await ctx.db.get(args.escoteiroId);
    if (!target || target.role !== "escoteiro") {
      throw new Error("Escoteiro não encontrado");
    }
    if (target.groupId !== user.groupId) {
      throw new Error("Escoteiro não pertence ao seu grupo");
    }

    const favorites = user.favoriteEscoteiroIds ?? [];
    const idx = favorites.indexOf(args.escoteiroId);
    if (idx >= 0) {
      const updated = [...favorites];
      updated.splice(idx, 1);
      await ctx.db.patch(user._id, { favoriteEscoteiroIds: updated });
    } else {
      await ctx.db.patch(user._id, {
        favoriteEscoteiroIds: [...favorites, args.escoteiroId],
      });
    }
  },
});
