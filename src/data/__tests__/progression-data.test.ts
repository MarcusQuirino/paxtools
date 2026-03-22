import { describe, it, expect } from "bun:test";
import { EIXOS } from "@/data/progression-data";
import { LIS_DE_OURO_BLOCKS } from "@/data/progression-rules";

const allBlocos = EIXOS.flatMap((e) => e.blocos);
const allActions = allBlocos.flatMap((b) => [
  ...b.fixedActions,
  ...b.variableActions,
]);

describe("EIXOS data integrity", () => {
  it("total bloco count matches LIS_DE_OURO_BLOCKS", () => {
    expect(allBlocos).toHaveLength(LIS_DE_OURO_BLOCKS);
  });

  it("all eixo IDs are unique", () => {
    const ids = EIXOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all bloco IDs are unique", () => {
    const ids = allBlocos.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every bloco eixoId matches its parent eixo", () => {
    for (const eixo of EIXOS) {
      for (const bloco of eixo.blocos) {
        expect(bloco.eixoId).toBe(eixo.id);
      }
    }
  });

  it("all action IDs are globally unique", () => {
    const ids = allActions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fixed action IDs follow {blocoId}:fixed:{index} pattern", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.fixedActions) {
        expect(action.id).toMatch(
          new RegExp(`^${bloco.id}:fixed:\\d+$`),
        );
      }
    }
  });

  it("variable action IDs follow {blocoId}:variable:{index} pattern", () => {
    for (const bloco of allBlocos) {
      for (const action of bloco.variableActions) {
        expect(action.id).toMatch(
          new RegExp(`^${bloco.id}:variable:\\d+$`),
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
        expect(action.id).toBe(`${bloco.id}:fixed:${i}`);
      });
      bloco.variableActions.forEach((action, i) => {
        expect(action.id).toBe(`${bloco.id}:variable:${i}`);
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
