import { query } from "./_generated/server";
import { v } from "convex/values";
import { computeRamoCoverage } from "./lib/coverage";
import { snapshotProgression } from "./lib/progression";
import { filterActiveGrupoMembers, resolveRamoAccess } from "./lib/ramoVisibility";
import type { Id } from "./_generated/dataModel";

const ramoArg = v.optional(
  v.union(
    v.literal("lobinho"),
    v.literal("escoteiro"),
    v.literal("senior"),
    v.literal("pioneiro"),
  ),
);

export const getRamoCoverage = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args) => {
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
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
    const { groupId, ramo } = await resolveRamoAccess(ctx, args.ramo);
    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .take(500);
    // Grupo-wide on purpose: access to (groupId, ramo) was already asserted
    // upstream by resolveRamoAccess; the roster is ramo-selected, not
    // re-scoped to the caller's own ramos.
    const scouts = filterActiveGrupoMembers(groupId, members).filter(
      (m) => m.role === "escoteiro" && m.ramo === ramo,
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
