import { ConvexError, v } from "convex/values";
import { internalQuery, internalMutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ramoValidator } from "./schema";
import { getAuthenticatedUser } from "./lib/authHelpers";
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
  ctx: QueryCtx,
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
 * Authz + rate-limit + coverage, all in one round trip (called by the node
 * action via ctx.runQuery). When `force` is true (the regenerate button), throw
 * if a cached row for (group, ramo) is younger than the cooldown.
 */
export const prepareSuggestion = internalQuery({
  args: { ramo: v.optional(ramoValidator), force: v.boolean() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    groupId: Id<"groups">;
    ramo: Ramo;
    coverage: RamoCoverage;
    cachedAt: number | null;
  }> => {
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
    const existing = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_group_and_ramo", (q) =>
        q.eq("groupId", groupId).eq("ramo", ramo),
      )
      .unique();
    const cachedAt = existing?.generatedAt ?? null;
    if (
      args.force &&
      cachedAt !== null &&
      Date.now() - cachedAt < REGEN_COOLDOWN_MS
    ) {
      throw new ConvexError("Aguarde um momento antes de gerar novamente");
    }
    const coverage = await computeRamoCoverage(ctx, { groupId, ramo });
    return { groupId, ramo, coverage, cachedAt };
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

/** Public reactive read of the cached suggestion the stats page renders. */
export const getCachedSuggestion = query({
  args: { ramo: v.optional(ramoValidator) },
  handler: async (ctx, args) => {
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
    const row = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_group_and_ramo", (q) =>
        q.eq("groupId", groupId).eq("ramo", ramo),
      )
      .unique();
    if (!row) return null;
    return {
      perEixoIdeas: row.perEixoIdeas,
      overview: row.overview,
      generatedAt: row.generatedAt,
      ramo: row.ramo,
    };
  },
});
