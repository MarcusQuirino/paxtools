import { describe, expect, test } from "bun:test";
import { getEixosForRamo } from "../../data/progression-data";
import type { Bloco } from "../../data/types";
import {
  catalogActionCounts,
  deriveProgression,
  type ProgressionRows,
} from "../progression-state";

const blocos = getEixosForRamo("escoteiro").flatMap((e) => e.blocos);
const aprendizagem = blocos.find((b) => b.id === "aprendizagem-continua")!;
// Names "Administração" among its especialidade alternatives.
const autonomia = blocos.find((b) => b.id === "autonomia-lideranca")!;

/** Every ação needed to complete a bloco: all fixed + the required variables. */
function fullBloco(bloco: Bloco, status?: "pending" | "approved") {
  return [
    ...bloco.fixedActions,
    ...bloco.variableActions.slice(0, bloco.variableRequired),
  ].map((a) => ({ actionId: a.id, status }));
}

function rows(over: Partial<ProgressionRows> = {}): ProgressionRows {
  return {
    ramo: "escoteiro",
    actions: [],
    customActions: [],
    irrItems: [],
    earnedSpecialtyIds: [],
    ...over,
  };
}

describe("deriveProgression", () => {
  test("nothing done: first etapa, no blocos, 18 to the IRR", () => {
    const s = deriveProgression(rows());
    expect(s.completedBlockCount).toBe(0);
    expect(s.stageIndex).toBe(0);
    expect(s.blocksToIrr).toBe(18);
    expect(s.irrComplete).toBe(false);
    expect(s.blocos.size).toBe(18);
  });

  test("a full bloco completes it and nothing else; its bar is full", () => {
    const s = deriveProgression(rows({ actions: fullBloco(aprendizagem, "approved") }));
    expect([...s.completedBlockIds]).toEqual(["aprendizagem-continua"]);
    const view = s.blocos.get("aprendizagem-continua")!;
    expect(view.approvedPercent).toBe(100);
    expect(view.pendingPercent).toBe(0);
  });

  test("legacy rows without status count as approved; pending ones only as pending", () => {
    const legacy = deriveProgression(rows({ actions: fullBloco(aprendizagem, undefined) }));
    expect(legacy.completedBlockIds.has("aprendizagem-continua")).toBe(true);

    const pending = deriveProgression(rows({ actions: fullBloco(aprendizagem, "pending") }));
    expect(pending.completedBlockIds.size).toBe(0);
    expect(pending.pendingBlockIds.has("aprendizagem-continua")).toBe(true);
    expect(pending.blocos.get("aprendizagem-continua")!.pendingPercent).toBe(100);
  });

  test("a past ramo's ações never count toward the current ramo", () => {
    const lobinhoIds = fullBloco(aprendizagem, "approved").map((a) => ({
      ...a,
      actionId: a.actionId.replace(/^escoteiro:/, "lobinho:"),
    }));
    const s = deriveProgression(rows({ actions: lobinhoIds }));
    expect(s.completedBlockCount).toBe(0);
    expect(catalogActionCounts(s)).toEqual({ approved: 0, pending: 0 });
  });

  test("completed ações personalizadas fill their own bloco's variable section only", () => {
    const fixed = aprendizagem.fixedActions.map((a) => ({ actionId: a.id }));
    const custom = (blocoId: string, completed = true, status?: string) => ({
      blocoId,
      completed,
      status,
    });
    const s = deriveProgression(
      rows({
        actions: fixed,
        customActions: [
          ...Array.from({ length: aprendizagem.variableRequired }, () =>
            custom("aprendizagem-continua"),
          ),
          custom("autonomia-lideranca"),
          custom("aprendizagem-continua", false),
        ],
      }),
    );
    expect(s.completedBlockIds.has("aprendizagem-continua")).toBe(true);
    expect(s.completedBlockIds.has("autonomia-lideranca")).toBe(false);
    expect(s.blocos.get("aprendizagem-continua")!.variableDone).toBe(
      aprendizagem.variableRequired,
    );

    const waiting = deriveProgression(
      rows({
        actions: fixed,
        customActions: Array.from({ length: aprendizagem.variableRequired }, () =>
          custom("aprendizagem-continua", true, "pending"),
        ),
      }),
    );
    expect(waiting.pendingBlockIds.has("aprendizagem-continua")).toBe(true);
  });

  test("an earned especialidade satisfies the variable section of the bloco naming it", () => {
    const s = deriveProgression(
      rows({
        actions: autonomia.fixedActions.map((a) => ({ actionId: a.id })),
        earnedSpecialtyIds: ["administracao"],
      }),
    );
    expect(s.earnedSpecialtyBlocoIds.has("autonomia-lideranca")).toBe(true);
    expect(s.completedBlockIds.has("autonomia-lideranca")).toBe(true);
    const view = s.blocos.get("autonomia-lideranca")!;
    expect(view.earnedViaSpecialty).toBe(true);
    expect(view.approvedPercent).toBe(100);
  });

  test("the etapa advances at its block threshold", () => {
    const four = blocos.slice(0, 4).flatMap((b) => fullBloco(b));
    const s = deriveProgression(rows({ actions: four }));
    expect(s.completedBlockCount).toBe(4);
    expect(s.stageIndex).toBe(1);
    expect(s.stage.id).toBe(s.ramoRules.etapas[1]!.id);
  });

  test("catalogActionCounts counts only the current ramo's catalog", () => {
    const s = deriveProgression(
      rows({
        actions: [
          { actionId: aprendizagem.fixedActions[0]!.id },
          { actionId: aprendizagem.fixedActions[1]!.id, status: "pending" },
          { actionId: "lobinho:aprendizagem-continua:fixed:0" },
          { actionId: "escoteiro:nao-existe:fixed:0" },
        ],
      }),
    );
    expect(catalogActionCounts(s)).toEqual({ approved: 1, pending: 1 });
  });
});
