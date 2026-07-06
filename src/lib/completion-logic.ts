import type { Bloco, Eixo } from "../data/types";
import type { Ramo } from "../data/progression-data";
import { getRamoRules, type Etapa } from "../data/progression-rules";

export type BlocoProgress = {
  fixedDone: number;
  fixedPending: number;
  fixedTotal: number;
  variableDone: number;
  variablePending: number;
  variableRequired: number;
  isComplete: boolean;
  isPendingComplete: boolean;
};

export function getBlocoProgress(
  bloco: Bloco,
  approvedActionIds: Set<string>,
  pendingActionIds: Set<string>,
  approvedCustomCompleted: number,
  pendingCustomCompleted: number,
  hasApprovedSpecialty: boolean,
  hasPendingSpecialty: boolean,
): BlocoProgress {
  const fixedDone = bloco.fixedActions.filter((a) =>
    approvedActionIds.has(a.id),
  ).length;
  const fixedPending = bloco.fixedActions.filter(
    (a) => pendingActionIds.has(a.id) && !approvedActionIds.has(a.id),
  ).length;
  const fixedTotal = bloco.fixedActions.length;

  const variableDone =
    bloco.variableActions.filter((a) => approvedActionIds.has(a.id)).length +
    approvedCustomCompleted;
  const variablePending =
    bloco.variableActions.filter(
      (a) => pendingActionIds.has(a.id) && !approvedActionIds.has(a.id),
    ).length + pendingCustomCompleted;

  const allFixedDone = fixedDone === fixedTotal;
  const variableSatisfied =
    hasApprovedSpecialty || variableDone >= bloco.variableRequired;

  const allFixedDoneOrPending = fixedDone + fixedPending === fixedTotal;
  const variablePendingSatisfied =
    hasApprovedSpecialty ||
    hasPendingSpecialty ||
    variableDone + variablePending >= bloco.variableRequired;

  return {
    fixedDone,
    fixedPending,
    fixedTotal,
    variableDone,
    variablePending,
    variableRequired: bloco.variableRequired,
    isComplete: allFixedDone && variableSatisfied,
    isPendingComplete:
      (allFixedDone && variableSatisfied) ||
      (allFixedDoneOrPending && variablePendingSatisfied),
  };
}

/**
 * Convert a specialty display name to a lowercase hyphenated slug used as
 * `specialtyId` in `specialtyItemCompletions` and `specialtyProjectReports`.
 * Removes diacritics, lowercases, replaces spaces/underscores with hyphens,
 * and strips non-alphanumeric characters except hyphens.
 *
 * Must agree with `migrations:migrateSpecialtyCompletions` and any future
 * mutation that writes a `specialtyId` derived from user input.
 */
export function toSpecialtySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

/**
 * Legacy specialty names (stored in old `specialtyCompletions` rows and still
 * present in the progression catalog's `alternativeCompletions`) whose slug
 * does not match the 2025 guide's catalog id. Maps legacy slug → canonical
 * catalog id so old data and old names resolve to the current catalog entry.
 *
 * Known legacy names with NO canonical counterpart (left unmapped on purpose;
 * the migration reports them instead of guessing):
 *   - "Noções Desportivas" — dropped from the 2025 guide
 *   - "Informações Turísticas" — in the 2025 guide but missing from our catalog
 */
export const LEGACY_SPECIALTY_SLUG_ALIASES: Record<string, string> = {
  // Younger: renamed to "Geologia" in the 2025 guide.
  "ciencias-da-terra": "geologia",
  // Younger: renamed to "Tradições dos Povos Originários" in the 2025 guide.
  "tradicoes-dos-povos-indigenas": "tradicoes-dos-povos-originarios",
  // Older: the guide's name is "Natureza e Ciências Naturais".
  "natureza-e-ciencias-ambientais": "natureza-e-ciencias-naturais",
};

/**
 * Convert a specialty display name to its canonical catalog id: slugify, then
 * resolve legacy renames via LEGACY_SPECIALTY_SLUG_ALIASES. Use this (not
 * `toSpecialtySlug`) whenever a name must resolve to a catalog entry — the
 * migration, earned-specialty matching, and deep-links all go through here.
 */
