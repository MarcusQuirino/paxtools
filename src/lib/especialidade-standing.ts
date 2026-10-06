/**
 * Especialidade standing — the one place that answers "where does this
 * escoteiro stand on this especialidade": which itens / etapas are approved or
 * waiting, the level, whether it is earned, and what is still missing.
 *
 * Every surface reads it: bloco completion and the progression snapshot (via
 * convex/lib/especialidades), the escotista catalog, roster and stats, the
 * escoteiro's own /especialidades page, the escotista ficha, and the plano.
 * Before this module each of them counted rows its own way and they disagreed
 * (a duplicate or out-of-range row could complete a bloco while the roster
 * still said "em andamento").
 *
 * The rules, stated once:
 * - **Ramo group.** Lobinho + escoteiro share the younger catalog; sênior +
 *   pioneiro share the older one. An unset ramo is younger. Especialidades
 *   carry over within a group and start fresh across it (CONTEXT.md), so a
 *   standing is always computed for one group and ignores the other's rows.
 * - **Younger** (item checklist): an item counts once, by index, and only if
 *   the index is inside the catalog's list. A missing status is approved
 *   (legacy rows). Level 1 at half the items, level 2 at all; earned = level 1.
 * - **Older** (three etapas, ADR 0002): earned once all three etapas are
 *   approved, in any order. Only an explicit "approved" counts. No levels.
 * - **Ids.** Rows are matched by canonical catalog id, so a legacy slug still
 *   lands on its current especialidade; ids the catalog does not know are
 *   ignored.
 *
 * Pure, browser-free and path-alias-free: Convex imports it too.
 */
import type { Id } from "../../convex/_generated/dataModel";
import { YOUNGER_SPECIALTY_BY_ID } from "../data/specialty-data/younger";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  type ProjectStep,
} from "../data/specialty-data/older";
import { getSpecialtyLevel, toCanonicalSpecialtyId } from "./completion-logic";

export type RamoGroup = "younger" | "older";

/** The ramo group a ramo belongs to; unset (mid-onboarding) is younger. */
export function ramoGroupForRamo(ramo: string | null | undefined): RamoGroup {
  return ramo === "senior" || ramo === "pioneiro" ? "older" : "younger";
}

/** Number of etapas in an older especialidade. */
export const ETAPA_COUNT = PROJECT_STEPS.length;

/** Items needed for each younger level, for a catalog list of `total` items. */
export function levelThresholds(total: number): { level1: number; level2: number } {
  return { level1: Math.ceil(total / 2), level2: total };
}

// ---------------------------------------------------------------------------
// Inputs — the stored rows, as narrow as the computation needs.
// ---------------------------------------------------------------------------

type ConclusaoFields = {
  specialtyId: string;
  ramoGroup: RamoGroup;
  status?: "pending" | "approved";
  completedAt: number;
  approvedBy?: Id<"users">;
  approvedAt?: number;
};

export type ItemRow = ConclusaoFields & {
  _id: Id<"specialtyItemCompletions">;
  itemIndex: number;
};

export type ReportRow = ConclusaoFields & {
  _id: Id<"specialtyProjectReports">;
  step: ProjectStep;
  text: string;
};

// ---------------------------------------------------------------------------
// Output — plain data (arrays, records, ids), so a Convex query can return it.
// ---------------------------------------------------------------------------

/** One item's or etapa's conclusão, as the escotista and escoteiro see it. */
export type ConclusaoState<RowId> = {
  status: "approved" | "pending";
  rowId: RowId;
  completedAt: number;
  approvedBy: Id<"users"> | null;
  approvedAt: number | null;
};

export type ItemState = ConclusaoState<Id<"specialtyItemCompletions">>;
export type EtapaState = ConclusaoState<Id<"specialtyProjectReports">> & {
  text: string;
};

type StandingBase = {
  specialtyId: string;
  /** Items in the catalog (younger) or etapas (older). */
  total: number;
  approvedCount: number;
  pendingCount: number;
  /** Younger: level ≥ 1. Older: all three etapas approved. */
  earned: boolean;
  /** Oldest submission still waiting on an escotista, or null. */
  oldestPendingAt: number | null;
};

export type YoungerStanding = StandingBase & {
  kind: "younger";
  level: 0 | 1 | 2;
  /** Index-aligned with the catalog's items; null = not marked. */
  items: (ItemState | null)[];
  /** Approved items still missing for the next level; null at level 2. */
  missingForNextLevel: number | null;
};

export type OlderStanding = StandingBase & {
  kind: "older";
  etapas: Record<ProjectStep, EtapaState | null>;
};

export type Standing = YoungerStanding | OlderStanding;

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

function toState<RowId>(row: ConclusaoFields & { _id: RowId }, approved: boolean): ConclusaoState<RowId> {
  return {
    status: approved ? "approved" : "pending",
    rowId: row._id,
    completedAt: row.completedAt,
    approvedBy: row.approvedBy ?? null,
    approvedAt: row.approvedAt ?? null,
  };
}

