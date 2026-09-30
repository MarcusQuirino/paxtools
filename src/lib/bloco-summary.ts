/**
 * Pure per-bloco / per-eixo summaries for the Design A progression screens:
 * the ring + status line of a bloco row, the head of the bloco screen, the eixo
 * header meta and the "Continue de onde parou" pick. No React, unit-tested.
 */
import type { Bloco, CustomAction, Eixo } from "@/data/types";
import { getBlocoProgress, type BlocoProgress } from "@/lib/completion-logic";

export type BlocoState = "open" | "pending" | "full";

export type BlocoSummary = {
  progress: BlocoProgress;
  /** Ações that count toward the bloco: fixed + variableRequired. */
  total: number;
  /** Approved ações counted toward `total` (variables capped at the requirement). */
  approvedDone: number;
  /** Aguardando ações counted toward what's left of `total`. */
  pendingDone: number;
  approvedPct: number;
  /** Approved + aguardando share (for the striped pending segment). */
  pendingPct: number;
  /** full = approved complete; pending = complete once approvals land. */
  state: BlocoState;
  /** Any approved or aguardando ação (or an earned especialidade). */
  started: boolean;
  /** Completed through an earned especialidade. */
  viaSpecialty: boolean;
};

export type BlocoInput = {
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  customActions: CustomAction[];
  earnedSpecialtyBlocoIds?: Set<string>;
};

export function summarizeBloco(bloco: Bloco, input: BlocoInput): BlocoSummary {
  let approvedCustom = 0;
  let pendingCustom = 0;
  for (const c of input.customActions) {
    if (c.blocoId !== bloco.id || !c.completed) continue;
    if (c.status === "pending") pendingCustom++;
    else approvedCustom++;
  }
  const viaSpecialty = !!input.earnedSpecialtyBlocoIds?.has(bloco.id);
  const progress = getBlocoProgress(
    bloco,
    input.approvedActionIds,
    input.pendingActionIds,
    approvedCustom,
    pendingCustom,
    viaSpecialty,
  );

  const total = bloco.fixedActions.length + bloco.variableRequired;
  const approvedVariable = viaSpecialty
    ? bloco.variableRequired
    : Math.min(progress.variableDone, bloco.variableRequired);
  const approvedDone = Math.min(progress.fixedDone + approvedVariable, total);
  const pendingVariable = Math.max(
    0,
    Math.min(progress.variablePending, bloco.variableRequired - approvedVariable),
  );
  const pendingDone = Math.min(progress.fixedPending + pendingVariable, total - approvedDone);

  const state: BlocoState = progress.isComplete
    ? "full"
    : progress.isPendingComplete
      ? "pending"
      : "open";

  return {
    progress,
    total,
    approvedDone,
    pendingDone,
    approvedPct: total > 0 ? (approvedDone / total) * 100 : 0,
    pendingPct: total > 0 ? ((approvedDone + pendingDone) / total) * 100 : 0,
    state,
    started:
      viaSpecialty ||
      progress.fixedDone + progress.fixedPending + progress.variableDone + progress.variablePending > 0,
    viaSpecialty,
  };
}

/** "Completo" · "Aguardando aprovação" · "9 de 13 ações · 1 aguardando". */
export function blocoStatusLine(s: BlocoSummary): {
  text: string;
  tone: "muted" | "pending" | "approved";
} {
  if (s.state === "full") {
    return { text: s.viaSpecialty ? "Completo · via especialidade" : "Completo", tone: "muted" };
  }
  if (s.state === "pending") return { text: "Aguardando aprovação", tone: "pending" };
  const base = `${s.approvedDone} de ${s.total} ${s.total === 1 ? "ação" : "ações"}`;
  return {
    text: s.pendingDone > 0 ? `${base} · ${s.pendingDone} aguardando` : base,
    tone: "muted",
  };
}

/** Eixo header meta: "2 de 4 blocos · 1 aguardando". */
export function eixoMetaLine(
  eixo: Eixo,
  completedBlockIds: Set<string>,
  pendingBlockIds: Set<string>,
): string {
  const done = eixo.blocos.filter((b) => completedBlockIds.has(b.id)).length;
  const pending = eixo.blocos.filter((b) => pendingBlockIds.has(b.id)).length;
  const base = `${done} de ${eixo.blocos.length} blocos`;
  return pending > 0 ? `${base} · ${pending} aguardando` : base;
}

/**
 * The bloco for "Continue de onde parou": the last one the escoteiro opened
 * (if it isn't complete yet), else the started-but-unfinished bloco closest to
 * done. `null` when nothing is in progress.
 */
export function pickContinueBloco(
  eixos: Eixo[],
  summaries: Map<string, BlocoSummary>,
  lastVisitedId?: string | null,
): { eixo: Eixo; bloco: Bloco } | null {
  const all = eixos.flatMap((eixo) => eixo.blocos.map((bloco) => ({ eixo, bloco })));
  if (lastVisitedId) {
    const hit = all.find((x) => x.bloco.id === lastVisitedId);
    if (hit && summaries.get(hit.bloco.id)?.state !== "full") return hit;
  }
  let best: { eixo: Eixo; bloco: Bloco } | null = null;
  let bestPct = -1;
  for (const x of all) {
    const s = summaries.get(x.bloco.id);
    if (!s || !s.started || s.state === "full") continue;
    if (s.pendingPct > bestPct) {
      best = x;
      bestPct = s.pendingPct;
    }
  }
  return best;
}

/** Find a bloco (and its eixo) by id. */
export function findBloco(
  eixos: Eixo[],
  blocoId: string,
): { eixo: Eixo; bloco: Bloco; index: number } | null {
  for (const eixo of eixos) {
    const index = eixo.blocos.findIndex((b) => b.id === blocoId);
    if (index >= 0) return { eixo, bloco: eixo.blocos[index]!, index };
  }
  return null;
}

/** localStorage key for the last bloco screen the escoteiro opened. */
export const LAST_BLOCO_KEY = "paxtools:last-bloco";

/** Summaries for every bloco of every eixo, keyed by bloco id. */
export function summarizeAll(eixos: Eixo[], input: BlocoInput): Map<string, BlocoSummary> {
  const out = new Map<string, BlocoSummary>();
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) out.set(bloco.id, summarizeBloco(bloco, input));
  }
  return out;
}
