import type { Doc } from "../_generated/dataModel";
import { getSpecialtyLevel } from "../../src/lib/completion-logic";

/**
 * Pure per-escoteiro especialidade progress, shared by the escotista catalog
 * (getGroupSpecialtySummary) and detail (getSpecialtyRoster) reads so the two
 * never disagree on what "conquistou" / "em andamento" means.
 *
 * Approved = anything not explicitly pending — a missing status on a legacy
 * row counts as approved, matching readEarnedYoungerSpecialtyIds and the
 * /especialidades page.
 */

export type ProjectStep = "conhecer" | "fazer" | "compartilhar";
export const PROJECT_STEPS: readonly ProjectStep[] = [
  "conhecer",
  "fazer",
  "compartilhar",
];

export type YoungerProgress = {
  approvedCount: number;
  pendingCount: number;
  level: 0 | 1 | 2;
  approvedIndexes: Set<number>;
  pendingIndexes: Set<number>;
};

/**
 * Progress of one escoteiro on one younger especialidade. Rows outside
 * `[0, totalItems)` are ignored so a stray row can never push a count past
 * the catalog's item list.
 */
export function youngerProgress(
  rows: Pick<Doc<"specialtyItemCompletions">, "itemIndex" | "status">[],
  totalItems: number,
): YoungerProgress {
  const approvedIndexes = new Set<number>();
  const pendingIndexes = new Set<number>();
  for (const r of rows) {
    if (r.itemIndex < 0 || r.itemIndex >= totalItems) continue;
    if (r.status === "pending") pendingIndexes.add(r.itemIndex);
    else approvedIndexes.add(r.itemIndex);
  }
  // An index can't be both; approved wins if the data ever disagrees.
  for (const i of approvedIndexes) pendingIndexes.delete(i);
  const approvedCount = approvedIndexes.size;
  return {
    approvedCount,
    pendingCount: pendingIndexes.size,
    level: getSpecialtyLevel(approvedCount, totalItems) as 0 | 1 | 2,
    approvedIndexes,
    pendingIndexes,
  };
}

export type StepStatus = "approved" | "pending" | null;

export type OlderProgress = {
  steps: Record<ProjectStep, StepStatus>;
  approvedCount: number;
  pendingCount: number;
  /** All three etapas approved (ADR 0002) — binary, no levels. */
  earned: boolean;
};

/** Progress of one escoteiro on one older especialidade (three etapas). */
export function olderProgress(
  rows: Pick<Doc<"specialtyProjectReports">, "step" | "status">[],
): OlderProgress {
  const steps: Record<ProjectStep, StepStatus> = {
    conhecer: null,
    fazer: null,
    compartilhar: null,
  };
  for (const r of rows) {
    // Explicit "approved" compare, like readEarnedOlderSpecialtyIds.
    steps[r.step] = r.status === "approved" ? "approved" : "pending";
  }
  const approvedCount = PROJECT_STEPS.filter(
    (s) => steps[s] === "approved",
  ).length;
  const pendingCount = PROJECT_STEPS.filter((s) => steps[s] === "pending").length;
  return { steps, approvedCount, pendingCount, earned: approvedCount === 3 };
}

/**
 * Sort key for "Quem tem" / avatar stacks: closest to conquering first —
 * more approved, then more pending (waiting only on the escotista), then name.
 */
export function compareByProximity(
  a: { approvedCount: number; pendingCount: number; name?: string | null },
  b: { approvedCount: number; pendingCount: number; name?: string | null },
): number {
  if (b.approvedCount !== a.approvedCount) {
    return b.approvedCount - a.approvedCount;
  }
  if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
  return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");
}
