import { describe, it, expect } from "bun:test";
import type { Action, Bloco, Eixo } from "@/data/types";
import {
  getBlocoProgress,
  getCompletedBlockIds,
  getSpecialtyLevel,
  toSpecialtySlug,
  getCurrentStage,
  getNextStage,
  getBlocksToIrr,
  allBlocksCompleted,
  isIrrComplete,
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

// ── getSpecialtyLevel ─────────────────────────────────────────

describe("getSpecialtyLevel", () => {
  it("returns 0 when no items approved", () => {
    expect(getSpecialtyLevel(0, 8)).toBe(0);
  });

  it("returns 0 when approved count is below the half threshold", () => {
    expect(getSpecialtyLevel(1, 8)).toBe(0);
    expect(getSpecialtyLevel(3, 8)).toBe(0);
  });

  it("returns 1 when approved count exactly meets the half threshold", () => {
    expect(getSpecialtyLevel(4, 8)).toBe(1);
    expect(getSpecialtyLevel(3, 6)).toBe(1);
  });

  it("returns 1 when above half but below all", () => {
    expect(getSpecialtyLevel(5, 8)).toBe(1);
    expect(getSpecialtyLevel(7, 8)).toBe(1);
  });

  it("returns 2 when all items approved", () => {
    expect(getSpecialtyLevel(8, 8)).toBe(2);
    expect(getSpecialtyLevel(6, 6)).toBe(2);
  });

  it("returns 0 when totalItems is 0", () => {
    expect(getSpecialtyLevel(0, 0)).toBe(0);
  });

  it("works for odd total: half rounds down, so ≥ ceil is level 1", () => {
    // 7 items: half = 3.5, so 4 approved → level 1 (4 >= 3.5)
    expect(getSpecialtyLevel(3, 7)).toBe(0);
    expect(getSpecialtyLevel(4, 7)).toBe(1);
    expect(getSpecialtyLevel(7, 7)).toBe(2);
  });
});

// ── getCompletedBlockIds ───────────────────────────────────────

const emptyEarnedSpecialties = new Set<string>();

describe("getCompletedBlockIds", () => {
  it("returns empty sets when nothing completed", () => {
    const eixos = [makeEixo([makeBloco()])];
    const result = getCompletedBlockIds(eixos, new Set(), emptyPending, [], emptyEarnedSpecialties);

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

    const result = getCompletedBlockIds(eixos, completed, emptyPending, [], emptyEarnedSpecialties);
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

    const result = getCompletedBlockIds(eixos, completed, emptyPending, customActions, emptyEarnedSpecialties);
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

    const result = getCompletedBlockIds(eixos, completed, emptyPending, customActions, emptyEarnedSpecialties);
    // Only 1 variable done, needs 2 -- not complete
    expect(result.approved.has("test-bloco")).toBe(false);
  });

  it("earned specialty (level ≥ 1) bypasses variable for matching bloco", () => {
    const bloco = makeBloco();
    const eixos = [makeEixo([bloco])];

    // All fixed done, 0 variable -- but specialty at level ≥ 1 covers it
    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
    ]);

    const result = getCompletedBlockIds(
      eixos,
      completed,
      emptyPending,
      [],
      new Set(["test-bloco"]),
    );
    expect(result.approved.has("test-bloco")).toBe(true);
  });

  it("specialty NOT in earnedSpecialtyBlocoIds does not satisfy variable", () => {
    const bloco = makeBloco();
    const eixos = [makeEixo([bloco])];

    const completed = new Set([
      "test-bloco:fixed:0",
      "test-bloco:fixed:1",
    ]);

    // earnedSpecialtyBlocoIds is empty — variable requirement unsatisfied
    const result = getCompletedBlockIds(
      eixos,
      completed,
      emptyPending,
      [],
      emptyEarnedSpecialties,
    );
    expect(result.approved.has("test-bloco")).toBe(false);
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

    const result = getCompletedBlockIds(eixos, completed, emptyPending, [], emptyEarnedSpecialties);
    expect(result.approved.has("complete-bloco")).toBe(true);
    expect(result.approved.has("incomplete-bloco")).toBe(false);
    expect(result.approved.size).toBe(1);
  });
});

