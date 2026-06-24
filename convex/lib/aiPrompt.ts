import { z } from "zod";
import type { RamoCoverage } from "./coverage";

/** Shape the LLM must return: one idea per eixo + a plain-language overview. */
export type SuggestionResult = {
  perEixoIdeas: {
    eixoId: string;
    eixoName: string;
    idea: string;
    groundedOn: string[];
  }[];
  overview: string;
};

export const suggestionSchema: z.ZodType<SuggestionResult> = z.object({
  perEixoIdeas: z.array(
    z.object({
      eixoId: z.string(),
      eixoName: z.string(),
      idea: z.string(),
      groundedOn: z.array(z.string()),
    }),
  ),
  overview: z.string(),
});

/**
 * Build the LLM prompt purely from coverage counts and activity TEXTS — never
 * scout names or any PII (RamoCoverage carries no name fields by type). Returns
 * the eixoIds in order so the caller can assert one idea slot per eixo.
 */
export function buildSuggestionPrompt(coverage: RamoCoverage): {
  system: string;
  prompt: string;
  eixoIds: string[];
} {
  const eixoIds = coverage.eixos.map((e) => e.eixoId);

  const system = [
    "Você é um assistente para escotistas do Escotismo brasileiro.",
    "Para CADA eixo recebido, proponha exatamente uma ideia de jogo ou dinâmica",
    "ancorada nas atividades menos trabalhadas daquele eixo. Escreva em português",
    "do Brasil, de forma curta e prática. Também escreva uma visão geral curta",
    'no formato "pesado em X, leve em Y — dê atenção a Z".',
    "Responda APENAS no formato JSON solicitado. Em groundedOn, cite os TEXTOS",
    "das atividades que embasaram a ideia. Nunca invente nomes de pessoas.",
  ].join(" ");

  const lines: string[] = [];
  lines.push(`Ramo: ${coverage.ramo}. Escoteiros ativos: ${coverage.scoutCount}.`);
  for (const e of coverage.eixos) {
    lines.push("");
    lines.push(`Eixo "${e.eixoName}" (id ${e.eixoId}) — cobertura ${(e.coveragePct * 100).toFixed(0)}%.`);
    const gaps = coverage.topGapsFixed.filter((a) => a.eixoId === e.eixoId).slice(0, 5);
    const neglected = coverage.neglectedVariable.filter((a) => a.eixoId === e.eixoId).slice(0, 5);
    if (gaps.length) {
      lines.push("  Atividades fixas pouco concluídas:");
      for (const a of gaps) lines.push(`    - "${a.text}" (concluída ${a.completedCount}x)`);
    }
    if (neglected.length) {
      lines.push("  Atividades variáveis negligenciadas:");
      for (const a of neglected) lines.push(`    - "${a.text}" (concluída ${a.completedCount}x)`);
    }
  }
  const prompt = lines.join("\n");

  return { system, prompt, eixoIds };
}

/** Defence-in-depth: throw if any caller-supplied name appears in the text. */
export function assertNoPII(text: string, names: string[]): void {
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length > 0 && text.includes(trimmed)) {
      throw new Error("Vazamento de PII detectado no prompt da IA");
    }
  }
}
