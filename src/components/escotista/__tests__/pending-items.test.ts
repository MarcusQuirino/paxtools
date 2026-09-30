import { describe, expect, test } from "bun:test";
import {
  buildPendingItems,
  hasBulk,
  planSelection,
  type PendingEntry,
} from "../pending-items";

const entry: PendingEntry = {
  escoteiro: { _id: "u1", name: "Rafael", ramo: "escoteiro" },
  pendingActions: [{ _id: "a1", actionId: "escoteiro:aprendizagem-continua:fixed:1" }],
  pendingIrrItems: [{ _id: "i1", itemId: "irr_unknown_item" }],
  pendingCustomActions: [{ _id: "c1", blocoId: "aprendizagem-continua", text: "Meu diário" }],
  pendingSpecialtyItems: [
    { _id: "s1", specialtyId: "acampamento", itemIndex: 6, ramoGroup: "younger" },
    { _id: "s2", specialtyId: "acampamento", itemIndex: 0, ramoGroup: "younger" },
  ],
  pendingSpecialtyReports: [
    { _id: "r1", specialtyId: "nao-existe", step: "fazer", text: "Relato", ramoGroup: "older" },
  ],
  totalPending: 6,
};

describe("buildPendingItems", () => {
  const items = buildPendingItems(entry);

  test("flattens every kind in queue order with unique keys", () => {
    expect(items.map((i) => i.key)).toEqual([
      "action:a1",
      "custom:c1",
      "irr:i1",
      "specItem:s1",
      "specItem:s2",
      "report:r1",
    ]);
  });

  test("ação: bloco · tipo context, real text, eixo id", () => {
    const a = items[0]!;
    expect(a.ctx).toBe("Aprendizagem Contínua e Desenvolvimento Vocacional · fixa");
    expect(a.text).toContain("Percurso de Gilwell");
    expect(a.eixoId).toBe("habilidades-para-a-vida");
  });

  test("personalizada and IRR fallbacks", () => {
    expect(items[1]!.ctx).toMatch(/· personalizada$/);
    expect(items[2]!.text).toBe("unknown item");
    expect(items[2]!.eixoId).toBeUndefined();
  });

  test("especialidade item: name + 1-based item number + item text", () => {
    const s = items[3]!;
    expect(s.ctx).toBe("Especialidade Acampamento · item 7");
    expect(s.text).toMatch(/^Explicar como cuidar do lixo/);
    expect(s.eixoId).toBe("meio-ambiente");
  });

  test("relato of an unknown specialty falls back to its id", () => {
    expect(items[5]!.ctx).toBe("Relato · nao-existe · Fazer");
  });
});

describe("planSelection", () => {
  const items = buildPendingItems(entry);

  test("empty selection → no calls", () => {
    const plan = planSelection(items, new Set());
    expect(hasBulk(plan)).toBe(false);
    expect(plan.specialtyItems).toEqual([]);
    expect(plan.reportIds).toEqual([]);
  });

  test("splits into one bulk call, grouped specialty items and relatos", () => {
    const plan = planSelection(items, new Set(items.map((i) => i.key)));
    expect(plan.bulk).toEqual({ actionIds: ["a1"], irrIds: ["i1"], customActionIds: ["c1"] });
    expect(plan.specialtyItems).toEqual([
      { escoteiroId: "u1", specialtyId: "acampamento", ramoGroup: "younger", itemIds: ["s1", "s2"] },
    ]);
    expect(plan.reportIds).toEqual(["r1"]);
  });

  test("only selected keys are planned", () => {
    const plan = planSelection(items, new Set(["specItem:s2"]));
    expect(hasBulk(plan)).toBe(false);
    expect(plan.specialtyItems[0]!.itemIds).toEqual(["s2"]);
  });
});
