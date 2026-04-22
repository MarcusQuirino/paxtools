import { describe, it, expect } from "bun:test";
import type { Action, Bloco, Eixo } from "@/data/types";
import {
  getBlocoProgress,
  getCompletedBlockIds,
  getCurrentStage,
  getNextStage,
  getBlocksToLisDeOuro,
  allBlocksCompleted,
  isLisDeOuroComplete,
} from "@/lib/completion-logic";

// ── Test Fixtures ──────────────────────────────────────────────

function makeAction(id: string, type: "fixed" | "variable"): Action {
  return { id, text: `Action ${id}`, type };
}

function makeBloco(overrides: Partial<Bloco> = {}): Bloco {
  const id = overrides.id ?? "test-bloco";
  return {
    id,
    name: "Test Bloco",
    objective: "Test objective",
    eixoId: "test-eixo",
    fixedActions: [
      makeAction(`${id}:fixed:0`, "fixed"),
      makeAction(`${id}:fixed:1`, "fixed"),
    ],
    variableActions: [
      makeAction(`${id}:variable:0`, "variable"),
      makeAction(`${id}:variable:1`, "variable"),
      makeAction(`${id}:variable:2`, "variable"),
    ],
    variableRequired: 2,
    alternativeCompletions: [],
    ...overrides,
  };
}

function makeEixo(blocos: Bloco[]): Eixo {
  return {
    id: "test-eixo",
    name: "Test Eixo",
    color: "#000",
    colorLight: "#fff",
    blocos,
  };
}

const emptyPending = new Set<string>();

// ── getBlocoProgress ───────────────────────────────────────────

