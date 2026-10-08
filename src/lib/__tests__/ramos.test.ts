import { describe, it, expect } from "bun:test";
import { unitLabel } from "@/lib/ramos";

describe("unitLabel", () => {
  it("prefixes the ramo's unit name", () => {
    expect(unitLabel("lobinho", "Grupo X", { lobinho: "Potiguara" })).toBe("Alcateia Potiguara");
    expect(unitLabel("senior", "Grupo X", { senior: "Índio Velho" })).toBe("Tropa Índio Velho");
    expect(unitLabel("pioneiro", "Grupo X", { pioneiro: "Highlander" })).toBe("Clã Highlander");
  });

  it("falls back to the grupo name when the ramo has no unit name", () => {
    expect(unitLabel("escoteiro", "Tupã", null)).toBe("Tropa Tupã");
    expect(unitLabel("escoteiro", "Tupã", { lobinho: "Potiguara" })).toBe("Tropa Tupã");
    expect(unitLabel("escoteiro", "Tupã", { escoteiro: "   " })).toBe("Tropa Tupã");
  });

  it("trims the unit name", () => {
    expect(unitLabel("escoteiro", "Tupã", { escoteiro: "  Ipê  " })).toBe("Tropa Ipê");
  });
});
