import { describe, expect, test } from "bun:test";
import {
  catalogFor,
  filterCatalog,
  findCatalogEntry,
  isListing,
  matchEntry,
  normalize,
  plural,
  ramoGroupOf,
  type CatalogEntry,
} from "../specialty-catalog";

const mk = (over: Partial<CatalogEntry>): CatalogEntry => ({
  id: "x",
  name: "X",
  eixoId: "meio-ambiente",
  description: "",
  texts: [],
  itemCount: null,
  ...over,
});

const ACAMP = mk({
  id: "acampamento",
  name: "Acampamento",
  eixoId: "meio-ambiente",
  texts: ["Montar uma barraca", "Aplicar os nós direito e escota"],
  itemCount: 2,
});
const ORAT = mk({
  id: "oratoria",
  name: "Oratória",
  eixoId: "habilidades-para-a-vida",
  texts: ["Falar em público por 5 minutos"],
  itemCount: 1,
});
const PS = mk({
  id: "primeiros-socorros",
  name: "Primeiros Socorros",
  eixoId: "saude-e-bem-estar",
  texts: ["Demonstrar como limpar ferimentos"],
  itemCount: 1,
});

describe("normalize", () => {
  test("lowercases and strips accents", () => {
    expect(normalize("Nós Ção")).toBe("nos cao");
  });
});

describe("matchEntry", () => {
  test("empty / whitespace query matches everything without a snippet", () => {
    expect(matchEntry(ACAMP, "")).toEqual({ matched: true, snippet: null });
    expect(matchEntry(ACAMP, "   ")).toEqual({ matched: true, snippet: null });
  });
  test("name match wins and has no snippet", () => {
    expect(matchEntry(ORAT, "orat")).toEqual({ matched: true, snippet: null });
    expect(matchEntry(ORAT, "ORATORIA")).toEqual({ matched: true, snippet: null });
  });
  test("item-text match returns the matching item as snippet", () => {
    expect(matchEntry(ACAMP, "nos")).toEqual({
      matched: true,
      snippet: "Aplicar os nós direito e escota",
    });
  });
  test("no match", () => {
    expect(matchEntry(ACAMP, "piano")).toEqual({ matched: false, snippet: null });
  });
});

describe("filterCatalog", () => {
  const all = [ACAMP, ORAT, PS];
  test("no filters → everything, input order, no snippets", () => {
    expect(filterCatalog(all, {})).toEqual([
      { entry: ACAMP, snippet: null },
      { entry: ORAT, snippet: null },
      { entry: PS, snippet: null },
    ]);
  });
  test("eixo filter alone", () => {
    expect(filterCatalog(all, { eixoId: "saude-e-bem-estar" }).map((r) => r.entry.id)).toEqual([
      "primeiros-socorros",
    ]);
  });
  test("query alone matches names and item text", () => {
    const r = filterCatalog(all, { query: "ferimentos" });
    expect(r).toEqual([
      { entry: PS, snippet: "Demonstrar como limpar ferimentos" },
    ]);
  });
  test("query + eixo combine (AND)", () => {
    expect(filterCatalog(all, { query: "a", eixoId: "meio-ambiente" }).map((r) => r.entry.id)).toEqual([
      "acampamento",
    ]);
    expect(filterCatalog(all, { query: "ferimentos", eixoId: "meio-ambiente" })).toEqual([]);
  });
  test("null eixoId means no eixo filter", () => {
    expect(filterCatalog(all, { eixoId: null }).length).toBe(3);
  });
});

describe("isListing", () => {
  test("true only with a non-blank query or a filter", () => {
    expect(isListing(undefined, undefined)).toBe(false);
    expect(isListing("  ", undefined)).toBe(false);
    expect(isListing("a", undefined)).toBe(true);
    expect(isListing(undefined, "meio-ambiente")).toBe(true);
  });
});

describe("real catalog", () => {
  test("both ramo groups are non-empty and sorted by name", () => {
    for (const g of ["younger", "older"] as const) {
      const c = catalogFor(g);
      expect(c.length).toBeGreaterThan(20);
      const names = c.map((e) => e.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
    }
  });
  test("younger entries carry itemCount, older don't", () => {
    expect(catalogFor("younger").every((e) => e.itemCount != null)).toBe(true);
    expect(catalogFor("older").every((e) => e.itemCount == null)).toBe(true);
  });
  test("findCatalogEntry", () => {
    expect(findCatalogEntry("younger", "acampamento")?.name).toBe("Acampamento");
    expect(findCatalogEntry("younger", "nope")).toBeUndefined();
  });
  test("every entry belongs to one of the four eixos", () => {
    const ids = new Set([
      "habilidades-para-a-vida",
      "meio-ambiente",
      "paz-e-desenvolvimento",
      "saude-e-bem-estar",
    ]);
    for (const g of ["younger", "older"] as const)
      for (const e of catalogFor(g)) expect(ids.has(e.eixoId)).toBe(true);
  });
  test("an item-text search over the real younger catalog yields snippets", () => {
    const r = filterCatalog(catalogFor("younger"), { query: "nós" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.snippet != null)).toBe(true);
  });
});

describe("helpers", () => {
  test("ramoGroupOf", () => {
    expect(ramoGroupOf("lobinho")).toBe("younger");
    expect(ramoGroupOf("escoteiro")).toBe("younger");
    expect(ramoGroupOf("senior")).toBe("older");
    expect(ramoGroupOf("pioneiro")).toBe("older");
    expect(ramoGroupOf(null)).toBe("younger");
  });
  test("plural", () => {
    expect(plural(1, "item", "itens")).toBe("1 item");
    expect(plural(2, "item", "itens")).toBe("2 itens");
  });
});
