/**
 * Special interest badge standing — where an escoteiro stands on each
 * insígnia de interesse especial of their current ramo.
 *
 * Unlike an especialidade there are no levels: a badge is earned only when
 * EVERY requirement is approved. An earned badge satisfies the variable
 * section of every bloco that names it, like an earned especialidade.
 *
 * Pure, browser-free and path-alias-free: Convex imports it too.
 */
import type { Ramo } from "../data/progression-data";
import {
  SPECIAL_INTEREST_BADGES,
  badgeRequirementsFor,
} from "../data/badge-data";

type Status = "pending" | "approved";

/** One stored requirement conclusão (current ramo only). */
export type BadgeRequirementRow = {
  badgeId: string;
  requirementIndex: number;
  status?: string;
};

export type BadgeStanding = {
  badgeId: string;
  /** Requirement count in this ramo. */
  total: number;
  /** requirementIndex → status; missing = not marked. */
  requirementStatus: Map<number, Status>;
  approvedCount: number;
  pendingCount: number;
  /** Every requirement approved. */
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
    const total = badgeRequirementsFor(badge.id, ramo).length;
    if (total === 0) continue;
    standings.set(badge.id, {
      badgeId: badge.id,
      total,
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
    s.earned = s.approvedCount === s.total;
  }
  return standings;
}

/** The ids of every earned badge. */
export function earnedBadgeIds(standings: Map<string, BadgeStanding>): Set<string> {
  const ids = new Set<string>();
  for (const s of standings.values()) if (s.earned) ids.add(s.badgeId);
  return ids;
}
