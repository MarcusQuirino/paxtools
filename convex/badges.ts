/**
 * Insígnias de interesse especial (special interest badges) — the escotista's
 * tropa view. Marking and reviewing live with the rest of progression
 * (progression.toggleBadgeRequirement, approvals.*BadgeRequirement).
 */
import { query } from "./_generated/server";
import { tryResolveRamoViewer } from "./lib/ramoVisibility";
import { readObservedEscoteiros } from "./lib/sections";
import { currentRamo } from "./lib/progression";
import { readBadgeRequirements } from "./lib/badges";
import { computeBadgeStandings } from "../src/lib/badge-standing";
import type { Id } from "./_generated/dataModel";
import type { Ramo } from "../src/data/progression-data";

type Person = {
  _id: Id<"users">;
  name: string | null;
  image: string | null;
  ramo: Ramo;
  /** Approved items that count / items needed, in the escoteiro's ramo. */
  progress: number;
  needed: number;
  pendingCount: number;
  earned: boolean;
};

/**
 * Per insígnia, across the escoteiros the escotista sees (observed seção
 * applied): who conquistou, who is em andamento (any row short of earned),
 * pending requirement count, and everyone with activity — closest to earning
 * first. Insígnias nobody has touched are absent; the client lists them from
 * the static catalog. Null for a caller who is not a valid escotista viewer.
 */
export const getGroupBadgeSummary = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return null;
    const { escoteiros, observedSection } = await readObservedEscoteiros(ctx, viewer);

    const byBadge = new Map<string, Person[]>();
    const ramos = new Set<Ramo>();
    for (const e of escoteiros) {
      const ramo = currentRamo(e);
      ramos.add(ramo);
      const rows = await readBadgeRequirements(ctx, e._id, ramo);
      if (rows.length === 0) continue;
      for (const s of computeBadgeStandings(ramo, rows).values()) {
        if (s.approvedCount === 0 && s.pendingCount === 0) continue;
        const list = byBadge.get(s.badgeId) ?? [];
        list.push({
          _id: e._id,
          name: e.name ?? null,
          image: e.image ?? null,
          ramo,
          progress: s.progress,
          needed: s.needed,
          pendingCount: s.pendingCount,
          earned: s.earned,
        });
        byBadge.set(s.badgeId, list);
      }
    }

    const totals = { earned: 0, inProgress: 0, pending: 0 };
    const badges = [...byBadge].map(([badgeId, people]) => {
      people.sort(
        (a, b) =>
          Number(b.earned) - Number(a.earned) ||
          b.progress / b.needed - a.progress / a.needed ||
          b.pendingCount - a.pendingCount ||
          (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"),
      );
      const earnedCount = people.filter((p) => p.earned).length;
      const pendingCount = people.reduce((n, p) => n + p.pendingCount, 0);
      totals.earned += earnedCount;
      totals.inProgress += people.length - earnedCount;
      totals.pending += pendingCount;
      return {
        badgeId,
        earnedCount,
        inProgressCount: people.length - earnedCount,
        pendingCount,
        people,
      };
    });
    badges.sort(
      (a, b) =>
        b.people.length - a.people.length ||
        b.earnedCount - a.earnedCount ||
        a.badgeId.localeCompare(b.badgeId),
    );

    return {
      escoteiroCount: escoteiros.length,
      observedSectionName: observedSection?.name ?? null,
      /** Ramos of the visible escoteiros — which catalog lists to show. */
      ramos: [...ramos],
      totals,
      badges,
    };
  },
});
