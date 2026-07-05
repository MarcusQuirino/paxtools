import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const RAMO_PREFIXES = ["lobinho:", "escoteiro:", "senior:", "pioneiro:"];

function hasRamoPrefix(actionId: string): boolean {
  return RAMO_PREFIXES.some((p) => actionId.startsWith(p));
}

/**
 * Assert prod's all-escoteiro invariant: every `actionCompletions` id must be
 * `escoteiro:`-prefixed. Ações encode ramo in their id, so a non-escoteiro id
 * is the cheapest proof that a transitioned/non-escoteiro user exists — in which
 * case stamping `escoteiro` everywhere would mislabel rows, so we stop instead.
 */
async function assertAllEscoteiro(ctx: MutationCtx, caller: string) {
  const actions = await ctx.db.query("actionCompletions").collect();
  const offending = actions.find((a) => !a.actionId.startsWith("escoteiro:"));
  if (offending) {
    throw new Error(
      `${caller}: found non-escoteiro action id "${offending.actionId}" ` +
        `— a transitioned/non-escoteiro user exists; migrate manually.`,
    );
  }
}

/**
 * One-off migration: prefix legacy unprefixed actionIds with `escoteiro:`.
 *
 * Before the multi-ramo rollout, only the escoteiro curriculum existed and
 * action IDs were stored as `${blocoId}:${type}:${index}`. The new format is
 * `${ramo}:${blocoId}:${type}:${index}`. This migration prepends `escoteiro:`
 * to any `actionCompletions` row that still uses the legacy format.
 *
 * Idempotent: rows that already have a ramo prefix are skipped.
 *
 * Collision-safe: if a user already has a new-format (4-part) row for the same
 * action — possible if they re-toggled it after the frontend deployed but
 * before this ran — we merge into the existing row (preferring `approved`) and
 * delete the legacy duplicate, so the unique `by_userId_and_actionId` index is
 * never violated (which would break `.unique()` lookups in progression.ts).
 *
 * Invoke via the Convex dashboard or CLI:
 *   bunx convex run migrations:prefixLegacyActionIds '{"dryRun": true}'
 *   bunx convex run migrations:prefixLegacyActionIds '{}'
 */
export const prefixLegacyActionIds = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const all = await ctx.db.query("actionCompletions").collect();

    let migrated = 0;
    let merged = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const doc of all) {
      if (hasRamoPrefix(doc.actionId)) {
        skipped++;
        continue;
      }
      const next = `escoteiro:${doc.actionId}`;
      if (samples.length < 5) samples.push({ from: doc.actionId, to: next });

      const existing = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId_and_actionId", (q) =>
          q.eq("userId", doc.userId).eq("actionId", next),
        )
        .unique();

      if (existing) {
        // Merge legacy row into the already-migrated one, then drop the legacy.
        merged++;
        if (!dryRun) {
          const status =
            existing.status === "approved" || doc.status === "approved"
              ? ("approved" as const)
              : existing.status;
          await ctx.db.patch(existing._id, {
            status,
            approvedBy: existing.approvedBy ?? doc.approvedBy,
            approvedAt: existing.approvedAt ?? doc.approvedAt,
            completedAt: Math.min(existing.completedAt, doc.completedAt),
          });
          await ctx.db.delete(doc._id);
        }
      } else {
        migrated++;
        if (!dryRun) {
          await ctx.db.patch(doc._id, { actionId: next });
        }
      }
    }

    return { dryRun, total: all.length, migrated, merged, skipped, samples };
  },
});

/**
 * One-off migration: prefix legacy plan keys with the `escoteiro:` ramo.
 *
 * `plannedItems.itemKey` encodes an action key as `action:${actionId}`
 * (see src/lib/plan-keys.ts). Legacy rows therefore hold
 * `action:${blocoId}:${type}:${index}`; the new format is
 * `action:${ramo}:${blocoId}:${type}:${index}`. Only `action:` keys changed —
 * `specialty:` and `custom:` keys are left untouched (blocoIds and custom
 * action ids did not change).
 *
 * Idempotent (skips keys whose action portion already has a ramo prefix) and
 * collision-safe against the unique `by_userId_and_itemKey` index.
 *
 *   bunx convex run migrations:prefixLegacyPlannedItemKeys '{"dryRun": true}'
 *   bunx convex run migrations:prefixLegacyPlannedItemKeys '{}'
 */
