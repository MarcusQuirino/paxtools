import { query } from "./_generated/server";
import { v } from "convex/values";
import { computeRamoCoverage } from "./lib/coverage";
import { ramoGroupForRamo, snapshotProgression } from "./lib/progression";
import { resolveStatsCohort } from "./lib/statsCohort";
import { readStandings } from "./lib/especialidades";
import { getEixosForRamo } from "../src/data/progression-data";
import { getEarnedSpecialtyBlocoIds } from "../src/lib/completion-logic";
import { decodePlanKey } from "../src/lib/plan-keys";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";
import { OLDER_SPECIALTY_BY_ID } from "../src/data/specialty-data/older";
import type { Id } from "./_generated/dataModel";

const ramoArg = v.optional(
  v.union(
    v.literal("lobinho"),
    v.literal("escoteiro"),
    v.literal("senior"),
    v.literal("pioneiro"),
  ),
);

export const getRamoCoverage = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args) => {
    const { groupId, ramo, scouts, observedSection } = await resolveStatsCohort(
      ctx,
      args.ramo,
    );
    const coverage = await computeRamoCoverage(ctx, { groupId, ramo, scouts });
    return { ...coverage, observedSectionName: observedSection?.name ?? null };
  },
});

export type ScoutRow = {
  _id: Id<"users">;
  name: string | null;
  stageId: string;
  stageName: string;
  completedBlockCount: number;
  joinedAt: number; // user account _creationTime (approximation of group-join)
};

export const getRamoScouts = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args) => {
    const { scouts } = await resolveStatsCohort(ctx, args.ramo);
    const rows: ScoutRow[] = [];
    for (const s of scouts) {
      const snap = await snapshotProgression(ctx, s._id);
      rows.push({
        _id: s._id,
        name: s.name ?? null,
        stageId: snap.stageId,
        stageName: snap.stageName,
        completedBlockCount: snap.completedBlockCount,
        joinedAt: s._creationTime,
      });
    }
    rows.sort((a, b) =>
      a.completedBlockCount !== b.completedBlockCount
        ? a.completedBlockCount - b.completedBlockCount
        : a.joinedAt - b.joinedAt, // ASC joinedAt: newest accounts last among ties (brand-new member doesn't falsely lead "who is behind")
    );
    return rows;
  },
});

// ---------------------------------------------------------------------------
// Especialidades on Stats. Cohort = the ramo's escoteiros (same as coverage);
// each one's especialidade record is their whole ramoGroup, since especialidades
// carry over within it (CONTEXT.md). "Conquistou" / "em andamento" come from
// the especialidade standing (src/lib/especialidade-standing), so they match
// the Especialidades tab and bloco completion exactly.
// ---------------------------------------------------------------------------

const TOP_EARNED = 5;
const MAX_PENDING = 10;
const TOP_DEMAND = 5;

export type SpecialtyStats = {
  ramo: "lobinho" | "escoteiro" | "senior" | "pioneiro";
  ramoGroup: "younger" | "older";
  scoutCount: number;
  totals: {
    /** (escoteiro, especialidade) pairs conquered. */
    earned: number;
    /** Younger only: pairs at Nível 2. Always 0 for older. */
    level2: number;
    inProgress: number;
    /** Pending items (younger) or relatos (older) awaiting an escotista. */
    pending: number;
    /** Distinct especialidades conquered by anyone in the cohort. */
    distinctEarned: number;
    /** Escoteiros with no especialidade activity at all. */
    scoutsWithNone: number;
  };
  topEarned: {
    specialtyId: string;
    eixoId: string;
    earnedCount: number;
    inProgressCount: number;
  }[];
  /** Oldest first — what the escotista should review next. */
  pending: {
    specialtyId: string;
    escoteiroId: Id<"users">;
    escoteiroName: string | null;
    count: number;
    oldestAt: number;
  }[];
  /** Blocos completed through an earned especialidade, most escoteiros first. */
  blocosViaEspecialidade: {
    blocoId: string;
    blocoName: string;
    eixoId: string;
    scoutCount: number;
  }[];
  /** Especialidades starred in escoteiros' plano for this ramo. */
  demand: {
    specialtyId: string;
    eixoId: string;
    starredCount: number;
    /** Of those who starred it, how many already have activity on it. */
    startedCount: number;
  }[];
};

