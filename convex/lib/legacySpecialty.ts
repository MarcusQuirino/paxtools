import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { toCanonicalSpecialtyId } from "../../src/lib/completion-logic";
import { YOUNGER_SPECIALTY_BY_ID } from "../../src/data/specialty-data/younger";
import { OLDER_SPECIALTY_BY_ID } from "../../src/data/specialty-data/older";
import { ramoGroupForRamo, DEFAULT_RAMO } from "./progression";

/** The three etapas of an older especialidade project (ADR 0002). */
const PROJECT_STEPS = ["conhecer", "fazer", "compartilhar"] as const;

/** What `drainLegacySpecialtyRow` did with a row, for the migration's tally. */
export type DrainOutcome =
  | "converted"
  | "droppedPending"
  | "droppedUnresolvable";

/**
 * Drain ONE legacy `specialtyCompletions` row: convert it into the new tables
 * when its `specialtyName` still resolves to a catalog entry, then delete it.
 *
 * `migrations:migrateSpecialtyCompletions` (ran on prod 2026-07-05) already did
 * this for the rows that existed then — but `toggleSpecialty` stayed live for
 * the whole additive-rollout window (#47), so an escoteiro could mark an
 * especialidade AFTER the conversion ran. Those stragglers are real, earned
 * especialidades: deleting them unconverted would silently drop an escoteiro's
 * conquest and the bloco credit that comes with it. So the drain converts
 * first, on the same rules as the original migration:
 *
 *  - Pending rows are dropped without conversion (the escoteiro re-marks the
 *    items/etapas under the new UI) — a pending legacy row can no longer be
 *    approved anywhere, so keeping it would strand it.
 *  - Younger (lobinho/escoteiro): one approved `specialtyItemCompletions` row
 *    per catalog item ⇒ level ≥ 1, i.e. earned.
 *  - Older (sênior/pioneiro): all three approved `specialtyProjectReports`
 *    steps ⇒ earned (ADR 0002).
 *  - Names with no catalog entry — insígnias ("Insígnia do Aprender",
 *    "Diálogo Inter-religioso", both catalogued as `type: "insignia"`) and
 *    retired especialidades ("Noções Desportivas") — are dropped: #47 decided
 *    insígnias are out of scope for the especialidades catalog and nothing
 *    tracks them anymore.
 *
 * Idempotent: an already-converted (userId, ramoGroup, specialtyId) target row
 * is left as-is rather than duplicated.
 */
export async function drainLegacySpecialtyRow(
  ctx: MutationCtx,
  row: Doc<"specialtyCompletions">,
): Promise<DrainOutcome> {
  if (row.status === "pending") {
    await ctx.db.delete(row._id);
    return "droppedPending";
  }

  const ramoGroup = ramoGroupForRamo(row.ramo ?? DEFAULT_RAMO);
  const specialtyId = toCanonicalSpecialtyId(row.specialtyName);

  const outcome =
    ramoGroup === "older"
      ? await convertOlder(ctx, row, specialtyId)
      : await convertYounger(ctx, row, specialtyId);

  await ctx.db.delete(row._id);
  return outcome;
}

async function convertYounger(
  ctx: MutationCtx,
  row: Doc<"specialtyCompletions">,
  specialtyId: string,
): Promise<DrainOutcome> {
  const entry = YOUNGER_SPECIALTY_BY_ID.get(specialtyId);
  if (!entry) return "droppedUnresolvable";

  const existing = await ctx.db
    .query("specialtyItemCompletions")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q
        .eq("userId", row.userId)
        .eq("ramoGroup", "younger")
        .eq("specialtyId", specialtyId),
    )
    .collect();
  const alreadyDone = new Set(existing.map((i) => i.itemIndex));

  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    if (alreadyDone.has(itemIndex)) continue;
    await ctx.db.insert("specialtyItemCompletions", {
      userId: row.userId,
      ramoGroup: "younger",
      specialtyId,
      itemIndex,
      completedAt: row.completedAt,
      status: "approved",
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
    });
  }
  return "converted";
}

async function convertOlder(
  ctx: MutationCtx,
  row: Doc<"specialtyCompletions">,
  specialtyId: string,
): Promise<DrainOutcome> {
  if (!OLDER_SPECIALTY_BY_ID.has(specialtyId)) return "droppedUnresolvable";

  const existing = await ctx.db
    .query("specialtyProjectReports")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q
        .eq("userId", row.userId)
        .eq("ramoGroup", "older")
        .eq("specialtyId", specialtyId),
    )
    .collect();
  const alreadyDone = new Set(existing.map((r) => r.step));

  for (const step of PROJECT_STEPS) {
    if (alreadyDone.has(step)) continue;
    await ctx.db.insert("specialtyProjectReports", {
      userId: row.userId,
      ramoGroup: "older",
      specialtyId,
      step,
      text: `Migrado do sistema legado (${row.specialtyName})`,
      completedAt: row.completedAt,
      status: "approved",
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
    });
  }
  return "converted";
}
