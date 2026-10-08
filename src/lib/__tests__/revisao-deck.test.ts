import { describe, it, expect } from "bun:test";
import type { Action, Bloco, Eixo } from "@/data/types";
import { getEixosForRamo } from "@/data/progression-data";
import { deriveProgression } from "@/lib/progression-state";
import { buildRevisaoDeck, countRevisaoDeck } from "@/lib/revisao-deck";

// ── Fixture catalog ────────────────────────────────────────────────────────
// Ação ids follow the real `<ramo>:<bloco>:<fixed|variable>:<idx>` shape.

function bloco(
  eixoId: string,
  id: string,
  fixed: number,
  variable: number,
): Bloco {
  const actions = (type: "fixed" | "variable", n: number): Action[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `t:${id}:${type}:${i}`,
      text: `${id} ${type} ${i}`,
      type,
    }));
  return {
    id,
    name: `Bloco ${id}`,
    objective: `Objetivo ${id}`,
    eixoId,
    fixedActions: actions("fixed", fixed),
    variableActions: actions("variable", variable),
    variableRequired: 1,
    alternativeCompletions: [],
  };
}

function eixo(id: string, blocos: Bloco[]): Eixo {
  return {
    id,
    name: `Eixo ${id}`,
    color: `#${id}${id}${id}`,
    colorLight: "#fff",
    blocos,
  };
}