// ── getCurrentStage ────────────────────────────────────────────

describe("getCurrentStage", () => {
  // Escoteiro — four etapas at 0/4/8/13
  it("escoteiro: Pista at 0 and 3 blocks", () => {
    expect(getCurrentStage(0, "escoteiro").id).toBe("pista");
    expect(getCurrentStage(3, "escoteiro").id).toBe("pista");
  });

  it("escoteiro: Trilha at 4 and 7 blocks", () => {
    expect(getCurrentStage(4, "escoteiro").id).toBe("trilha");
    expect(getCurrentStage(7, "escoteiro").id).toBe("trilha");
  });

  it("escoteiro: Rumo at 8 and 12 blocks", () => {
    expect(getCurrentStage(8, "escoteiro").id).toBe("rumo");
    expect(getCurrentStage(12, "escoteiro").id).toBe("rumo");
  });

  it("escoteiro: Travessia at 13, 18 and beyond", () => {
    expect(getCurrentStage(13, "escoteiro").id).toBe("travessia");
    expect(getCurrentStage(18, "escoteiro").id).toBe("travessia");
    expect(getCurrentStage(100, "escoteiro").id).toBe("travessia");
  });

  // Lobinho — same 0/4/8/13 shape, different names
  it("lobinho: maps 0/4/8/13 to Pata Tenra/Saltador/Rastreador/Caçador", () => {
    expect(getCurrentStage(0, "lobinho").id).toBe("pata-tenra");
    expect(getCurrentStage(4, "lobinho").id).toBe("saltador");
    expect(getCurrentStage(8, "lobinho").id).toBe("rastreador");
    expect(getCurrentStage(13, "lobinho").id).toBe("cacador");
  });

  // Sênior — three etapas at 0/6/12 (guards against 0/4/8/13 assumption)
  it("senior: three etapas at 0/6/12, no phantom fourth stage", () => {
    expect(getCurrentStage(0, "senior").id).toBe("escalada");
    expect(getCurrentStage(5, "senior").id).toBe("escalada");
    expect(getCurrentStage(6, "senior").id).toBe("conquista");
    expect(getCurrentStage(11, "senior").id).toBe("conquista");
    expect(getCurrentStage(12, "senior").id).toBe("azimute");
    expect(getCurrentStage(18, "senior").id).toBe("azimute");
    // A count that would be "Trilha" (4) for escoteiro is still the first etapa here.
    expect(getCurrentStage(4, "senior").id).toBe("escalada");
  });

  // Pioneiro — three etapas at 0/6/12
  it("pioneiro: three etapas at 0/6/12", () => {
    expect(getCurrentStage(0, "pioneiro").id).toBe("descoberta");
    expect(getCurrentStage(6, "pioneiro").id).toBe("destino");
    expect(getCurrentStage(12, "pioneiro").id).toBe("horizonte");
  });
});

// ── getNextStage ───────────────────────────────────────────────

describe("getNextStage", () => {
  it("escoteiro: advances Pista→Trilha→Rumo→Travessia then null", () => {
    expect(getNextStage(0, "escoteiro")?.id).toBe("trilha");
    expect(getNextStage(4, "escoteiro")?.id).toBe("rumo");
    expect(getNextStage(8, "escoteiro")?.id).toBe("travessia");
    expect(getNextStage(13, "escoteiro")).toBeNull();
    expect(getNextStage(18, "escoteiro")).toBeNull();
  });

  it("senior: next-etapa null at the last of three etapas (12+)", () => {
    expect(getNextStage(0, "senior")?.id).toBe("conquista");
    expect(getNextStage(6, "senior")?.id).toBe("azimute");
    expect(getNextStage(12, "senior")).toBeNull();
    expect(getNextStage(18, "senior")).toBeNull();
  });

  it("pioneiro: null at the last etapa", () => {
    expect(getNextStage(12, "pioneiro")).toBeNull();
  });
});

