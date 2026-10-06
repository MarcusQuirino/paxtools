import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Ramo } from "../../src/data/progression-data";
import { resolveRamoAccess, type RamoViewer } from "./ramoVisibility";
import { readObservedEscoteiros } from "./sections";

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
 * escoteiros the viewer is observing (readObservedEscoteiros).
 */
export async function resolveStatsCohort(
  ctx: QueryCtx,
  requestedRamo: Ramo | undefined,
): Promise<StatsCohort> {
  const { viewer, groupId, ramo } = await resolveRamoAccess(ctx, requestedRamo);
  const { escoteiros, observedSection } = await readObservedEscoteiros(ctx, viewer, {
    ramo,
  });
  return { viewer, groupId, ramo, scouts: escoteiros, observedSection };
}