/** Deterministic PRNG (mulberry32) so shuffles are reproducible. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Status = "pending" | "approved";

function progression(
  eixos: Eixo[],
  conclusoes: Record<string, Status> = {},
  completedBlockIds: string[] = [],
) {
  return {
    eixos,
    actionStatusMap: new Map(Object.entries(conclusoes)),
    completedBlockIds: new Set(completedBlockIds),
  };
}

const ids = (deck: { actionId: string }[]) => deck.map((c) => c.actionId);

// Eixo a: 4 ações over two blocos, b: 1, c: 2.
const uneven = [
  eixo("a", [bloco("a", "a1", 1, 1), bloco("a", "a2", 2, 0)]),
  eixo("b", [bloco("b", "b1", 1, 0)]),
  eixo("c", [bloco("c", "c1", 0, 2)]),
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe("buildRevisaoDeck", () => {
  it("holds only ações with no conclusão, neither pending nor approved", () => {
    const catalog = [eixo("a", [bloco("a", "a1", 2, 1)])];
    const deck = buildRevisaoDeck({
      progression: progression(catalog, {
        "t:a1:fixed:0": "approved",
        "t:a1:variable:0": "pending",
      }),
      planItemKeys: [],
      random: seeded(1),
    });
    expect(ids(deck)).toEqual(["t:a1:fixed:1"]);
  });

  it("rotates eixos in catalog order, one card each, until the bigger ones run alone", () => {
    const deck = buildRevisaoDeck({
      progression: progression(uneven),
      planItemKeys: [],
      random: seeded(7),
    });
    expect(deck.map((c) => c.eixo.id)).toEqual(["a", "b", "c", "a", "c", "a", "a"]);
  });

  it("shuffles ações within an eixo with the given random function", () => {
    const eixoAOrder = (seed: number) =>
      ids(
        buildRevisaoDeck({
          progression: progression(uneven),
          planItemKeys: [],
          random: seeded(seed),
        }).filter((c) => c.eixo.id === "a"),
      );

    // Same seed → same deck; every eixo-a ação appears exactly once.
    expect(eixoAOrder(3)).toEqual(eixoAOrder(3));
    expect([...eixoAOrder(3)].sort()).toEqual([
      "t:a1:fixed:0",
      "t:a1:variable:0",
      "t:a2:fixed:0",
      "t:a2:fixed:1",
    ]);
    // Different seeds give different orders.
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => eixoAOrder(s).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("puts variable ações of already-complete blocos last, still rotating eixos", () => {
    const catalog = [
      eixo("a", [bloco("a", "a1", 1, 3), bloco("a", "a2", 1, 0)]),
      eixo("b", [bloco("b", "b1", 1, 2), bloco("b", "b2", 1, 0)]),
    ];
    const deck = buildRevisaoDeck({
      progression: progression(
        catalog,
        {
          "t:a1:fixed:0": "approved",
          "t:a1:variable:0": "approved",
          "t:b1:fixed:0": "approved",
          "t:b1:variable:0": "approved",
        },
        ["a1", "b1"],
      ),
      planItemKeys: [],
      random: seeded(11),
    });

    expect(deck.map((c) => [c.eixo.id, c.blocoComplete])).toEqual([
      ["a", false],
      ["b", false],
      ["a", true],
      ["b", true],
      ["a", true],
    ]);
    expect(ids(deck.slice(0, 2))).toEqual(["t:a2:fixed:0", "t:b2:fixed:0"]);
    expect(deck.slice(2).every((c) => c.actionType === "variable")).toBe(true);
  });

  it("deals unmarked fixed ações of a bloco counted complete (e.g. via especialidade) last too", () => {
    // The deck trusts completedBlockIds: whatever is still unmarked in a
    // complete bloco no longer moves progression, fixed or variable.
    const catalog = [eixo("a", [bloco("a", "a1", 2, 1), bloco("a", "a2", 1, 0)])];
    const deck = buildRevisaoDeck({
      progression: progression(catalog, {}, ["a1"]),
      planItemKeys: [],
      random: seeded(4),
    });

    expect(ids(deck.slice(0, 1))).toEqual(["t:a2:fixed:0"]);
    expect(new Set(ids(deck.slice(1)))).toEqual(
      new Set(["t:a1:fixed:0", "t:a1:fixed:1", "t:a1:variable:0"]),
    );
    expect(deck.slice(1).every((c) => c.blocoComplete)).toBe(true);
  });

  it("deals Plano ações first, in Plano order, then the rest without repeating them", () => {
    const deck = buildRevisaoDeck({
      progression: progression(uneven),
      planItemKeys: ["action:t:c1:variable:1", "action:t:a2:fixed:1", "action:t:b1:fixed:0"],
      random: seeded(5),
    });

    expect(ids(deck.slice(0, 3))).toEqual([
      "t:c1:variable:1",
      "t:a2:fixed:1",
      "t:b1:fixed:0",
    ]);
    expect(deck.map((c) => c.inPlano)).toEqual([true, true, true, false, false, false, false]);
    // The rest: a, c, a, a (b is exhausted by the Plano).
    expect(deck.slice(3).map((c) => c.eixo.id)).toEqual(["a", "c", "a", "a"]);
    expect(new Set(ids(deck)).size).toBe(deck.length);
  });

  it("skips Plano entries that aren't eligible ações of this ramo", () => {
    const deck = buildRevisaoDeck({
      progression: progression(uneven, {
        "t:a1:fixed:0": "pending",
        "t:b1:fixed:0": "approved",
      }),
      planItemKeys: [
        "custom:abc123",
        "action:t:a1:fixed:0", // pending conclusão
        "especialidade:geologia",
        "action:t:b1:fixed:0", // approved conclusão
        "specialty:a1:Geologia",
        "action:other:x1:fixed:0", // another ramo / not in catalog
        "action:t:c1:fixed:0",
        "action:t:c1:variable:0",
        "action:t:c1:variable:0", // duplicate
      ],
      random: seeded(5),
    });

    expect(ids(deck.filter((c) => c.inPlano))).toEqual(["t:c1:variable:0"]);
    expect(deck[0]!.actionId).toBe("t:c1:variable:0");
    expect(deck).toHaveLength(5);
  });

  it("escotista mode (empty Plano) deals no Plano block, only the rotation", () => {
    const deck = buildRevisaoDeck({
      progression: progression(uneven),
      planItemKeys: [],
      random: seeded(5),
    });
    expect(deck.some((c) => c.inPlano)).toBe(false);
    expect(deck.map((c) => c.eixo.id)).toEqual(["a", "b", "c", "a", "c", "a", "a"]);
  });

  it("is empty when every ação has a conclusão", () => {
    const catalog = [eixo("a", [bloco("a", "a1", 1, 1)])];
    const p = progression(catalog, {
      "t:a1:fixed:0": "approved",
      "t:a1:variable:0": "pending",
    });
    expect(
      buildRevisaoDeck({
        progression: p,
        planItemKeys: ["action:t:a1:fixed:0"],
        random: seeded(1),
      }),
    ).toEqual([]);
    expect(countRevisaoDeck(p)).toBe(0);
  });

  it("carries what a card shows: text, fixa/variável, eixo and bloco", () => {
    const [card] = buildRevisaoDeck({
      progression: progression([eixo("a", [bloco("a", "a1", 1, 0)])]),
      planItemKeys: [],
      random: seeded(1),
    });
    expect(card).toMatchObject({
      actionId: "t:a1:fixed:0",
      text: "a1 fixed 0",
      actionType: "fixed",
      eixo: { id: "a", name: "Eixo a", color: "#aaa" },
      bloco: { id: "a1", name: "Bloco a1", objective: "Objetivo a1" },
      blocoComplete: false,
      inPlano: false,
    });
  });

  it("uses the shared bloco-complete rule (e.g. an ação personalizada completes a bloco)", () => {
    const [eixo0] = getEixosForRamo("escoteiro");
    const b = eixo0!.blocos[0]!;
    expect(b.variableActions.length).toBeGreaterThan(0);
    expect(b.variableRequired).toBeGreaterThan(0);
    const state = deriveProgression({
      ramo: "escoteiro",
      actions: b.fixedActions.map((a) => ({ actionId: a.id, status: "approved" })),
      customActions: Array.from({ length: b.variableRequired }, () => ({
        blocoId: b.id,
        completed: true,
        status: "approved",
      })),
      irrItems: [],
      earnedSpecialtyIds: [],
    });

    const deck = buildRevisaoDeck({
      progression: state,
      planItemKeys: [],
      random: seeded(2),
    });

    const tail = deck.slice(deck.length - b.variableActions.length);
    expect(new Set(ids(tail))).toEqual(new Set(b.variableActions.map((a) => a.id)));
    expect(tail.every((c) => c.blocoComplete)).toBe(true);
    expect(deck.filter((c) => c.blocoComplete)).toHaveLength(b.variableActions.length);
  });
});

describe("countRevisaoDeck", () => {
  it("matches the deck size, whatever the Plano holds", () => {
    const p = progression(uneven, { "t:a1:fixed:0": "pending" }, ["b1"]);
    const deck = buildRevisaoDeck({
      progression: p,
      planItemKeys: ["action:t:c1:fixed:0", "action:t:a2:fixed:0", "custom:x"],
      random: seeded(9),
    });
    expect(countRevisaoDeck(p)).toBe(6);
    expect(deck).toHaveLength(6);
  });
});
