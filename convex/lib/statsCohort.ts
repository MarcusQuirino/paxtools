import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Ramo } from "../../src/data/progression-data";
import {
  filterActiveGrupoMembers,
  resolveRamoAccess,
  type RamoViewer,
} from "./ramoVisibility";
import { filterToObservedSection, resolveObservedSection } from "./sections";

/** Upper bound on escoteiros per grupo read at once (same as the pending list). */
const MAX_ESCOTEIROS = 500;

export type StatsCohort = {
  viewer: RamoViewer;
  groupId: Id<"groups">;
  ramo: Ramo;
  /** Active escoteiros currently in `ramo`, narrowed to the observed seção. */
  scouts: Doc<"users">[];
  observedSection: Doc<"sections"> | null;
};

/**
 * The single cohort every stats query counts, so they can never disagree:
 * access to (grupo, ramo) is asserted by resolveRamoAccess, then the ramo's
 * active escoteiros are narrowed to the viewer's seção observada (an unplaced
 * escoteiro stays in, per CONTEXT.md).
 */
export async function resolveStatsCohort(
  ctx: QueryCtx,
  requestedRamo: Ramo | undefined,
): Promise<StatsCohort> {
  const { viewer, groupId, ramo } = await resolveRamoAccess(ctx, requestedRamo);
  const members = await ctx.db
    .query("users")
    .withIndex("by_groupId_and_role", (q) =>
      q.eq("groupId", groupId).eq("role", "escoteiro"),
    )
    .take(MAX_ESCOTEIROS);
  const observedSection = await resolveObservedSection(ctx, viewer.user, groupId);
  const scouts = filterToObservedSection(
    observedSection?._id ?? null,
    filterActiveGrupoMembers(groupId, members).filter((m) => m.ramo === ramo),
  );
  return { viewer, groupId, ramo, scouts, observedSection };
}
