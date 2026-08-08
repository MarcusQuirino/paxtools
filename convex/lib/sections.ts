import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type Ramo = Doc<"sections">["ramo"];

const RAMOS: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];

export const MAX_SECTION_NAME_LENGTH = 60;

/**
 * Upper bound on how many seções one grupo's list is read at a time. A grupo
 * runs a handful (one or two per ramo), so this only exists to keep the read
 * bounded as the table grows.
 */
const MAX_SECTIONS_PER_GROUP = 200;

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

/** A grupo's seções, oldest first. */
export async function listSectionsOfGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<Doc<"sections">[]> {
  return await ctx.db
    .query("sections")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .take(MAX_SECTIONS_PER_GROUP);
}

/**
 * Give a grupo one seção per named ramo in `ramoNames`, so the unit names an
 * escotista typed before seções existed are not lost.
 *
 * Idempotent per (ramo, name): the migrations component may resume a batch mid
 * grupo, so re-running must not duplicate a seção — and it must still create
 * the ramos it did not reach, which is why it dedupes per name rather than
 * skipping any grupo that already has seções.
 */
export async function createSectionsFromRamoNames(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  ramoNames: Doc<"groups">["ramoNames"],
): Promise<Id<"sections">[]> {
  if (!ramoNames) return [];

  const existing = await listSectionsOfGroup(ctx, groupId);

  const created: Id<"sections">[] = [];
  for (const ramo of RAMOS) {
    const name = ramoNames[ramo]?.trim();
    if (!name) continue;
    if (existing.some((s) => s.ramo === ramo && s.name === name)) continue;
    created.push(await ctx.db.insert("sections", { groupId, name, ramo }));
  }
  return created;
}

/**
 * Migration body: back-fill one grupo's seções from its legacy `ramoNames`.
 * Soft-deleted grupos are skipped — there is nobody left to organise.
 */
export async function backfillSectionsForGroup(
  ctx: MutationCtx,
  group: Doc<"groups">,
): Promise<Id<"sections">[]> {
  if (group.deletedAt) return [];
  return await createSectionsFromRamoNames(ctx, group._id, group.ramoNames);
}
