import { describe, it, expect } from "bun:test";
import type { Bloco, Eixo } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  sortForLinearView,
  isResolvedChecked,
  isResolvedComplete,
  buildCatalogIndex,
  resolvePlanItems,
  type PlanItemResolved,
} from "@/lib/plan-view";
import { encodePlanKey, decodePlanKey } from "@/lib/plan-keys";

const fakeBloco: Bloco = {
  id: "b1",
  name: "Bloco 1",
  objective: "test",
  eixoId: "e1",
  fixedActions: [],
  variableActions: [],
  variableRequired: 1,
  alternativeCompletions: [],
};
const fakeEixo: Eixo = {
  id: "e1",
  name: "Eixo 1",
  color: "#000",
  colorLight: "#fff",
  blocos: [fakeBloco],
};

function actionItem(
  id: string,
  pos: number,
  checked: boolean,
  status?: "pending" | "approved",
): PlanItemResolved {
  return {
    itemKey: `action:b1:variable:${id}`,
    position: pos,
    kind: "action",
    eixo: fakeEixo,
    bloco: fakeBloco,
    actionId: `b1:variable:${id}`,
    text: `action ${id}`,
    actionType: "variable",
    checked,
    status,
  };
}

function customItem(
  id: string,
  pos: number,
  completed: boolean,
  status?: "pending" | "approved",
): PlanItemResolved {
  return {
    itemKey: `custom:${id}`,
    position: pos,
    kind: "custom",
    eixo: fakeEixo,
    bloco: fakeBloco,
    customAction: {
      _id: id as Id<"customActions">,
      blocoId: "b1",
      text: `custom ${id}`,
      completed,
      status,
    },
  };
}

describe("sortForLinearView", () => {
  it("preserves order when nothing is checked", () => {
    const items = [
      actionItem("0", 0, false),
      actionItem("1", 1, false),
      actionItem("2", 2, false),
    ];
    expect(sortForLinearView(items).map((i) => i.itemKey)).toEqual([
      "action:b1:variable:0",
      "action:b1:variable:1",
      "action:b1:variable:2",
    ]);
  });

  it("moves approved-completed items to the bottom", () => {
    const items = [
      actionItem("0", 0, true, "approved"),
      actionItem("1", 1, false),
      actionItem("2", 2, false),
    ];
    expect(sortForLinearView(items).map((i) => i.itemKey)).toEqual([
      "action:b1:variable:1",
      "action:b1:variable:2",
      "action:b1:variable:0",
    ]);
  });

  it("also moves pending items to the bottom (faded but still done from user's POV)", () => {
    const items = [
      actionItem("0", 0, true, "pending"),
      actionItem("1", 1, false),
    ];
    expect(sortForLinearView(items).map((i) => i.itemKey)).toEqual([
      "action:b1:variable:1",
      "action:b1:variable:0",
    ]);
  });

  it("preserves position order within each group", () => {
    const items = [
      actionItem("0", 0, true, "approved"),
      actionItem("1", 1, false),
      actionItem("2", 2, true, "pending"),
      actionItem("3", 3, false),
    ];
    expect(sortForLinearView(items).map((i) => i.itemKey)).toEqual([
      "action:b1:variable:1",
      "action:b1:variable:3",
      "action:b1:variable:0",
      "action:b1:variable:2",
    ]);
  });

  it("handles custom items the same way", () => {
    const items = [
      customItem("c1", 0, true, "approved"),
      customItem("c2", 1, false),
      customItem("c3", 2, true, "pending"),
    ];
    expect(sortForLinearView(items).map((i) => i.itemKey)).toEqual([
      "custom:c2",
      "custom:c1",
      "custom:c3",
    ]);
  });
});

describe("isResolvedChecked vs isResolvedComplete", () => {
  it("checked = anything ticked off, complete = approved only", () => {
    const pending = actionItem("0", 0, true, "pending");
    const approved = actionItem("1", 1, true, "approved");
    const untouched = actionItem("2", 2, false);

    expect(isResolvedChecked(pending)).toBe(true);
    expect(isResolvedComplete(pending)).toBe(false);

    expect(isResolvedChecked(approved)).toBe(true);
    expect(isResolvedComplete(approved)).toBe(true);

    expect(isResolvedChecked(untouched)).toBe(false);
    expect(isResolvedComplete(untouched)).toBe(false);
  });
});

describe("resolvePlanItems: especialidades (#47)", () => {
  const catalog = buildCatalogIndex([fakeEixo]);
  const planned = [
    {
      _id: "p1" as Id<"plannedItems">,
      _creationTime: 0,
      userId: "u1" as Id<"users">,
      itemKey: encodePlanKey({
        kind: "specialty",
        blocoId: "b1",
        specialtyName: "Acampamento",
      }),
      position: 0,
    },
  ];
  const input = (earnedSpecialtyIds?: Set<string>) => ({
    catalog,
    approvedActionIds: new Set<string>(),
    pendingActionIds: new Set<string>(),
    actionStatusMap: new Map<string, "pending" | "approved">(),
    earnedSpecialtyIds,
    customActions: [],
  });

  function resolveOne(earned: Set<string>) {
    const [item] = resolvePlanItems(planned, input(earned));
    if (item?.kind !== "specialty") throw new Error("expected a specialty item");
    return item;
  }

  it("marks an earned especialidade checked and approved", () => {
    const item = resolveOne(new Set(["acampamento"]));
    expect(item.checked).toBe(true);
    expect(item.status).toBe("approved");
    expect(isResolvedComplete(item)).toBe(true);
  });

  it("leaves an unearned especialidade unchecked with no status — nothing is 'pendente' anymore", () => {
    const item = resolveOne(new Set());
    expect(item.checked).toBe(false);
    expect(item.status).toBeUndefined();
    expect(isResolvedChecked(item)).toBe(false);
  });
});

describe("plan key codec", () => {
  it("round-trips an action key", () => {
    const key = encodePlanKey({
      kind: "action",
      actionId: "aprendizagem-continua:variable:3",
    });
    expect(decodePlanKey(key)).toEqual({
      kind: "action",
      actionId: "aprendizagem-continua:variable:3",
    });
  });

  it("round-trips a specialty key (names can contain spaces and accents)", () => {
    const key = encodePlanKey({
      kind: "specialty",
      blocoId: "consumo-responsavel",
      specialtyName: "Insígnia do Aprender",
    });
    expect(decodePlanKey(key)).toEqual({
      kind: "specialty",
      blocoId: "consumo-responsavel",
      specialtyName: "Insígnia do Aprender",
    });
  });

  it("round-trips a custom key", () => {
    const key = encodePlanKey({
      kind: "custom",
      customActionId: "abc123" as Id<"customActions">,
    });
    expect(decodePlanKey(key)).toEqual({
      kind: "custom",
      customActionId: "abc123" as Id<"customActions">,
    });
  });

  it("returns null on garbage", () => {
    expect(decodePlanKey("not-a-key")).toBeNull();
    expect(decodePlanKey("specialty:no-colon-rest")).toBeNull();
  });
});
