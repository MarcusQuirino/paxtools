import { describe, it, expect } from "bun:test";
import type { Bloco, Eixo } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  sortForLinearView,
  isResolvedChecked,
  isResolvedComplete,
  buildCatalogIndex,
  resolvePlanItems,
  planItemState,
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

describe("planItemState", () => {
  it("open until ticked, pending until approved, then done", () => {
    expect(planItemState(actionItem("0", 0, false))).toBe("open");
    expect(planItemState(actionItem("1", 1, true, "pending"))).toBe("pending");
    expect(planItemState(actionItem("2", 2, true, "approved"))).toBe("done");
    expect(planItemState(customItem("c0", 3, false))).toBe("open");
    expect(planItemState(customItem("c1", 4, true, "pending"))).toBe("pending");
    expect(planItemState(customItem("c2", 5, true, "approved"))).toBe("done");
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
  type StandingLike = {
    kind: "younger" | "older";
    approvedCount: number;
    total: number;
    earned: boolean;
  };
  const input = (especialidades = new Map<string, StandingLike>()) => ({
    catalog,
    approvedActionIds: new Set<string>(),
    pendingActionIds: new Set<string>(),
    actionStatusMap: new Map<string, "pending" | "approved">(),
    customActions: [],
    specialtyCatalog,
    especialidades,
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

  it("takes progress and earned from the especialidade standing", () => {
    const item = resolveOne(
      "adm",
      new Map([
        ["adm", { kind: "younger" as const, approvedCount: 3, total: 6, earned: true }],
      ]),
    );
    expect(item.progress).toEqual({ approved: 3, total: 6, unit: "itens" });
    expect(item.checked).toBe(true);
    expect(isResolvedComplete(item)).toBe(true);

    const project = resolveOne(
      "proj",
      new Map([
        ["proj", { kind: "older" as const, approvedCount: 2, total: 3, earned: false }],
      ]),
    );
    expect(project.progress).toEqual({ approved: 2, total: 3, unit: "etapas" });
    expect(project.checked).toBe(false);
  });

  it("skips ids missing from the catalog or whose eixo isn't in this ramo", () => {
    expect(resolvePlanItems(planned("ghost"), input())).toEqual([]);
    expect(resolvePlanItems(planned("orphan"), input())).toEqual([]);
  });
});

describe("resolvePlanItems: ações and ações personalizadas", () => {
  const blocoWithActions: Bloco = {
    ...fakeBloco,
    fixedActions: [{ id: "escoteiro:b1:fixed:0", text: "Fixa", type: "fixed" }],
    variableActions: [
      { id: "escoteiro:b1:variable:0", text: "Variável 0", type: "variable" },
      { id: "escoteiro:b1:variable:1", text: "Variável 1", type: "variable" },
    ],
  };
  const eixo: Eixo = { ...fakeEixo, blocos: [blocoWithActions] };
  const catalog = buildCatalogIndex([eixo]);

  const row = (itemKey: string, position: number) => ({
    _id: `p${position}` as Id<"plannedItems">,
    _creationTime: 0,
    userId: "u1" as Id<"users">,
    itemKey,
    position,
  });
  const custom = (id: string, blocoId: string, completed = false) => ({
    _id: id as Id<"customActions">,
    blocoId,
    text: `custom ${id}`,
    completed,
  });
  const input = {
    catalog,
    approvedActionIds: new Set(["escoteiro:b1:fixed:0"]),
    pendingActionIds: new Set(["escoteiro:b1:variable:0"]),
    actionStatusMap: new Map<string, "pending" | "approved">([
      ["escoteiro:b1:fixed:0", "approved"],
      ["escoteiro:b1:variable:0", "pending"],
    ]),
    customActions: [custom("c1", "b1", true), custom("c2", "bloco-de-outro-ramo")],
  };

  it("resolves ações with text/type and checked/status from the approved and pending sets", () => {
    const resolved = resolvePlanItems(
      [
        row("action:escoteiro:b1:variable:1", 2),
        row("action:escoteiro:b1:fixed:0", 0),
        row("action:escoteiro:b1:variable:0", 1),
      ],
      input,
    );
    // Ordered by position, whatever order the rows arrive in.
    expect(
      resolved.map((r) =>
        r.kind === "action"
          ? [r.actionId, r.text, r.actionType, r.checked, r.status]
          : null,
      ),
    ).toEqual([
      ["escoteiro:b1:fixed:0", "Fixa", "fixed", true, "approved"],
      ["escoteiro:b1:variable:0", "Variável 0", "variable", true, "pending"],
      ["escoteiro:b1:variable:1", "Variável 1", "variable", false, undefined],
    ]);
    expect(resolved.every((r) => r.eixo === eixo)).toBe(true);
    expect(resolved.map(isResolvedComplete)).toEqual([true, false, false]);
  });

  it("resolves an ação personalizada to its bloco", () => {
    const [item] = resolvePlanItems([row("custom:c1", 0)], input);
    if (item?.kind !== "custom") throw new Error("expected a custom item");
    expect(item.bloco).toBe(blocoWithActions);
    expect(item.eixo).toBe(eixo);
    expect(item.customAction).toBe(input.customActions[0]!);
    expect(isResolvedChecked(item)).toBe(true);
    expect(isResolvedComplete(item)).toBe(true);
  });

  it("skips keys that no longer resolve: garbage, ações or blocos missing from this ramo's catalog, deleted or orphaned ações personalizadas", () => {
    expect(
      resolvePlanItems(
        [
          row("garbage", 0),
          row("action:escoteiro:b1:fixed:9", 1),
          row("action:lobinho:b1:fixed:0", 2),
          row("specialty:bloco-inexistente:Acampamento", 3),
          row("custom:deleted", 4),
          row("custom:c2", 5),
        ],
        input,
      ),
    ).toEqual([]);
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
