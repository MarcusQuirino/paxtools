/**
 * The especialidade catalog as one uniform list per ramo group — what the
 * escoteiro page, the escotista tab, the ficha and the plano list and search.
 */
import { YOUNGER_SPECIALTIES } from "./younger";
import { OLDER_SPECIALTIES } from "./older";

export type RamoGroup = "younger" | "older";

/** One catalog entry, uniform across both ramo groups. */
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
