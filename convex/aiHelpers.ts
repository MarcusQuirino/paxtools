import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ramoValidator } from "./schema";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { isFlagEnabled } from "./featureFlags";
import { computeRamoCoverage, type Ramo, type RamoCoverage } from "./lib/coverage";

const REGEN_COOLDOWN_MS = 30_000;

const ideasValidator = v.array(
  v.object({
    eixoId: v.string(),
    eixoName: v.string(),
    idea: v.string(),
    groundedOn: v.array(v.string()),
  }),
);

/**
 * Resolve which ramo the caller may act on and assert access — mirrors Plan B's
 * resolveScopedRamo authz. Approved escotista in a group; non-admin scoped to
 * escotistaRamos; admin may pass any ramo; omitted ramo defaults to the first
 * escotistaRamos entry.
 */
async function resolveRamoAccess(
  ctx: QueryCtx | MutationCtx,
  requested: Ramo | undefined,
): Promise<{ groupId: Id<"groups">; ramo: Ramo }> {
  const caller = await getAuthenticatedUser(ctx);
  if (caller.role !== "escotista") {
    throw new Error("Apenas escotistas podem usar as sugestões da IA");
  }
  if (!caller.groupId) throw new Error("Você não está em nenhum grupo");
  if ((caller.membershipStatus ?? "approved") !== "approved") {
    throw new Error("Sua entrada no grupo ainda não foi aprovada");
  }
  const ramos = (caller.escotistaRamos ?? []) as Ramo[];
  const ramo = requested ?? ramos[0];
  if (!ramo) throw new Error("Você não tem nenhum ramo atribuído");
  if (!caller.isAdmin && !ramos.includes(ramo)) {
    throw new Error("Este ramo não pertence a você");
  }
  return { groupId: caller.groupId, ramo };
}

/**
 * Flag gate + authz + cooldown claim + coverage, all in one transaction (called
 * by the node action via ctx.runMutation). Stamps `requestedAt` on the cache
 * row before returning, so concurrent generate calls for the same (group, ramo)
 * serialize on the row and every one after the first hits the cooldown — a
 * query-then-write-later check would let them race into duplicate paid LLM
 * calls. A failed LLM call leaves the claim in place, so retries against a
 * broken key are also throttled to one per cooldown window.
 */
export const prepareSuggestion = internalMutation({
  args: { ramo: v.optional(ramoValidator) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    groupId: Id<"groups">;
    ramo: Ramo;
    coverage: RamoCoverage;
    cachedAt: number | null;
  }> => {
    if (!(await isFlagEnabled(ctx, "ai_suggestions"))) {
      throw new ConvexError("As sugestões da IA estão desativadas no momento");
    }
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
    const existing = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_group_and_ramo", (q) =>
        q.eq("groupId", groupId).eq("ramo", ramo),
      )
      .unique();
    const now = Date.now();
    const lastActivity = Math.max(
      existing?.generatedAt ?? 0,
      existing?.requestedAt ?? 0,
    );
    if (lastActivity > 0 && now - lastActivity < REGEN_COOLDOWN_MS) {
      throw new ConvexError("Aguarde um momento antes de gerar novamente");
    }
    if (existing) {
      await ctx.db.patch(existing._id, { requestedAt: now });
    } else {
      await ctx.db.insert("aiSuggestions", { groupId, ramo, requestedAt: now });
    }
    const coverage = await computeRamoCoverage(ctx, { groupId, ramo });
    return { groupId, ramo, coverage, cachedAt: existing?.generatedAt ?? null };
  },
});

/** Upsert the cached suggestion row for (group, ramo). */
export const saveSuggestion = internalMutation({
  args: {
    groupId: v.id("groups"),
    ramo: ramoValidator,
    perEixoIdeas: ideasValidator,
    overview: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const existing = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_group_and_ramo", (q) =>
        q.eq("groupId", args.groupId).eq("ramo", args.ramo),
      )
      .unique();
    const fields = {
      groupId: args.groupId,
      ramo: args.ramo,
      perEixoIdeas: args.perEixoIdeas,
      overview: args.overview,
      generatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("aiSuggestions", fields);
    }
    return null;
  },
});

/**
 * Public reactive read of the cached suggestion the stats page renders. Returns
 * null while the feature flag is off (the UI hides the card) and for claim-stub
 * rows that never got content.
 */
export const getCachedSuggestion = query({
  args: { ramo: v.optional(ramoValidator) },
  handler: async (ctx, args) => {
    if (!(await isFlagEnabled(ctx, "ai_suggestions"))) return null;
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
    const row = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_group_and_ramo", (q) =>
        q.eq("groupId", groupId).eq("ramo", ramo),
      )
      .unique();
    if (
      !row ||
      row.perEixoIdeas === undefined ||
      row.overview === undefined ||
      row.generatedAt === undefined
    ) {
      return null;
    }
    return {
      perEixoIdeas: row.perEixoIdeas,
      overview: row.overview,
      generatedAt: row.generatedAt,
      ramo: row.ramo,
    };
  },
});
