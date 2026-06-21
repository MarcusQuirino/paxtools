import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { ramoValidator } from "./schema";

export const setRole = mutation({
  args: { role: v.union(v.literal("escoteiro"), v.literal("escotista")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    // Role is a one-time onboarding choice. Lock it once the user has finished
    // onboarding OR has joined a group — otherwise an approved member could
    // self-promote escoteiro→escotista (the join flow never sets
    // onboardingComplete, so that flag alone left a hole). Role changes for
    // grouped members must go through the admin-gated changeMemberRole.
    if (user.role && (user.onboardingComplete || user.groupId)) {
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
    // Self-service ramo selection is for onboarding only (the ramo is chosen
    // before joining a group). Once in a group, ramo changes must go through
    // the admin-gated setMemberRamo so a member can't escape ramo scoping.
    if (user.groupId) {
      throw new Error("Peça a um administrador para alterar seu ramo");
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
    // Self-service ramo selection is for onboarding only. Once in a group, a
    // non-admin escotista must not widen their own ramo scope (that would
    // defeat the ramo-based visibility/approval filtering); ramo changes go
    // through the admin-gated setMemberRamos.
    if (user.groupId) {
      throw new Error("Peça a um administrador para alterar seus ramos");
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