export const prefixLegacyPlannedItemKeys = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const all = await ctx.db.query("plannedItems").collect();

    let migrated = 0;
    let merged = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const doc of all) {
      const key = doc.itemKey;
      // Only action keys embed an action id; specialty:/custom: are unchanged.
      if (!key.startsWith("action:")) {
        skipped++;
        continue;
      }
      const actionId = key.slice("action:".length);
      if (hasRamoPrefix(actionId)) {
        skipped++;
        continue;
      }
      const next = `action:escoteiro:${actionId}`;
      if (samples.length < 5) samples.push({ from: key, to: next });

      const existing = await ctx.db
        .query("plannedItems")
        .withIndex("by_userId_and_itemKey", (q) =>
          q.eq("userId", doc.userId).eq("itemKey", next),
        )
        .unique();

      if (existing) {
        // A new-format row for this plan item already exists; drop the legacy.
        merged++;
        if (!dryRun) {
          await ctx.db.delete(doc._id);
        }
      } else {
        migrated++;
        if (!dryRun) {
          await ctx.db.patch(doc._id, { itemKey: next });
        }
      }
    }

    return { dryRun, total: all.length, migrated, merged, skipped, samples };
  },
});

/**
 * One-off migration (#36): copy the escoteiro-only `lisDeOuroCompletions` rows
 * forward into the ramo-scoped `irrCompletions`, renaming the recognition
 * concept "Lis de Ouro" → IRR in stored data.
 *
 * Copy-forward (NOT in-place) was chosen for its safety property: the source
 * table is never mutated, so counts can be compared and the change rolled back
 * before the old table is dropped (dropping it is a separate follow-up, done
 * only after prod verification). Each source row is copied with:
 *   - `ramo = "escoteiro"` stamped (prod is all escoteiros — see the assertion),
 *   - its id rewritten `lis_* → irr_*`.
 *
 * Safety: asserts EVERY `actionCompletions` id begins with `escoteiro:` before
 * copying. A non-escoteiro / transitioned action id means the all-escoteiro
 * assumption that makes the escoteiro stamp provably correct is violated, so we
 * stop rather than mislabel a row.
 *
 * Idempotent / safe to re-run: a source row whose (userId, "escoteiro",
 * irr_*id) already exists in `irrCompletions` is skipped, so a partial failure
 * can be retried without duplicating rows.
 *
 * Run and verify on the DEV deploy (handsome-walrus-236) before prod:
 *   bunx convex run migrations:copyLisDeOuroToIrr '{"dryRun": true}'
 *   bunx convex run migrations:copyLisDeOuroToIrr '{}'
 * Verify `sourceCount === destCount` (all copied) before touching prod.
 */
export const copyLisDeOuroToIrr = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // 1. Assert all-escoteiro: every action id must be escoteiro-prefixed.
    // (Ações already encode ramo in their id — this is the cheapest proof that
    // no non-escoteiro/transitioned user exists before we stamp escoteiro.)
    const actions = await ctx.db.query("actionCompletions").collect();
    const offending = actions.find((a) => !a.actionId.startsWith("escoteiro:"));
    if (offending) {
      throw new Error(
        `copyLisDeOuroToIrr: found non-escoteiro action id "${offending.actionId}" ` +
          `— a transitioned/non-escoteiro user exists; migrate manually.`,
      );
    }

    // 2. Copy each recognition row forward, stamping escoteiro + rewriting the id.
    const source = await ctx.db.query("lisDeOuroCompletions").collect();
    let copied = 0;
    let skipped = 0;
    const samples: { from: string; to: string }[] = [];

    for (const row of source) {
      const newItemId = row.itemId.replace(/^lis_/, "irr_");
      if (samples.length < 5)
        samples.push({ from: row.itemId, to: newItemId });

      const existing = await ctx.db
        .query("irrCompletions")
        .withIndex("by_userId_and_ramo_and_itemId", (q) =>
          q
            .eq("userId", row.userId)
            .eq("ramo", "escoteiro")
            .eq("itemId", newItemId),
        )
        .unique();

      if (existing) {
        skipped++;
        continue;
      }

      copied++;
      if (!dryRun) {
        await ctx.db.insert("irrCompletions", {
          userId: row.userId,
          ramo: "escoteiro",
          itemId: newItemId,
          completedAt: row.completedAt,
          status: row.status,
          approvedBy: row.approvedBy,
          approvedAt: row.approvedAt,
        });
      }
    }

    // 3. Verify: destCount should equal sourceCount once fully copied. On a
    // dryRun destCount reflects only pre-existing rows (nothing inserted).
    const destCount = (await ctx.db.query("irrCompletions").collect()).length;

    return {
      dryRun,
      sourceCount: source.length,
      copied,
      skipped,
      destCount,
      samples,
    };
  },
});

