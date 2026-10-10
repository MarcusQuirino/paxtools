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
  // No "pending especialidade" term: a specialty's level is computed on read
  // from APPROVED item counts only, so it either satisfies the bloco or not.
  const variablePendingSatisfied =
    hasApprovedSpecialty ||
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
 * Must agree with any mutation that writes a `specialtyId` derived from user
 * input.
 */
export function toSpecialtySlug(name: string): string {
  return name
    .normalize("NFD")
    // U+0300-U+036F = combining diacritical marks. Written as escapes, not as
    // literal characters: esbuild cannot ASCII-escape inside a regex literal,
    // so raw combining marks survive into bundle output and any consumer that
    // serves the JS without `charset=utf-8` fails to parse the whole file.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

/**
 * Legacy specialty names still present in the progression catalog's
 * `alternativeCompletions` whose slug does not match the 2025 guide's catalog
 * id. Maps legacy slug → canonical catalog id so old names resolve to the
 * current catalog entry.
 *
 * Known legacy names with NO canonical counterpart (left unmapped on purpose,
 * rather than guessed at):
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
 * Map earned especialidades and badges to the set of blocoIds whose
 * `alternativeCompletions` name one of them. A bloco's variable section is
 * satisfied when any of its linked especialidades or insígnias is earned.
 *
 * The catalog stores alternative-completion entries as *display names*;
 * earned especialidades are keyed by *catalog id*. Especialidade names resolve
 * via `toCanonicalSpecialtyId` — the same resolver the migration and
 * deep-links use, so legacy renames (e.g. "Ciências da Terra" → geologia)
 * still match. Insígnia names resolve to badge ids via `toSpecialtySlug`
 * (src/data/badge-data).
 */
export function getEarnedSpecialtyBlocoIds(
  eixos: Eixo[],
  earnedSpecialtyIds: Set<string>,
  earnedBadgeIds: Set<string> = new Set(),
): Set<string> {
  const blocoIds = new Set<string>();
  if (earnedSpecialtyIds.size === 0 && earnedBadgeIds.size === 0) return blocoIds;

  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      for (const alt of bloco.alternativeCompletions) {
        for (const name of alt.items) {
          const earned =
            alt.type === "especialidade"
              ? earnedSpecialtyIds.has(toCanonicalSpecialtyId(name))
              : earnedBadgeIds.has(toSpecialtySlug(name));
          if (earned) blocoIds.add(bloco.id);
        }
      }
    }
  }
  return blocoIds;
}

/**
 * Whether a specialty listed under a bloco renders as marked.
 *
 * Since #47 there is exactly one way to mark one: *earned via items* — the
 * escoteiro completed enough of its catalog items (younger) or all three
 * project steps (older) to reach level ≥ 1, computed on read and surfaced as
 * `earnedSpecialtyIds`. It is therefore always approved and always read-only
 * from the bloco view; marking happens on /especialidades.
 */
export function isSpecialtyEarned(
  specialtyName: string,
  earnedSpecialtyIds: Set<string>,
): boolean {
  return earnedSpecialtyIds.has(toCanonicalSpecialtyId(specialtyName));
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
