/**
 * Progression state — an escoteiro's progression in their current ramo,
 * derived once from their completion rows: which ações are approved or
 * waiting, each bloco's progress (and its bar), which blocos are complete,
 * the etapa, and the IRR.
 *
 * The server's level-up snapshot, coverage and group stats, and the client's
 * progression views all derive through here, so the rules that turn rows into
 * progression live in one place:
 * - a conclusão counts as approved unless it is explicitly pending (legacy
 *   rows carry no status);
 * - ações are matched against the current ramo's catalog by id, so a past
 *   ramo's ações never count (their ids carry the ramo);
 * - an ação personalizada counts toward its bloco's variable section once
 *   completed;
 * - an earned especialidade or insígnia de interesse especial satisfies the
 *   variable section of every bloco that names it (see especialidade-standing
 *   and badge-standing for "earned").
 *
 * Pure, browser-free and path-alias-free: Convex imports it too.
 */
import type { Bloco, Eixo } from "../data/types";
import { getEixosForRamo, type Ramo } from "../data/progression-data";
import { getRamoRules, type Etapa, type RamoRules } from "../data/progression-rules";
import {
  getBlocoProgress,
  getBlocksToIrr,
  getCurrentStage,
  getEarnedSpecialtyBlocoIds,
  getNextStage,
  isIrrComplete,
  allBlocksCompleted,
  type BlocoProgress,
} from "./completion-logic";
import {
  computeBadgeStandings,
  earnedBadgeIds as earnedBadgeIdsOf,
  type BadgeRequirementRow,
  type BadgeStanding,
} from "./badge-standing";

type Status = "pending" | "approved";

/** The rows progression is derived from (current ramo only, except ações). */
export type ProgressionRows<
  C extends { blocoId: string; completed: boolean; status?: string } = {
    blocoId: string;
    completed: boolean;
    status?: string;
  },
> = {
  ramo: Ramo | null;
  /** Every ação conclusão; ids carry the ramo, so other ramos simply miss. */
  actions: { actionId: string; status?: string }[];
  /** Ações personalizadas of the current ramo. */
  customActions: C[];
  /** IRR conclusões of the current ramo. */
  irrItems: { itemId: string; status?: string }[];
  /** Especialidades earned in the current ramo group. */
  earnedSpecialtyIds: Iterable<string>;
  /** Insígnia de interesse especial requirement conclusões of the current ramo. */
  badgeRequirements?: BadgeRequirementRow[];
};

/** One bloco's progress plus the numbers its progress bar draws. */
export type BlocoView = BlocoProgress & {
  bloco: Bloco;
  /** The variable section is satisfied by an earned especialidade or insígnia. */
  earnedViaSpecialty: boolean;
  /** Fixed ações + required variable ações. */
  totalActions: number;
  approvedDone: number;
  pendingDone: number;
  approvedPercent: number;
  pendingPercent: number;
};

export type ProgressionState<C> = {
  ramo: Ramo | null;
  ramoRules: RamoRules;
  eixos: Eixo[];
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, Status>;
  customActions: (C & { status: Status | undefined })[];
  earnedSpecialtyIds: Set<string>;
  earnedSpecialtyBlocoIds: Set<string>;
  /** badgeId → standing, for every badge trackable in the current ramo. */
  badges: Map<string, BadgeStanding>;
  earnedBadgeIds: Set<string>;
  blocos: Map<string, BlocoView>;
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
  completedBlockCount: number;
  pendingBlockCount: number;
  approvedIrrItemIds: Set<string>;
  pendingIrrItemIds: Set<string>;
  stage: Etapa;
  stageIndex: number;
  nextStage: Etapa | null;
  blocksToIrr: number;
  blocksComplete: boolean;
  irrComplete: boolean;
};

const isPending = (s: string | undefined) => s === "pending";

function blocoView(
  bloco: Bloco,
  progress: BlocoProgress,
  earnedViaSpecialty: boolean,
): BlocoView {
  const totalActions = bloco.fixedActions.length + bloco.variableRequired;
  const approvedVariable = earnedViaSpecialty
    ? bloco.variableRequired
    : Math.min(progress.variableDone, bloco.variableRequired);
  const approvedDone = Math.min(progress.fixedDone + approvedVariable, totalActions);
  const pendingVariable = earnedViaSpecialty
    ? 0
    : Math.min(progress.variablePending, bloco.variableRequired - approvedVariable);
  const pendingDone = Math.min(
    progress.fixedPending + Math.max(0, pendingVariable),
    totalActions - approvedDone,
  );
  const pct = (n: number) => (totalActions > 0 ? (n / totalActions) * 100 : 0);
  return {
    ...progress,
    bloco,
    earnedViaSpecialty,
    totalActions,
    approvedDone,
    pendingDone,
    approvedPercent: pct(approvedDone),
    pendingPercent: pct(pendingDone),
  };
}

