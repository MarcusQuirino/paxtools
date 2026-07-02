import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { computeRamoCoverage, type Ramo } from "./lib/coverage";
import { snapshotProgression } from "./lib/progression";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ramoArg = v.optional(
  v.union(
    v.literal("lobinho"),
    v.literal("escoteiro"),
    v.literal("senior"),
    v.literal("pioneiro"),
  ),
);

/**
 * Resolve the caller (must be an approved escotista in a group) and the ramo
 * they are allowed to view. Non-admins are scoped to their escotistaRamos; an
 * admin may pass any ramo. An omitted ramo defaults to the caller's first
 * escotistaRamos entry.
 */
async function resolveScopedRamo(
  ctx: QueryCtx,
  requested: Ramo | undefined,
): Promise<{ groupId: Id<"groups">; ramo: Ramo }> {
  const caller = await getAuthenticatedUser(ctx);
  if (caller.role !== "escotista") {
    throw new Error("Apenas escotistas podem ver as estatísticas");
  }
  if (!caller.groupId) throw new Error("Você não está em nenhum grupo");
  if ((caller.membershipStatus ?? "approved") !== "approved") {
    throw new Error("Sua entrada no grupo ainda não foi aprovada");
  }
  const ramos = (caller.escotistaRamos ?? []) as Ramo[];
  const ramo = requested ?? ramos[0];
  if (!ramo) throw new Error("Selecione um ramo");
  if (!caller.isAdmin && !ramos.includes(ramo)) {
    throw new Error("Você não acompanha esse ramo");
  }
  return { groupId: caller.groupId, ramo };
}

export const getRamoCoverage = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args) => {
    const { groupId, ramo } = await resolveScopedRamo(ctx, args.ramo);
    return computeRamoCoverage(ctx, { groupId, ramo });
  },
});

export type ScoutRow = {
  _id: Id<"users">;
  name: string | null;
  stageId: string;
  stageName: string;
  completedBlockCount: number;
  joinedAt: number; // user account _creationTime (approximation of group-join)
};

export const getRamoScouts = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args) => {
    const { groupId, ramo } = await resolveScopedRamo(ctx, args.ramo);
    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .take(500);
    const scouts = members.filter(
      (m) =>
        m.role === "escoteiro" &&
        !m.bannedAt &&
        (m.membershipStatus ?? "approved") === "approved" &&
        m.ramo === ramo,
    );
    const rows: ScoutRow[] = [];
    for (const s of scouts) {
      const snap = await snapshotProgression(ctx, s._id);
      rows.push({
        _id: s._id,
        name: s.name ?? null,
        stageId: snap.stageId,
        stageName: snap.stageName,
        completedBlockCount: snap.completedBlockCount,
        joinedAt: s._creationTime,
      });
    }
    rows.sort((a, b) =>
      a.completedBlockCount !== b.completedBlockCount
        ? a.completedBlockCount - b.completedBlockCount
        : a.joinedAt - b.joinedAt, // ASC joinedAt: newest accounts last among ties (brand-new member doesn't falsely lead "who is behind")
    );
    return rows;
  },
});
