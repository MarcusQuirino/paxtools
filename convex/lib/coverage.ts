import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getEixosForRamo } from "../../src/data/progression-data";
import { buildCatalogIndex } from "../../src/lib/plan-view";
import { STAGES } from "../../src/data/progression-rules";
import { snapshotProgression } from "./progression";

export type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

export type ActivityCoverage = {
  actionId: string;
  blocoId: string;
  eixoId: string;
  eixoName: string;
  type: "fixed" | "variable";
  text: string;
  completedCount: number;
};

export type EixoCoverage = {
  eixoId: string;
  eixoName: string;
  fixedCount: number;
  fixedAvgCompletion: number;
  variableCount: number;
  variableAvgCompletion: number;
  coveragePct: number;
};

export type RamoCoverage = {
  ramo: Ramo;
  scoutCount: number;
  stageDistribution: Record<string, number>;
  eixos: EixoCoverage[];
  activities: ActivityCoverage[];
  topGapsFixed: ActivityCoverage[];
  neglectedVariable: ActivityCoverage[];
  mostDone: ActivityCoverage[];
};

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export async function computeRamoCoverage(
  ctx: QueryCtx,
  args: { groupId: Id<"groups">; ramo: Ramo },
): Promise<RamoCoverage> {
  const { groupId, ramo } = args;
  const eixos = getEixosForRamo(ramo);
  const catalog = buildCatalogIndex(eixos);

  // In-scope scouts: approved, non-banned escoteiros of this ramo in the group.
  const members = await ctx.db
    .query("users")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .take(500);
  const scouts = members.filter(
    (m) =>
      m.role === "escoteiro" &&
      !m.bannedAt &&
      (m.membershipStatus ?? "approved") === "approved" &&
      m.ramo === ramo,
  );
  const scoutCount = scouts.length;

  // Per-actionId approved scout count (restricted to the ramo catalog).
  // N+1 by_userId .collect() over <=28 scouts/ramo is acceptable at this scale.
  const approvedByAction = new Map<string, number>();
  const stageDistribution: Record<string, number> = {};
  for (const s of STAGES) stageDistribution[s.id] = 0;

  for (const scout of scouts) {
    const rows = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", scout._id))
      .collect();
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.status === "pending") continue; // approved or undefined count
      if (!catalog.actionsById.has(r.actionId)) continue; // drop stale/foreign
      if (seen.has(r.actionId)) continue; // de-dup per scout
      seen.add(r.actionId);
      approvedByAction.set(
        r.actionId,
        (approvedByAction.get(r.actionId) ?? 0) + 1,
      );
    }
    const snap = await snapshotProgression(ctx, scout._id);
    stageDistribution[snap.stageId] =
      (stageDistribution[snap.stageId] ?? 0) + 1;
  }

  // One ActivityCoverage per catalog action.
  const activities: ActivityCoverage[] = [];
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      const push = (
        actionId: string,
        text: string,
        type: "fixed" | "variable",
      ) =>
        activities.push({
          actionId,
          blocoId: bloco.id,
          eixoId: eixo.id,
          eixoName: eixo.name,
          type,
          text,
          completedCount: approvedByAction.get(actionId) ?? 0,
        });
      for (const a of bloco.fixedActions) push(a.id, a.text, "fixed");
      for (const a of bloco.variableActions) push(a.id, a.text, "variable");
    }
  }

  // Per-eixo aggregates.
  const eixosOut: EixoCoverage[] = eixos.map((eixo) => {
    const inEixo = activities.filter((x) => x.eixoId === eixo.id);
    const fixed = inEixo.filter((x) => x.type === "fixed");
    const variable = inEixo.filter((x) => x.type === "variable");
    const frac = (x: ActivityCoverage) =>
      scoutCount === 0 ? 0 : x.completedCount / scoutCount;
    return {
      eixoId: eixo.id,
      eixoName: eixo.name,
      fixedCount: fixed.length,
      fixedAvgCompletion: scoutCount === 0 ? 0 : mean(fixed.map(frac)),
      variableCount: variable.length,
      variableAvgCompletion: scoutCount === 0 ? 0 : mean(variable.map(frac)),
      coveragePct: scoutCount === 0 ? 0 : mean(inEixo.map(frac)) * 100,
    };
  });

  const byCountThenId =
    (dir: 1 | -1) => (a: ActivityCoverage, b: ActivityCoverage) =>
      a.completedCount !== b.completedCount
        ? dir * (a.completedCount - b.completedCount)
        : a.actionId < b.actionId
          ? -1
          : a.actionId > b.actionId
            ? 1
            : 0;

  const topGapsFixed = activities
    .filter((x) => x.type === "fixed")
    .sort(byCountThenId(1));
  const neglectedVariable = activities
    .filter((x) => x.type === "variable")
    .sort(byCountThenId(1));
  const mostDone = [...activities].sort(byCountThenId(-1));

  return {
    ramo,
    scoutCount,
    stageDistribution,
    eixos: eixosOut,
    activities,
    topGapsFixed,
    neglectedVariable,
    mostDone,
  };
}
