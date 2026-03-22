import type { Bloco, Eixo } from "@/data/types";
import {
  STAGES,
  LIS_DE_OURO_BLOCKS,
  LIS_DE_OURO_ITEMS,
  type Stage,
} from "@/data/progression-rules";

export type BlocoProgress = {
  fixedDone: number;
  fixedTotal: number;
  variableDone: number;
  variableRequired: number;
  isComplete: boolean;
};

export function getBlocoProgress(
  bloco: Bloco,
  completedActionIds: Set<string>,
  customActionsCompleted: number,
  hasSpecialtyAlternative: boolean,
): BlocoProgress {
  const fixedDone = bloco.fixedActions.filter((a) =>
    completedActionIds.has(a.id),
  ).length;
  const fixedTotal = bloco.fixedActions.length;
  const variableDone =
    bloco.variableActions.filter((a) => completedActionIds.has(a.id)).length +
    customActionsCompleted;

  const allFixedDone = fixedDone === fixedTotal;
  const variableSatisfied =
    hasSpecialtyAlternative || variableDone >= bloco.variableRequired;

  return {
    fixedDone,
    fixedTotal,
    variableDone,
    variableRequired: bloco.variableRequired,
    isComplete: allFixedDone && variableSatisfied,
  };
}

export function getCompletedBlockIds(
  eixos: Eixo[],
  completedActionIds: Set<string>,
  customActions: { blocoId: string; completed: boolean }[],
  completedSpecialties: { blocoId: string }[],
): Set<string> {
  const completed = new Set<string>();
  const specialtyBlocos = new Set(completedSpecialties.map((s) => s.blocoId));

  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      const customCompleted = customActions.filter(
        (c) => c.blocoId === bloco.id && c.completed,
      ).length;
      const progress = getBlocoProgress(
        bloco,
        completedActionIds,
        customCompleted,
        specialtyBlocos.has(bloco.id),
      );
      if (progress.isComplete) {
        completed.add(bloco.id);
      }
    }
  }
  return completed;
}

export function getCurrentStage(completedBlocks: number): Stage {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i]!;
    if (completedBlocks >= stage.blocksRequired) {
      return stage;
    }
  }
  return STAGES[0];
}

export function getNextStage(completedBlocks: number): Stage | null {
  const current = getCurrentStage(completedBlocks);
  const idx = STAGES.findIndex((s) => s.id === current.id);
  if (idx < STAGES.length - 1) {
    return STAGES[idx + 1] ?? null;
  }
  return null;
}

export function getBlocksToLisDeOuro(completedBlocks: number): number {
  return Math.max(0, LIS_DE_OURO_BLOCKS - completedBlocks);
}

export function allBlocksCompleted(completedBlocks: number): boolean {
  return completedBlocks >= LIS_DE_OURO_BLOCKS;
}

export function isLisDeOuroComplete(
  completedBlocks: number,
  completedLisItemIds: Set<string>,
): boolean {
  if (!allBlocksCompleted(completedBlocks)) return false;

  return LIS_DE_OURO_ITEMS.every((item) =>
    item.auto ? true : completedLisItemIds.has(item.id),
  );
}