export function toCanonicalSpecialtyId(name: string): string {
  const slug = toSpecialtySlug(name);
  return LEGACY_SPECIALTY_SLUG_ALIASES[slug] ?? slug;
}

/**
 * Compute the specialty level (0, 1, or 2) from approved item count.
 *
 * - Level 2: all items approved (approvedCount === totalItems)
 * - Level 1: at least half approved (approvedCount >= totalItems / 2)
 * - Level 0: otherwise
 *
 * When totalItems is 0 returns 0 (no items means no level).
 */
export function getSpecialtyLevel(
  approvedCount: number,
  totalItems: number,
): 0 | 1 | 2 {
  if (totalItems === 0) return 0;
  if (approvedCount >= totalItems) return 2;
  if (approvedCount >= totalItems / 2) return 1;
  return 0;
}

/**
 * Given a user's *approved* specialty item completions, return the set of
 * specialtyId slugs the user has earned at level ≥ 1.
 *
 * Pure and catalog-agnostic: `getTotalItems` resolves a specialtyId to its
 * catalog item count (0 for unknown ids). Callers wire this to the younger
 * catalog. An item whose specialtyId is unknown (0 total) can never reach a
 * level and is silently ignored.
 */
export function getEarnedSpecialtyIds(
  approvedItems: { specialtyId: string }[],
  getTotalItems: (specialtyId: string) => number,
): Set<string> {
  const approvedCountBySpecialty = new Map<string, number>();
  for (const item of approvedItems) {
    approvedCountBySpecialty.set(
      item.specialtyId,
      (approvedCountBySpecialty.get(item.specialtyId) ?? 0) + 1,
    );
  }

  const earned = new Set<string>();
  for (const [specialtyId, approvedCount] of approvedCountBySpecialty) {
    const total = getTotalItems(specialtyId);
    if (getSpecialtyLevel(approvedCount, total) >= 1) {
      earned.add(specialtyId);
    }
  }
  return earned;
}

/**
 * Map a set of earned specialtyId slugs to the set of blocoIds whose
 * `alternativeCompletions` (of type "especialidade") name one of those
 * specialties. A bloco's variable section is satisfied when any of its linked
 * specialties is earned.
 *
 * The catalog stores alternative-completion entries as specialty *display
 * names*; earned specialties are keyed by *catalog id*. Names resolve via
 * `toCanonicalSpecialtyId` — the same resolver the migration and deep-links
 * use, so legacy renames (e.g. "Ciências da Terra" → geologia) still match.
 */
export function getEarnedSpecialtyBlocoIds(
  eixos: Eixo[],
  earnedSpecialtyIds: Set<string>,
): Set<string> {
  const blocoIds = new Set<string>();
  if (earnedSpecialtyIds.size === 0) return blocoIds;

  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      for (const alt of bloco.alternativeCompletions) {
        if (alt.type !== "especialidade") continue;
        for (const name of alt.items) {
          if (earnedSpecialtyIds.has(toCanonicalSpecialtyId(name))) {
            blocoIds.add(bloco.id);
          }
        }
      }
    }
  }
  return blocoIds;
}

/**
 * Whether a specialty listed under a bloco should render as marked, and how.
 *
 * A specialty can be satisfied two ways:
 *  - *Earned via items* (#44): the escoteiro completed enough of its catalog
 *    items to reach level ≥ 1. This is computed from `specialtyItemCompletions`
 *    (surfaced as `earnedSpecialtyIds`), always counts as approved, and cannot
 *    be un-toggled from the bloco view — so it renders checked and locked.
 *  - *Legacy manual toggle*: a `specialtyCompletions` row written by
 *    `toggleSpecialty`, which may be pending or approved.
 *
 * Earned-via-items wins: it forces checked+approved+locked regardless of any
 * legacy row. Without it, the bloco could show 100% (satisfied via items) while
 * its specialty box stayed empty — the escoteiro had to re-mark it by hand.
 */
export type SpecialtyMark = {
  checked: boolean;
  pending: boolean;
  locked: boolean;
  earnedViaItems: boolean;
};

