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
