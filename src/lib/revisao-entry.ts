/**
 * Entry points to Revisão rápida (painel row + escoteiro page for escotistas,
 * home card for the escoteiro). Pure and browser-free.
 */

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

/**
 * The painel's lista de jovens order: alphabetical by name, ignoring case and
 * accents; nameless rows ("Sem nome") last. Returns a copy; stable.
 */
export function sortByName<T extends { name?: string | null }>(
  list: readonly T[],
): T[] {
  return [...list].sort((a, b) => {
    if (!a.name || !b.name) return Number(!a.name) - Number(!b.name);
    return collator.compare(a.name, b.name);
  });
}

export type RevisaoEntry =
  | { kind: "none" }
  | { kind: "em-dia" }
  | { kind: "deck"; count: number };

/**
 * What a painel row offers, from `approvals:getUncheckedActionCounts`. The
 * query only lists escoteiros the escotista may act on, so a missing count
 * means no entry point at all.
 */
export function revisaoEntry(count: number | undefined): RevisaoEntry {
  if (count === undefined) return { kind: "none" };
  if (count <= 0) return { kind: "em-dia" };
  return { kind: "deck", count };
}

/** "1 ação" / "N ações" — the count every entry point shows. */
export function acoesCount(count: number): string {
  return `${count} ${count === 1 ? "ação" : "ações"}`;
}

/** The escoteiro page button: "Revisão rápida · N ações" ("em dia" at 0). */
export function revisaoButtonLabel(count: number): string {
  if (count <= 0) return "Revisão rápida · em dia";
  return `Revisão rápida · ${acoesCount(count)}`;
}
