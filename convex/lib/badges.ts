import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Ramo } from "../../src/data/progression-data";

/** Upper bound on one escoteiro's requirement rows in one ramo. */
const MAX_ROWS = 1000;

/**
 * One escoteiro's insígnia requirement conclusões in `ramo` — the server's
 * only read of badgeRequirementCompletions for "where do they stand", so the
 * progression and the escotista's tropa view never count differently.
 */
export function readBadgeRequirements(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ramo: Ramo,
): Promise<Doc<"badgeRequirementCompletions">[]> {
  return ctx.db
    .query("badgeRequirementCompletions")
    .withIndex("by_userId_and_ramo_and_badgeId", (q) =>
      q.eq("userId", userId).eq("ramo", ramo),
    )
    .take(MAX_ROWS);
}