/**
 * One-off migration (#37): backfill `ramo = "escoteiro"` in place on the three
 * remaining ramo-unscoped completion tables — `specialtyCompletions`,
 * `customActions`, and `plannedItems` — so their reads (now filtered by
 * (userId, ramo)) return existing rows again.
 *
 * In-place stamp (NOT copy-forward) because these tables aren't renamed. Every
 * row is stamped escoteiro, justified by the all-escoteiro assertion below — a
 * row's identity is per-row, so a user whose `user.ramo` is unset but who has
 * completions still gets their rows stamped, and a user with no completions
 * simply has no rows to touch.
 *
 * DEPLOY ORDERING — schema deploy and this backfill MUST run back-to-back (dev,
 * verify, then prod). Between the schema deploy and this run, ramo-filtered
 * reads treat `ramo=undefined` rows as belonging to no ramo, so completions look
 * unchecked; that window is exactly where a re-check would breed a duplicate, so
 * keep it as short as possible.
 *
 * Collision-safe: `specialtyCompletions` and `plannedItems` have unique
 * (userId, ramo, discriminator) write-lookups, so if a `ramo=escoteiro` row for
 * the same identity already exists (a re-check during the deploy window), we
 * merge into it (specialties prefer `approved`) and delete the unstamped source
 * instead of patching — otherwise `.unique()` would later throw on the dup.
 * `customActions` has no unique lookup, so it's a plain patch.
 *
 * Idempotent / safe to re-run: rows that already carry a `ramo` are skipped.
 *
 * Run and verify on the DEV deploy (handsome-walrus-236) before prod:
 *   bunx convex run migrations:backfillRamoOnCompletions '{"dryRun": true}'
 *   bunx convex run migrations:backfillRamoOnCompletions '{}'
 */