/** Derive an escoteiro's progression state from their rows. */
export function deriveProgression<
  C extends { blocoId: string; completed: boolean; status?: string },
>(rows: ProgressionRows<C>): ProgressionState<C> {
  const { ramo } = rows;
  const eixos = getEixosForRamo(ramo);
  const ramoRules = getRamoRules(ramo);

  const approvedActionIds = new Set<string>();
  const pendingActionIds = new Set<string>();
  const actionStatusMap = new Map<string, Status>();
  for (const a of rows.actions) {
    const pending = isPending(a.status);
    (pending ? pendingActionIds : approvedActionIds).add(a.actionId);
    actionStatusMap.set(a.actionId, pending ? "pending" : "approved");
  }

  const customActions = rows.customActions.map((c) => ({
    ...c,
    status: c.status as Status | undefined,
  }));
  const approvedCustomByBloco = new Map<string, number>();
  const pendingCustomByBloco = new Map<string, number>();
  for (const c of customActions) {
    if (!c.completed) continue;
    const counts = isPending(c.status) ? pendingCustomByBloco : approvedCustomByBloco;
    counts.set(c.blocoId, (counts.get(c.blocoId) ?? 0) + 1);
  }

  const earnedSpecialtyIds = new Set(rows.earnedSpecialtyIds);
  const badges = computeBadgeStandings(ramo, rows.badgeRequirements ?? []);
  const earnedBadgeIds = earnedBadgeIdsOf(badges);
  const earnedSpecialtyBlocoIds = getEarnedSpecialtyBlocoIds(
    eixos,
    earnedSpecialtyIds,
    earnedBadgeIds,
  );

  const blocos = new Map<string, BlocoView>();
  const completedBlockIds = new Set<string>();
  const pendingBlockIds = new Set<string>();
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      const viaSpecialty = earnedSpecialtyBlocoIds.has(bloco.id);
      const progress = getBlocoProgress(
        bloco,
        approvedActionIds,
        pendingActionIds,
        approvedCustomByBloco.get(bloco.id) ?? 0,
        pendingCustomByBloco.get(bloco.id) ?? 0,
        viaSpecialty,
      );
      blocos.set(bloco.id, blocoView(bloco, progress, viaSpecialty));
      if (progress.isComplete) completedBlockIds.add(bloco.id);
      else if (progress.isPendingComplete) pendingBlockIds.add(bloco.id);
    }
  }

  const approvedIrrItemIds = new Set<string>();
  const pendingIrrItemIds = new Set<string>();
  for (const i of rows.irrItems) {
    (isPending(i.status) ? pendingIrrItemIds : approvedIrrItemIds).add(i.itemId);
  }

  const completedBlockCount = completedBlockIds.size;
  const stage = getCurrentStage(completedBlockCount, ramo);
  return {
    ramo,
    ramoRules,
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    customActions,
    earnedSpecialtyIds,
    earnedSpecialtyBlocoIds,
    badges,
    earnedBadgeIds,
    blocos,
    completedBlockIds,
    pendingBlockIds,
    completedBlockCount,
    pendingBlockCount: pendingBlockIds.size,
    approvedIrrItemIds,
    pendingIrrItemIds,
    stage,
    stageIndex: ramoRules.etapas.findIndex((s) => s.id === stage.id),
    nextStage: getNextStage(completedBlockCount, ramo),
    blocksToIrr: getBlocksToIrr(completedBlockCount, ramo),
    blocksComplete: allBlocksCompleted(completedBlockCount, ramo),
    irrComplete: isIrrComplete(completedBlockCount, approvedIrrItemIds, ramo),
  };
}

/**
 * The ações of the current ramo's catalog an escoteiro has approved / waiting.
 * Unlike the raw id sets, these never include a past ramo's ações.
 */
export function catalogActionCounts(state: ProgressionState<unknown>): {
  approved: number;
  pending: number;
} {
  let approved = 0;
  let pending = 0;
  for (const eixo of state.eixos) {
    for (const bloco of eixo.blocos) {
      for (const a of [...bloco.fixedActions, ...bloco.variableActions]) {
        if (state.approvedActionIds.has(a.id)) approved++;
        else if (state.pendingActionIds.has(a.id)) pending++;
      }
    }
  }
  return { approved, pending };
}
