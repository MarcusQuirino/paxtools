/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import {
  buildSuggestionPrompt,
  assertNoPII,
  suggestionSchema,
} from "./aiPrompt";
import type { RamoCoverage } from "./coverage";

function eixo(id: string, name: string) {
  return {
    eixoId: id,
    eixoName: name,
    fixedCount: 5,
    fixedAvgCompletion: 0.2,
    variableCount: 4,
    variableAvgCompletion: 0.1,
    coveragePct: 0.15,
  };
}
function activity(eixoId: string, eixoName: string, text: string, count: number) {
  return {
    actionId: `escoteiro:b1:variable:0`,
    blocoId: "b1",
    eixoId,
    eixoName,
    type: "variable" as const,
    text,
    completedCount: count,
  };
}

const coverage: RamoCoverage = {
  ramo: "escoteiro",
  scoutCount: 12,
  stageDistribution: { pista: 4, trilha: 8 },
  eixos: [
    eixo("life", "Habilidades para a Vida"),
    eixo("env", "Meio Ambiente"),
    eixo("peace", "Paz e Desenvolvimento"),
    eixo("health", "Saúde e Bem-estar"),
  ],
  activities: [],
  topGapsFixed: [activity("life", "Habilidades para a Vida", "Aprender primeiros socorros", 0)],
  neglectedVariable: [activity("env", "Meio Ambiente", "Plantar uma árvore nativa", 1)],
  mostDone: [],
};

describe("buildSuggestionPrompt", () => {
  test("includes every eixo name and a grounding activity text + count", () => {
    const { system, prompt, eixoIds } = buildSuggestionPrompt(coverage);
    expect(eixoIds).toEqual(["life", "env", "peace", "health"]);
    for (const e of coverage.eixos) {
      expect(prompt).toContain(e.eixoName);
    }
    expect(prompt).toContain("Aprender primeiros socorros");
    expect(prompt).toContain("Plantar uma árvore nativa");
    // counts surfaced so the model grounds on under-covered work
    expect(prompt).toMatch(/conclu[ií]/i);
    // exactly one idea slot per eixo is requested (4 eixos)
    expect(system).toContain("exatamente uma");
    expect(system.toLowerCase()).toContain("json");
  });

  test("asserts no scout names leak into the prompt", () => {
    const { system, prompt } = buildSuggestionPrompt(coverage);
    // RamoCoverage carries no name fields by type, so the prompt is PII-free by construction.
    expect(() => assertNoPII(system + "\n" + prompt, ["Ana Souza", "João Lima"])).not.toThrow();
  });

  test("assertNoPII throws when a name is present", () => {
    expect(() => assertNoPII("ideia para Ana Souza", ["Ana Souza"])).toThrow();
  });

  test("suggestionSchema parses a well-formed result", () => {
    const parsed = suggestionSchema.safeParse({
      perEixoIdeas: [
        { eixoId: "life", eixoName: "Habilidades para a Vida", idea: "Gincana de primeiros socorros", groundedOn: ["Aprender primeiros socorros"] },
      ],
      overview: "Pesado em X, leve em Y.",
    });
    expect(parsed.success).toBe(true);
  });
});