export const backfillRamoOnCompletions = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // 1. Assert all-escoteiro before stamping escoteiro anywhere.
    await assertAllEscoteiro(ctx, "backfillRamoOnCompletions");

    let stamped = 0;
    let merged = 0;
    let skipped = 0;
    const perTable: Record<string, { stamped: number; merged: number; skipped: number }> =
      {};

    const bump = (table: string, key: "stamped" | "merged" | "skipped") => {
      perTable[table] ??= { stamped: 0, merged: 0, skipped: 0 };
      perTable[table][key]++;
      if (key === "stamped") stamped++;
      else if (key === "merged") merged++;
      else skipped++;
    };

    // 2a. specialtyCompletions — collision-safe (unique userId,ramo,blocoId,name).
    for (const row of await ctx.db.query("specialtyCompletions").collect()) {
      if (row.ramo !== undefined) {
        bump("specialtyCompletions", "skipped");
        continue;
      }
      const dup = await ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId_and_ramo_and_blocoId_and_specialtyName", (q) =>
          q
            .eq("userId", row.userId)
            .eq("ramo", "escoteiro")
            .eq("blocoId", row.blocoId)
            .eq("specialtyName", row.specialtyName),
        )
        .unique();
      if (dup) {
        bump("specialtyCompletions", "merged");
        if (!dryRun) {
          const status =
            dup.status === "approved" || row.status === "approved"
              ? ("approved" as const)
              : dup.status;
          await ctx.db.patch(dup._id, {
            status,
            approvedBy: dup.approvedBy ?? row.approvedBy,
            approvedAt: dup.approvedAt ?? row.approvedAt,
            completedAt: Math.min(dup.completedAt, row.completedAt),
          });
          await ctx.db.delete(row._id);
        }
      } else {
        bump("specialtyCompletions", "stamped");
        if (!dryRun) await ctx.db.patch(row._id, { ramo: "escoteiro" });
      }
    }

    // 2b. customActions — plain patch (no unique write-lookup; a window dup is
    // benign and never breaks `.unique()`).
    for (const row of await ctx.db.query("customActions").collect()) {
      if (row.ramo !== undefined) {
        bump("customActions", "skipped");
        continue;
      }
      bump("customActions", "stamped");
      if (!dryRun) await ctx.db.patch(row._id, { ramo: "escoteiro" });
    }

    // 2c. plannedItems — collision-safe (unique userId,ramo,itemKey). On a dup,
    // keep the existing stamped row (its position) and drop the source.
    for (const row of await ctx.db.query("plannedItems").collect()) {
      if (row.ramo !== undefined) {
        bump("plannedItems", "skipped");
        continue;
      }
      const dup = await ctx.db
        .query("plannedItems")
        .withIndex("by_userId_and_ramo_and_itemKey", (q) =>
          q
            .eq("userId", row.userId)
            .eq("ramo", "escoteiro")
            .eq("itemKey", row.itemKey),
        )
        .unique();
      if (dup) {
        bump("plannedItems", "merged");
        if (!dryRun) await ctx.db.delete(row._id);
      } else {
        bump("plannedItems", "stamped");
        if (!dryRun) await ctx.db.patch(row._id, { ramo: "escoteiro" });
      }
    }

    return { dryRun, stamped, merged, skipped, perTable };
  },
});

// ── Especialidades migration (#41) ───────────────────────────────────────────

/**
 * Convert a specialtyName display string to a lowercase hyphen slug.
 * Removes diacritics, lowercases, replaces spaces/underscores with hyphens,
 * and strips non-alphanumeric characters except hyphens.
 */
function toSpecialtySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

/**
 * Known item counts for younger-group (lobinho/escoteiro) specialties.
 * Sourced from the official guide (scout-notes reference repo).
 * Names here must match the `specialtyName` strings stored in
 * `specialtyCompletions` rows (set by the old toggleSpecialty mutation).
 *
 * Specialties not listed here fall back to FALLBACK_ITEM_COUNT.
 */
const YOUNGER_SPECIALTY_ITEM_COUNTS: Record<string, number> = {
  Acampamento: 8,
  Administração: 6,
  "Anatomia Humana": 7,
  "Arte Digital": 8,
  "Artes Visuais": 8,
  Artesanato: 8,
  Botânica: 6,
  Brasilidades: 6,
  "Ciências da Terra": 6, // maps to guide's Geologia (6 items)
  Comunicações: 8,
  Comédia: 8,
  "Costura e Estilismo": 6,
  "Defesa Civil": 6,
  "Educação Financeira": 8,
  Empreendedorismo: 8,
  Encadernação: 8,
  "Escotismo Mundial": 6,
  Excursões: 6,
  Genealogia: 6,
  Grafite: 6,
  HQ: 8,
  Horticultura: 6,
  Maquete: 6,
  Meteorologia: 6,
  Montanhismo: 6,
  "Noções Desportivas": 6,
  Nutrição: 6,
  Oceanologia: 6,
  Oratória: 6,
  Pintura: 8,
  Pioneiria: 8,
  "Prevenção ao Bullying": 6,
  "Prevenção aos Vícios": 6,
  "Prevenção em Saúde": 6,
  "Primeiros Socorros": 8,
  "Propaganda e Marketing": 8,
  "Reparos Domésticos": 8,
  Robótica: 8,
  Sobrevivência: 6,
  Videomaker: 8,
  Yoga: 8,
  Zoologia: 6,
};

/** Fallback item count for specialty names not in the known map. */
const FALLBACK_ITEM_COUNT = 6;

