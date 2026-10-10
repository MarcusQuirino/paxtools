/**
 * Special interest badge standing — where an escoteiro stands on each
 * insígnia de interesse especial of their current ramo.
 *
 * Unlike an especialidade there are no levels: a badge is earned only when
 * EVERY requirement group is satisfied — enough of its items approved (a group
 * may ask for only some, "pelo menos duas"), including its mandatory ones.
 * An earned badge satisfies the variable section of every bloco that names
 * it, like an earned especialidade.
 *
 * Pure, browser-free and path-alias-free: Convex imports it too.
 */
import type { Ramo } from "../data/progression-data";
import {
  SPECIAL_INTEREST_BADGES,
  badgeGroupsFor,
  type RequirementGroup,
} from "../data/badge-data";

type Status = "pending" | "approved";

/** One stored requirement conclusão (current ramo only). */
export type BadgeRequirementRow = {
  badgeId: string;
  requirementIndex: number;
  status?: string;
};

/** Where an escoteiro stands on one requirement group. */
export type GroupStanding = {
  /** Flat requirementIndex of the group's first item. */
  offset: number;
  size: number;
  /** Approved items needed (the group's `required`, else all). */
  needed: number;
  approvedCount: number;
  pendingCount: number;
  /** Enough approved, mandatory ones included. */
  satisfied: boolean;
};

export type BadgeStanding = {
  badgeId: string;
  /** Requirement count (all items of all groups) in this ramo. */
  total: number;
  /** Approved items that count toward the badge: Σ min(approved, needed). */
  progress: number;
  /** Approved items the badge needs in all: Σ needed. */
  needed: number;
  groups: GroupStanding[];
  /** requirementIndex → status; missing = not marked. */
  requirementStatus: Map<number, Status>;
  approvedCount: number;
  pendingCount: number;
  /** Every group satisfied. */
  earned: boolean;
};

/**
 * One standing per badge the ramo's catalog defines requirements for. Rows of
 * unknown badges or out-of-range indexes are ignored; a row without status is
 * legacy and counts as approved, like every other conclusão.
 */
export function computeBadgeStandings(
  ramo: Ramo | null | undefined,
  rows: BadgeRequirementRow[],
): Map<string, BadgeStanding> {
  const standings = new Map<string, BadgeStanding>();
  for (const badge of SPECIAL_INTEREST_BADGES) {
    const groups = badgeGroupsFor(badge.id, ramo);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    if (total === 0) continue;
    standings.set(badge.id, {
      badgeId: badge.id,
      total,
      progress: 0,
      needed: 0,
      groups: [],
      requirementStatus: new Map(),
      approvedCount: 0,
      pendingCount: 0,
      earned: false,
    });
  }
  for (const row of rows) {
    const s = standings.get(row.badgeId);
    if (!s) continue;
    const i = row.requirementIndex;
    if (!Number.isInteger(i) || i < 0 || i >= s.total) continue;
    const status: Status = row.status === "pending" ? "pending" : "approved";
    // Approved wins over a stray duplicate pending row.
    if (s.requirementStatus.get(i) === "approved") continue;
    s.requirementStatus.set(i, status);
  }
  for (const s of standings.values()) {
    for (const status of s.requirementStatus.values()) {
      if (status === "approved") s.approvedCount++;
      else s.pendingCount++;
    }
    let offset = 0;
    for (const g of badgeGroupsFor(s.badgeId, ramo)) {
      const gs = groupStanding(g, offset, s.requirementStatus);
      s.groups.push(gs);
      s.progress += Math.min(gs.approvedCount, gs.needed);
      s.needed += gs.needed;
      offset += g.items.length;
    }
    s.earned = s.groups.every((g) => g.satisfied);
  }
  return standings;
}

function groupStanding(
  group: RequirementGroup,
  offset: number,
  statusOf: Map<number, Status>,
): GroupStanding {
  const size = group.items.length;
  const needed = Math.min(group.required ?? size, size);
  let approvedCount = 0;
  let pendingCount = 0;
  for (let i = 0; i < size; i++) {
    const status = statusOf.get(offset + i);
    if (status === "approved") approvedCount++;
    else if (status === "pending") pendingCount++;
  }
  const mandatoryDone = (group.mandatory ?? []).every(
    (i) => statusOf.get(offset + i) === "approved",
  );
  return {
    offset,
    size,
    needed,
    approvedCount,
    pendingCount,
    satisfied: mandatoryDone && approvedCount >= needed,
  };
}

/** The ids of every earned badge. */
export function earnedBadgeIds(standings: Map<string, BadgeStanding>): Set<string> {
  const ids = new Set<string>();
  for (const s of standings.values()) if (s.earned) ids.add(s.badgeId);
  return ids;
}