// ── getBlocksToIrr ──────────────────────────────────────────────

describe("getBlocksToIrr", () => {
  it("escoteiro: 18 → 5 → 1 → 0 across the block range", () => {
    expect(getBlocksToIrr(0, "escoteiro")).toBe(18);
    expect(getBlocksToIrr(13, "escoteiro")).toBe(5);
    expect(getBlocksToIrr(17, "escoteiro")).toBe(1);
    expect(getBlocksToIrr(18, "escoteiro")).toBe(0);
    expect(getBlocksToIrr(20, "escoteiro")).toBe(0);
  });

  it("is out of 18 for every ramo (three-etapa ramos included)", () => {
    expect(getBlocksToIrr(0, "senior")).toBe(18);
    expect(getBlocksToIrr(0, "pioneiro")).toBe(18);
    expect(getBlocksToIrr(12, "senior")).toBe(6);
  });
});

// ── allBlocksCompleted ────────────────────────────────────────

describe("allBlocksCompleted", () => {
  it("crosses at 18 regardless of ramo", () => {
    expect(allBlocksCompleted(0, "escoteiro")).toBe(false);
    expect(allBlocksCompleted(17, "escoteiro")).toBe(false);
    expect(allBlocksCompleted(18, "escoteiro")).toBe(true);
    expect(allBlocksCompleted(19, "escoteiro")).toBe(true);
    expect(allBlocksCompleted(17, "senior")).toBe(false);
    expect(allBlocksCompleted(18, "senior")).toBe(true);
  });
});

// ── isIrrComplete ──────────────────────────────────────────────

describe("isIrrComplete", () => {
  const allManualItems = new Set([
    "irr_promessa",
    "irr_jornada",
    "irr_autoavaliacao",
    "irr_corte_honra",
  ]);

  it("escoteiro: false when blocks incomplete even with all items done", () => {
    expect(isIrrComplete(17, allManualItems, "escoteiro")).toBe(false);
  });

  it("escoteiro: false when blocks complete but no checklist items done", () => {
    expect(isIrrComplete(18, new Set(), "escoteiro")).toBe(false);
  });

  it("escoteiro: false when blocks complete but only some items done", () => {
    expect(isIrrComplete(18, new Set(["irr_promessa"]), "escoteiro")).toBe(false);
  });

  it("escoteiro: true when blocks complete and all manual items done", () => {
    expect(isIrrComplete(18, allManualItems, "escoteiro")).toBe(true);
  });

  it("senior: uses the same shared irr_* manual items (18 + all manual)", () => {
    // Shared 5-slot ids across ramos, so the same manual-item set completes it.
    expect(isIrrComplete(18, new Set(), "senior")).toBe(false);
    expect(isIrrComplete(18, allManualItems, "senior")).toBe(true);
  });
});

// ── toSpecialtySlug ────────────────────────────────────────────

describe("toSpecialtySlug", () => {
  it("lowercases and trims", () => {
    expect(toSpecialtySlug("Acampamento")).toBe("acampamento");
  });

  it("replaces spaces with hyphens", () => {
    expect(toSpecialtySlug("Arte Digital")).toBe("arte-digital");
  });

  it("strips diacritics", () => {
    expect(toSpecialtySlug("Anatomia Humana")).toBe("anatomia-humana");
    expect(toSpecialtySlug("Administração")).toBe("administracao");
    expect(toSpecialtySlug("Ciências da Terra")).toBe("ciencias-da-terra");
  });

  it("strips non-alphanumeric characters (e.g. & / .)", () => {
    expect(toSpecialtySlug("A&B")).toBe("ab");
    expect(toSpecialtySlug("X/Y")).toBe("xy");
  });

  it("collapses multiple spaces into one hyphen", () => {
    expect(toSpecialtySlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("is stable — same input always gives same slug", () => {
    const name = "Prevenção ao Bullying";
    expect(toSpecialtySlug(name)).toBe(toSpecialtySlug(name));
  });
});