describe("getBlocoProgress", () => {
  const bloco = makeBloco();

  it("returns zeros when nothing is completed", () => {
    const result = getBlocoProgress(bloco, new Set(), emptyPending, 0, 0, false, false);

    expect(result.fixedDone).toBe(0);
    expect(result.fixedTotal).toBe(2);
    expect(result.variableDone).toBe(0);
    expect(result.variableRequired).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("tracks fixed action completion count", () => {
    const completed = new Set(["test-bloco:fixed:0"]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.fixedDone).toBe(1);
    expect(result.fixedTotal).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("tracks variable action completion count", () => {
    const completed = new Set([
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.variableDone).toBe(2);
  });

  it("is complete when all fixed done and variable threshold met", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.isComplete).toBe(true);
  });

  it("is NOT complete when all fixed done but variable under threshold", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.isComplete).toBe(false);
  });

  it("is NOT complete when variable met but fixed incomplete", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.isComplete).toBe(false);
  });

  it("custom actions count toward variable", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
    ]);
    // 1 variable action + 1 custom = 2, meets threshold of 2
    const result = getBlocoProgress(bloco, completed, emptyPending, 1, 0, false, false);

    expect(result.variableDone).toBe(2);
    expect(result.isComplete).toBe(true);
  });

  it("specialty alternative bypasses variable requirement", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
    ]);
    // 0 variable done, but specialty alternative = true
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, true, false);

    expect(result.variableDone).toBe(0);
    expect(result.isComplete).toBe(true);
  });

  it("specialty alternative does NOT bypass fixed requirement", () => {
    const completed = new Set(["test-bloco:fixed:0"]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, true, false);

    expect(result.isComplete).toBe(false);
  });

  it("bloco with 0 variableRequired completes with just fixed", () => {
    const noVarBloco = makeBloco({ variableRequired: 0 });
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
    ]);
    const result = getBlocoProgress(noVarBloco, completed, emptyPending, 0, 0, false, false);

    expect(result.isComplete).toBe(true);
  });

  it("bloco with no fixed actions completes with just variables", () => {
    const noFixedBloco = makeBloco({ fixedActions: [] });
    const completed = new Set([
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(noFixedBloco, completed, emptyPending, 0, 0, false, false);

    expect(result.isComplete).toBe(true);
  });

  it("ignores action IDs not belonging to this bloco", () => {
    const completed = new Set([
      "other-bloco:fixed:0",
      "other-bloco:variable:0",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.fixedDone).toBe(0);
    expect(result.variableDone).toBe(0);
  });

  it("exact threshold: variableDone equals variableRequired", () => {
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(bloco, completed, emptyPending, 0, 0, false, false);

    expect(result.variableDone).toBe(2);
    expect(result.variableRequired).toBe(2);
    expect(result.isComplete).toBe(true);
  });

  it("pending items track separately", () => {
    const approved = new Set(["test-bloco:fixed:0"]);
    const pending = new Set(["test-bloco:fixed:1"]);
    const result = getBlocoProgress(bloco, approved, pending, 0, 0, false, false);

    expect(result.fixedDone).toBe(1);
    expect(result.fixedPending).toBe(1);
    expect(result.isComplete).toBe(false);
    expect(result.isPendingComplete).toBe(false);
  });

  it("isPendingComplete when approved + pending would satisfy requirements", () => {
    const approved = new Set(["test-bloco:fixed:0"]);
    const pending = new Set([
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
      "test-bloco:variable:1",
    ]);
    const result = getBlocoProgress(bloco, approved, pending, 0, 0, false, false);

    expect(result.isComplete).toBe(false);
    expect(result.isPendingComplete).toBe(true);
  });
});

// ── getCompletedBlockIds ───────────────────────────────────────

describe("getCompletedBlockIds", () => {
  it("returns empty sets when nothing completed", () => {
    const eixos = [makeEixo([makeBloco()])];
    const result = getCompletedBlockIds(eixos, new Set(), emptyPending, [], []);

    expect(result.approved.size).toBe(0);
    expect(result.pending.size).toBe(0);
  });

  it("identifies completed blocks across multiple eixos", () => {
    const bloco1 = makeBloco({ id: "bloco-1" });
    const bloco2 = makeBloco({ id: "bloco-2", eixoId: "eixo-2" });
    const eixos = [
      makeEixo([bloco1]),
      { ...makeEixo([bloco2]), id: "eixo-2" },
    ];

    const completed = new Set([
      "bloco-1:fixed:0",
      "bloco-1:fixed:1",
      "bloco-1:variable:0",
      "bloco-1:variable:1",
      "bloco-2:fixed:0",
      "bloco-2:fixed:1",
      "bloco-2:variable:0",
      "bloco-2:variable:1",
    ]);

    const result = getCompletedBlockIds(eixos, completed, emptyPending, [], []);
    expect(result.approved.has("bloco-1")).toBe(true);
    expect(result.approved.has("bloco-2")).toBe(true);
    expect(result.approved.size).toBe(2);
  });

  it("custom actions contribute only to their bloco", () => {
    const bloco = makeBloco();
    const eixos = [makeEixo([bloco])];

    // All fixed done, 1 variable done via action + 1 via custom = 2 (meets threshold)
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
    ]);
    const customActions = [
      { blocoId: "test-bloco", completed: true },
    ];

    const result = getCompletedBlockIds(eixos, completed, emptyPending, customActions, []);
    expect(result.approved.has("test-bloco")).toBe(true);
  });

  it("ignores custom actions where completed is false", () => {
    const bloco = makeBloco();
    const eixos = [makeEixo([bloco])];

    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
      "test-bloco:variable:0",
    ]);
    // Custom action exists but not completed -- should NOT count
    const customActions = [
      { blocoId: "test-bloco", completed: false },
    ];

    const result = getCompletedBlockIds(eixos, completed, emptyPending, customActions, []);
    // Only 1 variable done, needs 2 -- not complete
    expect(result.approved.has("test-bloco")).toBe(false);
  });

  it("specialty completions bypass variable for matching bloco", () => {
    const bloco = makeBloco();
    const eixos = [makeEixo([bloco])];

    // All fixed done, 0 variable -- but specialty covers it
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
    ]);

    const result = getCompletedBlockIds(
      eixos,
      completed,
      emptyPending,
      [],
      [{ blocoId: "test-bloco", status: "approved" }],
    );
    expect(result.approved.has("test-bloco")).toBe(true);
  });

  it("does not mark incomplete blocks", () => {
    const complete = makeBloco({ id: "complete-bloco" });
    const incomplete = makeBloco({ id: "incomplete-bloco" });
    const eixos = [makeEixo([complete, incomplete])];

    const completed = new Set([
      "complete-bloco:fixed:0",
      "complete-bloco:fixed:1",
      "complete-bloco:variable:0",
      "complete-bloco:variable:1",
      // incomplete-bloco has nothing
    ]);

    const result = getCompletedBlockIds(eixos, completed, emptyPending, [], []);
    expect(result.approved.has("complete-bloco")).toBe(true);
    expect(result.approved.has("incomplete-bloco")).toBe(false);
    expect(result.approved.size).toBe(1);
  });
});

