import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  computeStandings,
  type RamoGroup,
  type Standing,
} from "../../src/lib/especialidade-standing";

/** Upper bound on one escoteiro's rows in one ramo group. */
const MAX_ROWS = 2000;

/**
 * One escoteiro's especialidade standings in `group` — the server's only read
 * of specialtyItemCompletions / specialtyProjectReports for "where do they
 * stand". Pass `specialtyId` to read just that especialidade.
 *
 * Bloco completion, the escotista catalog/roster/stats and the escoteiro's own
 * page all go through here, so they can never count differently.
 */
export async function readStandings(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  group: RamoGroup,
  specialtyId?: string,
): Promise<Standing[]> {
  if (group === "younger") {
    const items = await ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) => {
        const scoped = q.eq("userId", userId).eq("ramoGroup", "younger");
        return specialtyId ? scoped.eq("specialtyId", specialtyId) : scoped;
      })
      .take(MAX_ROWS);
    return computeStandings("younger", { items });
  }
  const reports = await ctx.db
    .query("specialtyProjectReports")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) => {
      const scoped = q.eq("userId", userId).eq("ramoGroup", "older");
      return specialtyId ? scoped.eq("specialtyId", specialtyId) : scoped;
    })
    .take(MAX_ROWS);
  return computeStandings("older", { reports });
}