function groupByCanonicalId<R extends { specialtyId: string }>(
  rows: R[],
  known: (id: string) => boolean,
): Map<string, R[]> {
  const out = new Map<string, R[]>();
  for (const row of rows) {
    const id = toCanonicalSpecialtyId(row.specialtyId);
    if (!known(id)) continue;
    const list = out.get(id);
    if (list) list.push(row);
    else out.set(id, [row]);
  }
  return out;
}

function oldestPending(states: (ConclusaoState<unknown> | null)[]): number | null {
  let oldest: number | null = null;
  for (const s of states) {
    if (s?.status !== "pending") continue;
    if (oldest === null || s.completedAt < oldest) oldest = s.completedAt;
  }
  return oldest;
}

function youngerStanding(specialtyId: string, total: number, rows: ItemRow[]): YoungerStanding {
  const items: (ItemState | null)[] = Array.from({ length: total }, () => null);
  for (const row of rows) {
    const i = row.itemIndex;
    if (!Number.isInteger(i) || i < 0 || i >= total) continue;
    const approved = row.status !== "pending";
    // One state per index; approved wins if the data ever disagrees.
    if (items[i]?.status === "approved" && !approved) continue;
    items[i] = toState(row, approved);
  }
  const approvedCount = items.filter((s) => s?.status === "approved").length;
  const pendingCount = items.filter((s) => s?.status === "pending").length;
  const level = getSpecialtyLevel(approvedCount, total);
  const { level1, level2 } = levelThresholds(total);
  return {
    kind: "younger",
    specialtyId,
    total,
    items,
    approvedCount,
    pendingCount,
    level,
    earned: level >= 1,
    missingForNextLevel:
      level === 2 ? null : (level === 1 ? level2 : level1) - approvedCount,
    oldestPendingAt: oldestPending(items),
  };
}

function olderStanding(specialtyId: string, rows: ReportRow[]): OlderStanding {
  const etapas: Record<ProjectStep, EtapaState | null> = {
    conhecer: null,
    fazer: null,
    compartilhar: null,
  };
  for (const row of rows) {
    if (!PROJECT_STEPS.includes(row.step)) continue;
    // Explicit compare: only "approved" counts toward earning (ADR 0002).
    const approved = row.status === "approved";
    if (etapas[row.step]?.status === "approved" && !approved) continue;
    etapas[row.step] = { ...toState(row, approved), text: row.text };
  }
  const states = PROJECT_STEPS.map((s) => etapas[s]);
  const approvedCount = states.filter((s) => s?.status === "approved").length;
  return {
    kind: "older",
    specialtyId,
    total: ETAPA_COUNT,
    etapas,
    approvedCount,
    pendingCount: states.filter((s) => s?.status === "pending").length,
    earned: approvedCount === ETAPA_COUNT,
    oldestPendingAt: oldestPending(states),
  };
}

/**
 * Every especialidade of `group` the rows touch, each with its standing.
 * Especialidades with no row are absent — callers list them from the catalog.
 * Rows of the other ramo group are ignored.
 */
export function computeStandings(
  group: RamoGroup,
  rows: { items?: ItemRow[]; reports?: ReportRow[] },
): Standing[] {
  if (group === "younger") {
    const own = (rows.items ?? []).filter((r) => r.ramoGroup === "younger");
    const byId = groupByCanonicalId(own, (id) => YOUNGER_SPECIALTY_BY_ID.has(id));
    return [...byId].map(([id, list]) =>
      youngerStanding(id, YOUNGER_SPECIALTY_BY_ID.get(id)!.items.length, list),
    );
  }
  const own = (rows.reports ?? []).filter((r) => r.ramoGroup === "older");
  const byId = groupByCanonicalId(own, (id) => OLDER_SPECIALTY_BY_ID.has(id));
  return [...byId].map(([id, list]) => olderStanding(id, list));
}

/** A not-started standing, for rendering an especialidade nobody touched. */
export function emptyStanding(group: RamoGroup, specialtyId: string): Standing | null {
  if (group === "younger") {
    const s = YOUNGER_SPECIALTY_BY_ID.get(specialtyId);
    return s ? youngerStanding(specialtyId, s.items.length, []) : null;
  }
  return OLDER_SPECIALTY_BY_ID.has(specialtyId) ? olderStanding(specialtyId, []) : null;
}

/** Index standings by especialidade id. */
export function standingsById<S extends Standing>(standings: S[]): Map<string, S> {
  return new Map(standings.map((s) => [s.specialtyId, s]));
}

/** Ids of the especialidades the standings count as earned. */
export function earnedSpecialtyIds(standings: Standing[]): Set<string> {
  return new Set(standings.filter((s) => s.earned).map((s) => s.specialtyId));
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