// ── getCurrentStage ────────────────────────────────────────────

describe("getCurrentStage", () => {
  it("returns Pista at 0 blocks", () => {
    expect(getCurrentStage(0).id).toBe("pista");
  });

  it("returns Pista at 3 blocks", () => {
    expect(getCurrentStage(3).id).toBe("pista");
  });

  it("returns Trilha at 4 blocks", () => {
    expect(getCurrentStage(4).id).toBe("trilha");
  });

  it("returns Trilha at 7 blocks", () => {
    expect(getCurrentStage(7).id).toBe("trilha");
  });

  it("returns Rumo at 8 blocks", () => {
    expect(getCurrentStage(8).id).toBe("rumo");
  });

  it("returns Rumo at 12 blocks", () => {
    expect(getCurrentStage(12).id).toBe("rumo");
  });

  it("returns Travessia at 13 blocks", () => {
    expect(getCurrentStage(13).id).toBe("travessia");
  });

  it("returns Travessia at 18 blocks", () => {
    expect(getCurrentStage(18).id).toBe("travessia");
  });

  it("returns Travessia at very high number", () => {
    expect(getCurrentStage(100).id).toBe("travessia");
  });
});

// ── getNextStage ───────────────────────────────────────────────

describe("getNextStage", () => {
  it("returns Trilha when at Pista", () => {
    expect(getNextStage(0)?.id).toBe("trilha");
  });

  it("returns Rumo when at Trilha", () => {
    expect(getNextStage(4)?.id).toBe("rumo");
  });

  it("returns Travessia when at Rumo", () => {
    expect(getNextStage(8)?.id).toBe("travessia");
  });

  it("returns null when at Travessia", () => {
    expect(getNextStage(13)).toBeNull();
  });

  it("returns null beyond max", () => {
    expect(getNextStage(18)).toBeNull();
  });
});

// ── getBlocksToLisDeOuro ──────────────────────────────────────

describe("getBlocksToLisDeOuro", () => {
  it("returns 18 at 0 blocks completed", () => {
    expect(getBlocksToLisDeOuro(0)).toBe(18);
  });

  it("returns 5 at 13 blocks (just entered Travessia)", () => {
    expect(getBlocksToLisDeOuro(13)).toBe(5);
  });

  it("returns 1 at 17 blocks", () => {
    expect(getBlocksToLisDeOuro(17)).toBe(1);
  });

  it("returns 0 at 18 blocks", () => {
    expect(getBlocksToLisDeOuro(18)).toBe(0);
  });

  it("returns 0 beyond 18 blocks", () => {
    expect(getBlocksToLisDeOuro(20)).toBe(0);
  });
});

// ── allBlocksCompleted ────────────────────────────────────────

describe("allBlocksCompleted", () => {
  it("returns false at 0", () => {
    expect(allBlocksCompleted(0)).toBe(false);
  });

  it("returns false at 17", () => {
    expect(allBlocksCompleted(17)).toBe(false);
  });

  it("returns true at 18", () => {
    expect(allBlocksCompleted(18)).toBe(true);
  });

  it("returns true at 19", () => {
    expect(allBlocksCompleted(19)).toBe(true);
  });
});

// ── isLisDeOuroComplete ──────────────────────────────────────

describe("isLisDeOuroComplete", () => {
  const allManualItems = new Set([
    "lis_promessa",
    "lis_jornada",
    "lis_autoavaliacao",
    "lis_corte_honra",
  ]);

  it("returns false when blocks incomplete even with all items done", () => {
    expect(isLisDeOuroComplete(17, allManualItems)).toBe(false);
  });

  it("returns false when blocks complete but no checklist items done", () => {
    expect(isLisDeOuroComplete(18, new Set())).toBe(false);
  });

  it("returns false when blocks complete but only some items done", () => {
    expect(isLisDeOuroComplete(18, new Set(["lis_promessa"]))).toBe(false);
  });

  it("returns true when blocks complete and all manual items done", () => {
    expect(isLisDeOuroComplete(18, allManualItems)).toBe(true);
  });
});
