/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import type { Id } from "../_generated/dataModel";
import { aggregatePlanDemand, type ScoutPlano } from "./planDemand";

const A = "escoteiro:democracia:fixed:0";
const B = "escoteiro:democracia:variable:0";
const known = {
  action: (id: string) => id === A || id === B,
  especialidade: (id: string) => id === "arte-digital",
};

function plano(
  name: string,
  itemKeys: string[],
  done: { approved?: string[]; pending?: string[]; earned?: string[] } = {},
): ScoutPlano {
  return {
    scoutId: name as Id<"users">,
    name,
    itemKeys,
    approvedActionIds: new Set(done.approved),
    pendingActionIds: new Set(done.pending),
    earnedSpecialtyIds: new Set(done.earned),
  };
}

describe("aggregatePlanDemand", () => {
  test("counts who still wants each item, most wanted first", () => {
    const demand = aggregatePlanDemand(
      [
        plano("Ana", [`action:${A}`, `action:${B}`]),
        plano("Bia", [`action:${B}`]),
        plano("Caio", [`action:${B}`], { pending: [B] }),
        plano("Davi", [`action:${A}`], { approved: [A] }),
        plano("Eva", []),
      ],
      known,
    );
    expect(demand.scoutCount).toBe(5);
    expect(demand.scoutsWithPlan).toBe(4);
    expect(demand.plannedItemCount).toBe(5);
    expect(demand.items.map((d) => d.kind === "action" && d.actionId)).toEqual([B, A]);
    const [b, a] = demand.items;
    expect(b!.wanting.map((w) => w.name)).toEqual(["Ana", "Bia"]);
    expect(b!.pendingCount).toBe(1);
    expect(a!.wanting.map((w) => w.name)).toEqual(["Ana"]);
    expect(a!.doneCount).toBe(1);
  });

  test("legacy specialty keys merge with especialidade keys, once per escoteiro", () => {
    const demand = aggregatePlanDemand(
      [
        plano("Ana", ["especialidade:arte-digital", "specialty:bloco-x:Arte Digital"]),
        plano("Bia", ["specialty:bloco-x:Arte Digital"], { earned: ["arte-digital"] }),
      ],
      known,
    );
    expect(demand.items).toHaveLength(1);
    expect(demand.items[0]).toMatchObject({
      kind: "especialidade",
      specialtyId: "arte-digital",
      doneCount: 1,
    });
    expect(demand.items[0]!.wanting.map((w) => w.name)).toEqual(["Ana"]);
  });

  test("ignores ações personalizadas and stale/unknown keys", () => {
    const demand = aggregatePlanDemand(
      [plano("Ana", ["custom:abc", "action:escoteiro:gone:fixed:9", "especialidade:nope", "junk"])],
      known,
    );
    expect(demand.items).toEqual([]);
    expect(demand.scoutsWithPlan).toBe(0);
  });
});
