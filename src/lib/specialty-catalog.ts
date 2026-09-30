/**
 * Pure catalog + search logic for especialidades, shared by the escoteiro's
 * own Especialidades tab and the escotista catalog/ficha. No React, no Convex.
 */
import { YOUNGER_SPECIALTIES } from "@/data/specialty-data/younger";
import { OLDER_SPECIALTIES } from "@/data/specialty-data/older";

export type RamoGroup = "younger" | "older";

export function ramoGroupOf(ramo: string | null | undefined): RamoGroup {
  return ramo === "senior" || ramo === "pioneiro" ? "older" : "younger";
}

/** One catalog entry, uniform across both ramoGroups. */
export type CatalogEntry = {
  id: string;
  name: string;
  eixoId: string;
  description: string;
  /** Younger: the checklist items. Older: every etapa suggestion. */
  texts: string[];
  /** Younger only: item count (level 1 = half, level 2 = all). */
  itemCount: number | null;
};

function byName(a: CatalogEntry, b: CatalogEntry) {
  return a.name.localeCompare(b.name, "pt-BR");
}

const YOUNGER_CATALOG: CatalogEntry[] = YOUNGER_SPECIALTIES.map((s) => ({
  id: s.id,
  name: s.name,
  eixoId: s.eixoId,
  description: s.description,
  texts: s.items,
  itemCount: s.items.length,
})).sort(byName);

const OLDER_CATALOG: CatalogEntry[] = OLDER_SPECIALTIES.map((s) => ({
  id: s.id,
  name: s.name,
  eixoId: s.eixoId,
  description: s.description,
  texts: [
    ...s.conhecerSuggestions,
    ...s.fazerSuggestions,
    ...s.compartilharSuggestions,
  ],
  itemCount: null,
})).sort(byName);

export function catalogFor(group: RamoGroup): CatalogEntry[] {
  return group === "younger" ? YOUNGER_CATALOG : OLDER_CATALOG;
}

export function findCatalogEntry(
  group: RamoGroup,
  id: string,
): CatalogEntry | undefined {
  return catalogFor(group).find((e) => e.id === id);
}

/** Lowercase + strip accents, so "nos" finds "nós". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export type Match = { matched: boolean; snippet: string | null };

/**
 * Match a catalog entry against a search: name first, else the first item /
 * suggestion whose text contains the query (returned so the row can show
 * which requirement matched). An empty query matches everything.
 */
export function matchEntry(entry: CatalogEntry, query: string): Match {
  const q = normalize(query.trim());
  if (!q) return { matched: true, snippet: null };
  if (normalize(entry.name).includes(q)) return { matched: true, snippet: null };
  const hit = entry.texts.find((t) => normalize(t).includes(q));
  return hit ? { matched: true, snippet: hit } : { matched: false, snippet: null };
}

export type CatalogResult<E extends CatalogEntry = CatalogEntry> = {
  entry: E;
  /** The item/suggestion text that matched, when the name didn't. */
  snippet: string | null;
};

/**
 * Filter a catalog by free text and an optional eixo. The one filtering
 * routine behind both the escoteiro and the escotista Especialidades tabs:
 * same query semantics, same snippet, same order (the input order).
 */
export function filterCatalog<E extends CatalogEntry>(
  entries: readonly E[],
  { query = "", eixoId }: { query?: string; eixoId?: string | null },
): CatalogResult<E>[] {
  const pool = eixoId ? entries.filter((e) => e.eixoId === eixoId) : entries;
  const out: CatalogResult<E>[] = [];
  for (const entry of pool) {
    const m = matchEntry(entry, query);
    if (m.matched) out.push({ entry, snippet: m.snippet });
  }
  return out;
}

/** True when a search or a filter is active, i.e. the page should list results. */
export function isListing(query: string | undefined, filter: string | undefined) {
  return !!query?.trim() || !!filter;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
