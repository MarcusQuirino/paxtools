import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/authHelpers";

export const setRole = mutation({
  args: { role: v.union(v.literal("escoteiro"), v.literal("escotista")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role) {
      throw new Error("Papel já definido. Não é possível alterar.");
    }
    await ctx.db.patch(user._id, { role: args.role });
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.role) {
      throw new Error("Escolha seu papel antes de continuar");
    }
    await ctx.db.patch(user._id, { onboardingComplete: true });
  },
});
