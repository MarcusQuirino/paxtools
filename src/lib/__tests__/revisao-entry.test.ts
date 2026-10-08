import { describe, it, expect } from "bun:test";
import {
  acoesCount,
  revisaoButtonLabel,
  revisaoEntry,
  sortByName,
} from "@/lib/revisao-entry";

const names = (list: { name?: string | null }[]) => list.map((e) => e.name);

describe("sortByName (painel lista de jovens)", () => {
  it("orders by name, ignoring case and accents", () => {
    const list = [
      { name: "otávio" },
      { name: "Ana" },
      { name: "Álvaro" },
      { name: "bruno" },
    ];
    expect(names(sortByName(list))).toEqual([
      "Álvaro",
      "Ana",
      "bruno",
      "otávio",
    ]);
  });

  it("puts escoteiros without a name last", () => {
    const list = [{ name: null }, { name: "Zeca" }, {}, { name: "Ana" }];
    expect(names(sortByName(list))).toEqual(["Ana", "Zeca", null, undefined]);
  });
});

describe("revisaoEntry (painel row)", () => {
  it("offers the deck with its count when ações are unchecked", () => {
    expect(revisaoEntry(12)).toEqual({ kind: "deck", count: 12 });
  });

  it("reads 'em dia' when nothing is left", () => {
    expect(revisaoEntry(0)).toEqual({ kind: "em-dia" });
  });

  it("offers nothing for an escoteiro missing from the counts (can't act on)", () => {
    expect(revisaoEntry(undefined)).toEqual({ kind: "none" });
  });
});

describe("revisaoButtonLabel (escoteiro page)", () => {
  it("names the count of ações, singular for one", () => {
    expect(revisaoButtonLabel(7)).toBe("Revisão rápida · 7 ações");
    expect(revisaoButtonLabel(1)).toBe("Revisão rápida · 1 ação");
  });

  it("reads 'em dia' when nothing is left", () => {
    expect(revisaoButtonLabel(0)).toBe("Revisão rápida · em dia");
  });
});

describe("acoesCount", () => {
  it("counts ações, singular for one", () => {
    expect(acoesCount(1)).toBe("1 ação");
    expect(acoesCount(12)).toBe("12 ações");
  });
});
