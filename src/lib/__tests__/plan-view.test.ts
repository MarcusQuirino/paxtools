import { describe, it, expect } from "bun:test";
import type { Bloco, Eixo } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  sortForLinearView,
  isResolvedChecked,
  isResolvedComplete,
  buildCatalogIndex,
  resolvePlanItems,
  buildSpecialtyProgress,
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

describe("resolvePlanItems: catalog especialidades", () => {
  const catalog = buildCatalogIndex([fakeEixo]);
  const planned = (specialtyId: string) => [
    {
      _id: "p1" as Id<"plannedItems">,
      _creationTime: 0,
      userId: "u1" as Id<"users">,
      itemKey: encodePlanKey({ kind: "especialidade", specialtyId }),
      position: 0,
    },
  ];
  const specialtyCatalog = [
    { id: "adm", name: "Administração", eixoId: "e1", itemCount: 6 },
    { id: "proj", name: "Projeto", eixoId: "e1", itemCount: null },
    { id: "orphan", name: "Órfã", eixoId: "nope", itemCount: 4 },
  ];
  const input = (
    earnedSpecialtyIds = new Set<string>(),
    specialtyProgress = new Map(),
  ) => ({
    catalog,
    approvedActionIds: new Set<string>(),
    pendingActionIds: new Set<string>(),
    actionStatusMap: new Map<string, "pending" | "approved">(),
    earnedSpecialtyIds,
    customActions: [],
    specialtyCatalog,
    specialtyProgress,
  });

  function resolveOne(id: string, ...rest: Parameters<typeof input>) {
    const [item] = resolvePlanItems(planned(id), input(...rest));
    if (item?.kind !== "especialidade") throw new Error("expected especialidade");
    return item;
  }

  it("resolves eixo + name and defaults progress from the catalog when unstarted", () => {
    const item = resolveOne("adm");
    expect(item.eixo).toBe(fakeEixo);
    expect(item.name).toBe("Administração");
    expect(item.progress).toEqual({ approved: 0, total: 6, unit: "itens" });
    expect(item.checked).toBe(false);
    expect(resolveOne("proj").progress).toEqual({
      approved: 0,
      total: 3,
      unit: "etapas",
    });
  });

  it("uses supplied progress and marks earned as complete", () => {
    const item = resolveOne(
      "adm",
      new Set(["adm"]),
      new Map([["adm", { approved: 3, total: 6, unit: "itens" as const }]]),
    );
    expect(item.progress.approved).toBe(3);
    expect(item.checked).toBe(true);
    expect(isResolvedComplete(item)).toBe(true);
  });

  it("skips ids missing from the catalog or whose eixo isn't in this ramo", () => {
    expect(resolvePlanItems(planned("ghost"), input())).toEqual([]);
    expect(resolvePlanItems(planned("orphan"), input())).toEqual([]);
  });
});

describe("buildSpecialtyProgress", () => {
  const cat = [
    { id: "a", itemCount: 4 },
    { id: "b", itemCount: null },
  ];

  it("younger: counts non-pending items of the younger group only", () => {
    const m = buildSpecialtyProgress(
      "younger",
      cat,
      [
        { specialtyId: "a", ramoGroup: "younger", status: "approved" },
        { specialtyId: "a", ramoGroup: "younger" },
        { specialtyId: "a", ramoGroup: "younger", status: "pending" },
        { specialtyId: "a", ramoGroup: "older", status: "approved" },
        { specialtyId: "zz", ramoGroup: "younger", status: "approved" },
      ],
      [],
    );
    expect(m.get("a")).toEqual({ approved: 2, total: 4, unit: "itens" });
    expect(m.has("zz")).toBe(false);
  });

  it("older: counts approved etapas out of 3", () => {
    const m = buildSpecialtyProgress(
      "older",
      cat,
      [],
      [
        { specialtyId: "b", ramoGroup: "older", status: "approved" },
        { specialtyId: "b", ramoGroup: "older", status: "pending" },
      ],
    );
    expect(m.get("b")).toEqual({ approved: 1, total: 3, unit: "etapas" });
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

  it("round-trips a catalog especialidade key", () => {
    const key = encodePlanKey({
      kind: "especialidade",
      specialtyId: "administracao",
    });
    expect(key).toBe("especialidade:administracao");
    expect(decodePlanKey(key)).toEqual({
      kind: "especialidade",
      specialtyId: "administracao",
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
