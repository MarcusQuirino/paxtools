import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type Ramo = Doc<"sections">["ramo"];

const RAMOS: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];

export const MAX_SECTION_NAME_LENGTH = 60;

/**
 * Trim and validate a seção name. Same shape of check the legacy
 * `groups.ramoNames` entries got, with a Portuguese error.
 */
export function sanitizeSectionName(raw: string): string {
  const name = raw.trim();
  if (!name) throw new Error("Nome da seção é obrigatório");
  if (name.length > MAX_SECTION_NAME_LENGTH) {
    throw new Error("Nome da seção muito longo");
  }
  return name;
}

/**
 * Give a grupo one seção per named ramo in its legacy `ramoNames`, so the unit
 * names an escotista typed before seções existed are not lost.
 *
 * Idempotent per (ramo, name): the migrations component may resume a batch, and
 * `createGroup` shares this helper, so re-running must not duplicate a seção.
 * Soft-deleted grupos are skipped — there is nobody left to organise.
 */
export async function backfillSectionsForGroup(
  ctx: MutationCtx,
  group: Doc<"groups">,
): Promise<Id<"sections">[]> {
  if (group.deletedAt) return [];
  const ramoNames = group.ramoNames;
  if (!ramoNames) return [];

  const existing = await ctx.db
    .query("sections")
    .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
    .collect();

  const created: Id<"sections">[] = [];
  for (const ramo of RAMOS) {
    const name = ramoNames[ramo]?.trim();
    if (!name) continue;
    if (existing.some((s) => s.ramo === ramo && s.name === name)) continue;
    created.push(
      await ctx.db.insert("sections", { groupId: group._id, name, ramo }),
    );
  }
  return created;
}