export function getSpecialtyMark(
  specialtyName: string,
  blocoId: string,
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: "pending" | "approved";
  }[],
  earnedSpecialtyIds: Set<string>,
  lockApproved: boolean,
): SpecialtyMark {
  const earnedViaItems = earnedSpecialtyIds.has(
    toCanonicalSpecialtyId(specialtyName),
  );
  const completion = completedSpecialties.find(
    (s) => s.blocoId === blocoId && s.specialtyName === specialtyName,
  );
  const checked = earnedViaItems || !!completion;
  const pending = !earnedViaItems && completion?.status === "pending";
  const locked =
    earnedViaItems ||
    (lockApproved && completion?.status === "approved");
  return { checked, pending, locked: !!locked, earnedViaItems };
}

export function getCompletedBlockIds(
  eixos: Eixo[],
  approvedActionIds: Set<string>,
  pendingActionIds: Set<string>,
  customActions: { blocoId: string; completed: boolean; status?: string }[],
  // Pre-computed set of blocoIds whose linked specialty is earned at level ≥ 1.
  // Callers compute this from specialtyItemCompletions counts + the catalog's
  // alternativeCompletions map. Previously accepted raw specialtyCompletions
  // rows; migrated to this shape in feat/especialidades-schema-logic (#41).
  earnedSpecialtyBlocoIds: Set<string>,
): { approved: Set<string>; pending: Set<string> } {
  const approved = new Set<string>();
  const pending = new Set<string>();

  const approvedCustomByBloco = new Map<string, number>();
  const pendingCustomByBloco = new Map<string, number>();
  for (const c of customActions) {
    if (c.completed) {
      if (c.status === "pending") {
        pendingCustomByBloco.set(
          c.blocoId,
          (pendingCustomByBloco.get(c.blocoId) ?? 0) + 1,
        );
      } else {
        approvedCustomByBloco.set(
          c.blocoId,
          (approvedCustomByBloco.get(c.blocoId) ?? 0) + 1,
        );
      }
    }
  }

  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      const hasEarnedSpecialty = earnedSpecialtyBlocoIds.has(bloco.id);
      const progress = getBlocoProgress(
        bloco,
        approvedActionIds,
        pendingActionIds,
        approvedCustomByBloco.get(bloco.id) ?? 0,
        pendingCustomByBloco.get(bloco.id) ?? 0,
        hasEarnedSpecialty,
        // Pending specialty satisfaction removed: specialty level is computed on
        // read from approved item counts only — there is no "pending level".
        false,
      );
      if (progress.isComplete) {
        approved.add(bloco.id);
      } else if (progress.isPendingComplete) {
        pending.add(bloco.id);
      }
    }
  }
  return { approved, pending };
}

export function getCurrentStage(
  completedBlocks: number,
  ramo: Ramo | null | undefined,
): Etapa {
  const { etapas } = getRamoRules(ramo);
  for (let i = etapas.length - 1; i >= 0; i--) {
    const etapa = etapas[i]!;
    if (completedBlocks >= etapa.blocksRequired) {
      return etapa;
    }
  }
  return etapas[0]!;
}

export function getNextStage(
  completedBlocks: number,
  ramo: Ramo | null | undefined,
): Etapa | null {
  const { etapas } = getRamoRules(ramo);
  const current = getCurrentStage(completedBlocks, ramo);
  const idx = etapas.findIndex((s) => s.id === current.id);
  if (idx < etapas.length - 1) {
    return etapas[idx + 1] ?? null;
  }
  return null;
}

export function getBlocksToIrr(
  completedBlocks: number,
  ramo: Ramo | null | undefined,
): number {
  return Math.max(0, getRamoRules(ramo).irr.blockThreshold - completedBlocks);
}

export function allBlocksCompleted(
  completedBlocks: number,
  ramo: Ramo | null | undefined,
): boolean {
  return completedBlocks >= getRamoRules(ramo).irr.blockThreshold;
}

export function isIrrComplete(
  completedBlocks: number,
  completedItemIds: Set<string>,
  ramo: Ramo | null | undefined,
): boolean {
  if (!allBlocksCompleted(completedBlocks, ramo)) return false;

  return getRamoRules(ramo).irr.items.every((item) =>
    item.auto ? true : completedItemIds.has(item.id),
  );
}
