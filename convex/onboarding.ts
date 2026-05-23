import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { ramoValidator } from "./schema";

export const setRole = mutation({
  args: { role: v.union(v.literal("escoteiro"), v.literal("escotista")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role && user.onboardingComplete) {
      throw new Error("Papel já definido. Não é possível alterar.");
    }
    const patch: Record<string, unknown> = { role: args.role };
    if (args.role === "escoteiro") {
      patch.escotistaRamos = undefined;
    } else {
      patch.ramo = undefined;
    }
    await ctx.db.patch(user._id, patch);
  },
});

export const setEscoteiroRamo = mutation({
  args: { ramo: ramoValidator },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escoteiro") {
      throw new Error("Apenas escoteiros têm ramo único");
    }
    await ctx.db.patch(user._id, { ramo: args.ramo });
  },
});

export const setEscotistaRamos = mutation({
  args: { ramos: v.array(ramoValidator) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas têm múltiplos ramos");
    }
    const dedup = Array.from(new Set(args.ramos));
    if (dedup.length === 0) throw new Error("Selecione pelo menos um ramo");
    await ctx.db.patch(user._id, { escotistaRamos: dedup });
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.role) {
      throw new Error("Escolha seu papel antes de continuar");
    }
    if (user.role === "escoteiro" && !user.ramo) {
      throw new Error("Escolha seu ramo antes de continuar");
    }
    if (
      user.role === "escotista" &&
      (!user.escotistaRamos || user.escotistaRamos.length === 0)
    ) {
      throw new Error("Escolha pelo menos um ramo antes de continuar");
    }
    await ctx.db.patch(user._id, { onboardingComplete: true });
  },
});
