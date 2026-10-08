/**
 * Revisão rápida deck — the ordered cards of every catalog ação an escoteiro
 * hasn't marked yet in their current ramo (no conclusão, pending or approved).
 *
 * Order:
 * 1. Plano ações, in Plano order (non-ação / ineligible entries skipped);
 * 2. the other ações of incomplete blocos, round-robin over eixos in catalog
 *    order, shuffled within each eixo by the injected `random`;
 * 3. ações of already-complete blocos (normally just variable ones), same
 *    round-robin.
 *
 * "Bloco complete" is not redefined here: it is `completedBlockIds` from the
 * progression state (completion-logic via deriveProgression), so ações
 * personalizadas and especialidades count exactly as everywhere else.
 * Pass a `useProgression()` / `deriveProgression()` result as `progression`.
 *
 * Pure and browser-free.
 */
import type { Bloco, Eixo } from "../data/types";
import { decodePlanKey } from "./plan-keys";
import type { ProgressionState } from "./progression-state";

export type RevisaoProgression = Pick<
  ProgressionState<unknown>,
  "eixos" | "actionStatusMap" | "completedBlockIds"
>;

export type RevisaoCard = {
  actionId: string;
  text: string;
  actionType: "fixed" | "variable";
  eixo: Eixo;
  bloco: Bloco;
  /** The ação's bloco is already complete ("Bloco já completo" tag). */
  blocoComplete: boolean;
  /** Dealt from the Plano block at the front of the deck. */
  inPlano: boolean;
};

export type RevisaoDeckInput = {
  progression: RevisaoProgression;
  /** Plano item keys in Plano order; `[]` in escotista mode. */
  planItemKeys: readonly string[];
  random: () => number;
};

export function buildRevisaoDeck(input: RevisaoDeckInput): RevisaoCard[] {
  const { eixos } = input.progression;
  const cards = eligible(input.progression);
  const byId = new Map(cards.map((c) => [c.actionId, c]));

  const plano: RevisaoCard[] = [];
  for (const key of input.planItemKeys) {
    const item = decodePlanKey(key);
    const card = item?.kind === "action" ? byId.get(item.actionId) : undefined;
    if (!card || card.inPlano) continue;
    card.inPlano = true;
    plano.push(card);
  }

  const rest = cards.filter((c) => !c.inPlano);
  return [
    ...plano,
    ...roundRobin(eixos, rest.filter((c) => !c.blocoComplete), input.random),
    ...roundRobin(eixos, rest.filter((c) => c.blocoComplete), input.random),
  ];
}

/** Deck size — what the entry points show. Independent of the Plano. */
export function countRevisaoDeck(progression: RevisaoProgression): number {
  return eligible(progression).length;
}

function eligible({
  eixos,
  actionStatusMap,
  completedBlockIds,
}: RevisaoProgression): RevisaoCard[] {
  const cards: RevisaoCard[] = [];
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      const blocoComplete = completedBlockIds.has(bloco.id);
      for (const a of [...bloco.fixedActions, ...bloco.variableActions]) {
        if (actionStatusMap.has(a.id)) continue;
        cards.push({
          actionId: a.id,
          text: a.text,
          actionType: a.type,
          eixo,
          bloco,
          blocoComplete,
          inPlano: false,
        });
      }
    }
  }
  return cards;
}

/** Eixos in catalog order, one card each per turn; shuffled within an eixo. */
function roundRobin(
  eixos: Eixo[],
  cards: RevisaoCard[],
  random: () => number,
): RevisaoCard[] {
  const queues = eixos.map((e) =>
    shuffle(
      cards.filter((c) => c.eixo.id === e.id),
      random,
    ),
  );
  const turns = Math.max(0, ...queues.map((q) => q.length));
  const out: RevisaoCard[] = [];
  for (let turn = 0; turn < turns; turn++) {
    for (const q of queues) {
      const card = q[turn];
      if (card) out.push(card);
    }
  }
  return out;
}

/** Fisher–Yates on a copy. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
