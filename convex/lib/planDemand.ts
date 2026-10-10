import type { Id } from "../_generated/dataModel";
// Browser- and alias-free src/ imports (convex typechecks them; see coverage.ts).
import { decodePlanKey } from "../../src/lib/plan-keys";
import { toCanonicalSpecialtyId } from "../../src/lib/completion-logic";

/**
 * Plano demand across a cohort: which ações and especialidades many
 * escoteiros put in their Plano, so an escotista can find what to do together.
 * Ações personalizadas are individual and never counted.
 */

/** One escoteiro's Plano and the progression it is read against. */
export type ScoutPlano = {
  scoutId: Id<"users">;
  name: string | null;
  itemKeys: string[];
  approvedActionIds: ReadonlySet<string>;
  pendingActionIds: ReadonlySet<string>;
  earnedSpecialtyIds: ReadonlySet<string>;
};

export type DemandScout = { scoutId: Id<"users">; name: string | null };

export type PlanDemandItem =
  | { kind: "action"; actionId: string }
  | { kind: "especialidade"; specialtyId: string };

export type PlanDemand = PlanDemandItem & {
  /** Planned and not yet done — who still wants to do it. */
  wanting: DemandScout[];
  /** Planned, done, awaiting an escotista. */
  pendingCount: number;
  /** Planned and already done. */
  doneCount: number;
};

export type RamoPlanDemand = {
  scoutCount: number;
  /** Escoteiros with at least one countable Plano item. */
  scoutsWithPlan: number;
  /** Countable Plano items across the cohort. */
  plannedItemCount: number;
  /** Most wanted first; ties by fewest already done, then id. */
  items: PlanDemand[];
};

export function aggregatePlanDemand(
  plans: ScoutPlano[],
  isKnown: {
    action: (actionId: string) => boolean;
    especialidade: (specialtyId: string) => boolean;
  },
): RamoPlanDemand {
  const byKey = new Map<string, PlanDemand>();
  let scoutsWithPlan = 0;
  let plannedItemCount = 0;

  for (const plan of plans) {
    // A legacy `specialty:` key and an `especialidade:` key for the same
    // especialidade count once per escoteiro.
    const seen = new Set<string>();
    for (const itemKey of plan.itemKeys) {
      const item = countable(itemKey, isKnown);
      if (!item) continue;
      const key =
        item.kind === "action" ? `a:${item.actionId}` : `e:${item.specialtyId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let d = byKey.get(key);
      if (!d) {
        d = { ...item, wanting: [], pendingCount: 0, doneCount: 0 };
        byKey.set(key, d);
      }
      const state = stateOf(item, plan);
      if (state === "done") d.doneCount += 1;
      else if (state === "pending") d.pendingCount += 1;
      else d.wanting.push({ scoutId: plan.scoutId, name: plan.name });
    }
    if (seen.size > 0) scoutsWithPlan += 1;
    plannedItemCount += seen.size;
  }

  const idOf = (d: PlanDemand) =>
    d.kind === "action" ? d.actionId : d.specialtyId;
  const items = [...byKey.values()].sort(
    (a, b) =>
      b.wanting.length - a.wanting.length ||
      a.doneCount - b.doneCount ||
      idOf(a).localeCompare(idOf(b)),
  );

  return { scoutCount: plans.length, scoutsWithPlan, plannedItemCount, items };
}

function countable(
  itemKey: string,
  isKnown: Parameters<typeof aggregatePlanDemand>[1],
): PlanDemandItem | null {
  const decoded = decodePlanKey(itemKey);
  if (!decoded) return null;
  if (decoded.kind === "action") {
    return isKnown.action(decoded.actionId)
      ? { kind: "action", actionId: decoded.actionId }
      : null;
  }
  const specialtyId =
    decoded.kind === "especialidade"
      ? decoded.specialtyId
      : decoded.kind === "specialty"
        ? toCanonicalSpecialtyId(decoded.specialtyName)
        : null;
  return specialtyId && isKnown.especialidade(specialtyId)
    ? { kind: "especialidade", specialtyId }
    : null;
}

function stateOf(
  item: PlanDemandItem,
  plan: ScoutPlano,
): "open" | "pending" | "done" {
  if (item.kind === "especialidade") {
    return plan.earnedSpecialtyIds.has(item.specialtyId) ? "done" : "open";
  }
  if (plan.approvedActionIds.has(item.actionId)) return "done";
  return plan.pendingActionIds.has(item.actionId) ? "pending" : "open";
}
