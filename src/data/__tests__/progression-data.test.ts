import { describe, it, expect } from "bun:test";
import { EIXOS_BY_RAMO, type Ramo } from "@/data/progression-data";
import { getRamoRules } from "@/data/progression-rules";

const RAMOS: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];

describe.each(RAMOS)("EIXOS data integrity (%s)", (ramo) => {
  const eixos = EIXOS_BY_RAMO[ramo];
  const allBlocos = eixos.flatMap((e) => e.blocos);
  const allActions = allBlocos.flatMap((b) => [
    ...b.fixedActions,
    ...b.variableActions,
  ]);

  it("total bloco count matches the ramo's IRR block threshold (18)", () => {
    expect(allBlocos).toHaveLength(getRamoRules(ramo).irr.blockThreshold);
  });

  it("all eixo IDs are unique", () => {
    const ids = eixos.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all bloco IDs are unique", () => {
    const ids = allBlocos.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every bloco eixoId matches its parent eixo", () => {
    for (const eixo of eixos) {
      for (const bloco of eixo.blocos) {
        expect(bloco.eixoId).toBe(eixo.id);
      }
    }
  });

  it("all action IDs are globally unique", () => {
    const ids = allActions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fixed action IDs follow {ramo}:{blocoId}:fixed:{index} pattern", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.fixedActions) {
        expect(action.id).toMatch(
          new RegExp(`^${ramo}:${bloco.id}:fixed:\\d+$`),
        );
      }
    }
  });

  it("variable action IDs follow {ramo}:{blocoId}:variable:{index} pattern", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.variableActions) {
        expect(action.id).toMatch(
          new RegExp(`^${ramo}:${bloco.id}:variable:\\d+$`),
        );
      }
    }
  });

  it("fixed actions have type 'fixed'", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.fixedActions) {
        expect(action.type).toBe("fixed");
      }
    }
  });

  it("variable actions have type 'variable'", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.variableActions) {
        expect(action.type).toBe("variable");
      }
    }
  });

  it("action indices are sequential starting from 0", () => {
    for (const bloco of allBlocos) {
      bloco.fixedActions.forEach((action, i) => {
        expect(action.id).toBe(`${ramo}:${bloco.id}:fixed:${i}`);
      });
      bloco.variableActions.forEach((action, i) => {
        expect(action.id).toBe(`${ramo}:${bloco.id}:variable:${i}`);
      });
    }
  });

  it("variableRequired does not exceed variableActions count", () => {
    for (const bloco of allBlocos) {
      expect(bloco.variableRequired).toBeLessThanOrEqual(
        bloco.variableActions.length,
      );
    }
  });

  it("every bloco has at least one action", () => {
    for (const bloco of allBlocos) {
      expect(
        bloco.fixedActions.length + bloco.variableActions.length,
      ).toBeGreaterThan(0);
    }
  });
});

describe("cross-ramo action ID uniqueness", () => {
  it("action IDs are globally unique across all ramos", () => {
    const allIds: string[] = [];
    for (const ramo of RAMOS) {
      for (const eixo of EIXOS_BY_RAMO[ramo]) {
        for (const bloco of eixo.blocos) {
          for (const action of [
            ...bloco.fixedActions,
            ...bloco.variableActions,
          ]) {
            allIds.push(action.id);
          }
        }
      }
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
