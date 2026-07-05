import { describe, it, expect } from "bun:test";
import { getRamoRules } from "@/data/progression-rules";
import { RAMOS } from "@/lib/ramos";

describe("getRamoRules — shared invariants (all ramos)", () => {
  for (const ramo of RAMOS) {
    describe(ramo, () => {
      const rules = getRamoRules(ramo);

      it("has at least one etapa, first requires 0 blocks", () => {
        expect(rules.etapas.length).toBeGreaterThan(0);
        expect(rules.etapas[0]!.blocksRequired).toBe(0);
      });

      it("etapas ascend by blocksRequired", () => {
        for (let i = 1; i < rules.etapas.length; i++) {
          expect(rules.etapas[i]!.blocksRequired).toBeGreaterThan(
            rules.etapas[i - 1]!.blocksRequired,
          );
        }
      });

      it("last etapa's blocksRequired + blocksToNext reaches the IRR threshold (18)", () => {
        expect(rules.irr.blockThreshold).toBe(18);
        const last = rules.etapas[rules.etapas.length - 1]!;
        expect(last.blocksRequired + last.blocksToNext).toBe(18);
      });

      it("IRR has the shared 5-slot shape with exactly one auto item (the blocos)", () => {
        expect(rules.irr.items).toHaveLength(5);
        const autos = rules.irr.items.filter((i) => i.auto);
        expect(autos).toHaveLength(1);
        expect(autos[0]!.id).toBe("lis_blocos");
      });

      it("IRR item ids are the shared lis_* slots (unchanged in Workstream A)", () => {
        expect(rules.irr.items.map((i) => i.id)).toEqual([
          "lis_promessa",
          "lis_blocos",
          "lis_jornada",
          "lis_autoavaliacao",
          "lis_corte_honra",
        ]);
      });

      it("has a non-empty IRR name and colours", () => {
        expect(rules.irr.name.length).toBeGreaterThan(0);
        expect(rules.irr.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(rules.irr.colorLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  }
});

describe("getRamoRules — per-ramo confirmed data", () => {
  it("escoteiro: four etapas at 0/4/8/13 → Lis de Ouro", () => {
    const { etapas, irr } = getRamoRules("escoteiro");
    expect(etapas.map((e) => e.name)).toEqual([
      "Pista",
      "Trilha",
      "Rumo",
      "Travessia",
    ]);
    expect(etapas.map((e) => e.blocksRequired)).toEqual([0, 4, 8, 13]);
    expect(irr.name).toBe("Lis de Ouro");
  });

  it("lobinho: four etapas at 0/4/8/13 → Cruzeiro do Sul", () => {
    const { etapas, irr } = getRamoRules("lobinho");
    expect(etapas.map((e) => e.name)).toEqual([
      "Pata Tenra",
      "Saltador",
      "Rastreador",
      "Caçador",
    ]);
    expect(etapas.map((e) => e.blocksRequired)).toEqual([0, 4, 8, 13]);
    expect(irr.name).toBe("Cruzeiro do Sul");
  });

  it("senior: exactly three etapas at 0/6/12 → Escoteiro da Pátria", () => {
    const { etapas, irr } = getRamoRules("senior");
    expect(etapas).toHaveLength(3);
    expect(etapas.map((e) => e.name)).toEqual([
      "Escalada",
      "Conquista",
      "Azimute",
    ]);
    expect(etapas.map((e) => e.blocksRequired)).toEqual([0, 6, 12]);
    expect(irr.name).toBe("Escoteiro da Pátria");
  });

  it("pioneiro: exactly three etapas at 0/6/12 → Insígnia de BP", () => {
    const { etapas, irr } = getRamoRules("pioneiro");
    expect(etapas).toHaveLength(3);
    expect(etapas.map((e) => e.name)).toEqual([
      "Descoberta",
      "Destino",
      "Horizonte",
    ]);
    expect(etapas.map((e) => e.blocksRequired)).toEqual([0, 6, 12]);
    expect(irr.name).toBe("Insígnia de BP");
  });
});

describe("getRamoRules — escoteiro regression lock", () => {
  it("reproduces the previous flat STAGES verbatim (ids/names/images/thresholds)", () => {
    expect(getRamoRules("escoteiro").etapas).toEqual([
      { id: "pista", name: "Pista", image: "/pista.png", blocksRequired: 0, blocksToNext: 4 },
      { id: "trilha", name: "Trilha", image: "/trilha.png", blocksRequired: 4, blocksToNext: 4 },
      { id: "rumo", name: "Rumo", image: "/rumo.png", blocksRequired: 8, blocksToNext: 5 },
      { id: "travessia", name: "Travessia", image: "/travessia.png", blocksRequired: 13, blocksToNext: 5 },
    ]);
  });

  it("reproduces the previous LIS_DE_OURO_* recognition verbatim", () => {
    const { irr } = getRamoRules("escoteiro");
    expect(irr.color).toBe("#2E7D32");
    expect(irr.colorLight).toBe("#E8F5E9");
    expect(irr.blockThreshold).toBe(18);
    expect(irr.items).toEqual([
      { id: "lis_promessa", text: "Realizou ou Renovou sua Promessa Escoteira", auto: false },
      { id: "lis_blocos", text: "Concluiu todos os 18 Blocos de Aprendizagem", auto: true },
      { id: "lis_jornada", text: "Vivenciou a Jornada de Travessia", auto: false },
      { id: "lis_autoavaliacao", text: "Realizou a autoavaliação", auto: false },
      {
        id: "lis_corte_honra",
        text: "Ser avaliado positivamente pela Corte de Honra e pelos Escotistas",
        auto: false,
      },
    ]);
  });
});

describe("getRamoRules — default", () => {
  it("falls back to escoteiro for null/undefined", () => {
    expect(getRamoRules(null).irr.name).toBe("Lis de Ouro");
    expect(getRamoRules(undefined).irr.name).toBe("Lis de Ouro");
  });
});