/**
 * One-off migration: convert legacy `specialtyCompletions` rows into the new
 * `specialtyItemCompletions` (younger) and `specialtyProjectReports` (older)
 * tables introduced in #41.
 *
 * Strategy:
 *   - Pending rows: dropped without conversion (escoteiros resubmit under the
 *     new item/step UI).
 *   - Approved rows (or null-status rows, which prod treats as approved):
 *       - Younger (lobinho/escoteiro): insert one `specialtyItemCompletions`
 *         row per item index, all approved, carrying approvedBy/approvedAt.
 *       - Older (senior/pioneiro): insert all three `specialtyProjectReports`
 *         steps (conhecer/fazer/compartilhar) approved, representing earned.
 *   - Source rows are deleted after conversion (when dryRun=false).
 *   - Idempotent: existing target rows for the same (userId, ramoGroup,
 *     specialtyId, itemIndex/step) are skipped (not duplicated).
 *
 * Run:
 *   bunx convex run migrations:migrateSpecialtyCompletions '{"dryRun": true}'
 *   bunx convex run migrations:migrateSpecialtyCompletions '{}'
 */
export const migrateSpecialtyCompletions = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    const all = await ctx.db.query("specialtyCompletions").collect();

    let skippedPending = 0;
    let convertedYounger = 0;
    let convertedOlder = 0;
    let skippedDuplicate = 0;
    const unknownSpecialties: string[] = [];

    for (const row of all) {
      // Pending rows: drop (no conversion).
      if (row.status === "pending") {
        skippedPending++;
        if (!dryRun) await ctx.db.delete(row._id);
        continue;
      }

      const ramo = row.ramo ?? "escoteiro";
      const ramoGroup: "younger" | "older" =
        ramo === "lobinho" || ramo === "escoteiro" ? "younger" : "older";
      const specialtyId = toSpecialtySlug(row.specialtyName);
      const approvedBy = row.approvedBy;
      const approvedAt = row.approvedAt;
      const completedAt = row.completedAt;

      if (ramoGroup === "younger") {
        const itemCount =
          YOUNGER_SPECIALTY_ITEM_COUNTS[row.specialtyName] ??
          FALLBACK_ITEM_COUNT;
        if (!(row.specialtyName in YOUNGER_SPECIALTY_ITEM_COUNTS)) {
          unknownSpecialties.push(row.specialtyName);
        }

        for (let i = 0; i < itemCount; i++) {
          // Check for existing row (idempotency).
          const existing = await ctx.db
            .query("specialtyItemCompletions")
            .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
              q
                .eq("userId", row.userId)
                .eq("ramoGroup", ramoGroup)
                .eq("specialtyId", specialtyId),
            )
            .filter((q) => q.eq(q.field("itemIndex"), i))
            .first();

          if (existing) {
            skippedDuplicate++;
            continue;
          }

          if (!dryRun) {
            await ctx.db.insert("specialtyItemCompletions", {
              userId: row.userId,
              ramoGroup,
              specialtyId,
              itemIndex: i,
              completedAt,
              status: "approved",
              approvedBy,
              approvedAt,
            });
          }
        }
        convertedYounger++;
      } else {
        // Older group: create all three steps as approved.
        const steps = ["conhecer", "fazer", "compartilhar"] as const;
        for (const step of steps) {
          const existing = await ctx.db
            .query("specialtyProjectReports")
            .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
              q
                .eq("userId", row.userId)
                .eq("ramoGroup", ramoGroup)
                .eq("specialtyId", specialtyId),
            )
            .filter((q) => q.eq(q.field("step"), step))
            .first();

          if (existing) {
            skippedDuplicate++;
            continue;
          }

          if (!dryRun) {
            await ctx.db.insert("specialtyProjectReports", {
              userId: row.userId,
              ramoGroup,
              specialtyId,
              step,
              text: `Migrado do sistema legado (${row.specialtyName})`,
              completedAt,
              status: "approved",
              approvedBy,
              approvedAt,
            });
          }
        }
        convertedOlder++;
      }

      // Delete source row.
      if (!dryRun) await ctx.db.delete(row._id);
    }

    return {
      dryRun,
      total: all.length,
      skippedPending,
      convertedYounger,
      convertedOlder,
      skippedDuplicate,
      unknownSpecialties: [...new Set(unknownSpecialties)],
    };
  },
});