export const getRamoSpecialties = query({
  args: { ramo: ramoArg },
  handler: async (ctx, args): Promise<SpecialtyStats> => {
    const { ramo, scouts } = await resolveStatsCohort(ctx, args.ramo);
    const ramoGroup = ramoGroupForRamo(ramo);
    const eixos = getEixosForRamo(ramo);
    const blocoById = new Map(
      eixos.flatMap((e) => e.blocos.map((b) => [b.id, b] as const)),
    );

    type Agg = { eixoId: string; earned: number; inProgress: number };
    const bySpecialty = new Map<string, Agg>();
    const blocoCounts = new Map<string, number>();
    const demandBy = new Map<string, { starred: number; started: number }>();
    const pending: SpecialtyStats["pending"] = [];
    const totals = {
      earned: 0,
      level2: 0,
      inProgress: 0,
      pending: 0,
      distinctEarned: 0,
      scoutsWithNone: 0,
    };

    for (const scout of scouts) {
      // specialtyId → standing, for every especialidade with any activity.
      const progress = new Map(
        (await readStandings(ctx, scout._id, ramoGroup))
          .filter((st) => st.approvedCount > 0 || st.pendingCount > 0)
          .map((st) => [
            st.specialtyId,
            {
              earned: st.earned,
              level2: st.kind === "younger" && st.level === 2,
              pendingCount: st.pendingCount,
              oldestAt: st.oldestPendingAt ?? 0,
            },
          ]),
      );

      if (progress.size === 0) totals.scoutsWithNone += 1;
      const earnedIds = new Set<string>();
      for (const [specialtyId, p] of progress) {
        let agg = bySpecialty.get(specialtyId);
        if (!agg) {
          agg = { eixoId: specialtyEixoId(specialtyId), earned: 0, inProgress: 0 };
          bySpecialty.set(specialtyId, agg);
        }
        if (p.earned) {
          agg.earned += 1;
          totals.earned += 1;
          earnedIds.add(specialtyId);
          if (p.level2) totals.level2 += 1;
        } else {
          agg.inProgress += 1;
          totals.inProgress += 1;
        }
        if (p.pendingCount > 0) {
          totals.pending += p.pendingCount;
          pending.push({
            specialtyId,
            escoteiroId: scout._id,
            escoteiroName: scout.name ?? null,
            count: p.pendingCount,
            oldestAt: p.oldestAt,
          });
        }
      }

      for (const blocoId of getEarnedSpecialtyBlocoIds(eixos, earnedIds)) {
        blocoCounts.set(blocoId, (blocoCounts.get(blocoId) ?? 0) + 1);
      }

      // Plano demand: catalog-starred especialidades in this ramo's plano.
      // Legacy bloco-bound `specialty:` keys are not folded in here.
      const planned = await ctx.db
        .query("plannedItems")
        .withIndex("by_userId_and_ramo_and_position", (q) =>
          q.eq("userId", scout._id).eq("ramo", ramo),
        )
        .take(500);
      for (const item of planned) {
        const key = decodePlanKey(item.itemKey);
        if (key?.kind !== "especialidade") continue;
        if (!specialtyExists(ramoGroup, key.specialtyId)) continue;
        const d = demandBy.get(key.specialtyId) ?? { starred: 0, started: 0 };
        d.starred += 1;
        if (progress.has(key.specialtyId)) d.started += 1;
        demandBy.set(key.specialtyId, d);
      }
    }

    totals.distinctEarned = [...bySpecialty.values()].filter((a) => a.earned > 0).length;

    const topEarned = [...bySpecialty]
      .filter(([, a]) => a.earned > 0)
      .map(([specialtyId, a]) => ({
        specialtyId,
        eixoId: a.eixoId,
        earnedCount: a.earned,
        inProgressCount: a.inProgress,
      }))
      .sort(
        (a, b) =>
          b.earnedCount - a.earnedCount ||
          b.inProgressCount - a.inProgressCount ||
          a.specialtyId.localeCompare(b.specialtyId),
      )
      .slice(0, TOP_EARNED);

    pending.sort((a, b) => a.oldestAt - b.oldestAt);

    const blocosViaEspecialidade = [...blocoCounts]
      .flatMap(([blocoId, scoutCount]) => {
        const bloco = blocoById.get(blocoId);
        return bloco
          ? [{ blocoId, blocoName: bloco.name, eixoId: bloco.eixoId, scoutCount }]
          : [];
      })
      .sort((a, b) => b.scoutCount - a.scoutCount || a.blocoId.localeCompare(b.blocoId));

    const demand = [...demandBy]
      .map(([specialtyId, d]) => ({
        specialtyId,
        eixoId: specialtyEixoId(specialtyId),
        starredCount: d.starred,
        startedCount: d.started,
      }))
      .sort(
        (a, b) =>
          b.starredCount - a.starredCount ||
          a.startedCount - b.startedCount ||
          a.specialtyId.localeCompare(b.specialtyId),
      )
      .slice(0, TOP_DEMAND);

    return {
      ramo,
      ramoGroup,
      scoutCount: scouts.length,
      totals,
      topEarned,
      pending: pending.slice(0, MAX_PENDING),
      blocosViaEspecialidade,
      demand,
    };
  },
});

function specialtyEixoId(specialtyId: string): string {
  return (
    YOUNGER_SPECIALTY_BY_ID.get(specialtyId)?.eixoId ??
    OLDER_SPECIALTY_BY_ID.get(specialtyId)?.eixoId ??
    ""
  );
}

function specialtyExists(ramoGroup: "younger" | "older", specialtyId: string): boolean {
  return ramoGroup === "younger"
    ? YOUNGER_SPECIALTY_BY_ID.has(specialtyId)
    : OLDER_SPECIALTY_BY_ID.has(specialtyId);
}
