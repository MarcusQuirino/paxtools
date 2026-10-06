import { describe, expect, test } from "bun:test";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  computeStandings,
  earnedSpecialtyIds,
  emptyStanding,
  levelThresholds,
  ramoGroupForRamo,
  standingsById,
  type ItemRow,
  type OlderStanding,
  type ReportRow,
  type YoungerStanding,
} from "../especialidade-standing";

let nextId = 0;
function item(fields: Partial<ItemRow> & { specialtyId: string; itemIndex: number }): ItemRow {
  return {
    _id: `item${nextId++}` as Id<"specialtyItemCompletions">,
    ramoGroup: "younger",
    completedAt: 100,
    status: "approved",
    ...fields,
  };
}
function report(
  fields: Partial<ReportRow> & { specialtyId: string; step: ReportRow["step"] },
): ReportRow {
  return {
    _id: `rep${nextId++}` as Id<"specialtyProjectReports">,
    ramoGroup: "older",
    completedAt: 100,
    status: "approved",
    text: "relato",
    ...fields,
  };
}
function younger(items: ItemRow[]): Map<string, YoungerStanding> {
  return standingsById(computeStandings("younger", { items }) as YoungerStanding[]);
}
function older(reports: ReportRow[]): Map<string, OlderStanding> {
  return standingsById(computeStandings("older", { reports }) as OlderStanding[]);
}

describe("ramoGroupForRamo", () => {
  test("sênior and pioneiro are older; everything else, including unset, younger", () => {
    expect(ramoGroupForRamo("senior")).toBe("older");
    expect(ramoGroupForRamo("pioneiro")).toBe("older");
    expect(ramoGroupForRamo("lobinho")).toBe("younger");
    expect(ramoGroupForRamo("escoteiro")).toBe("younger");
    expect(ramoGroupForRamo(null)).toBe("younger");
    expect(ramoGroupForRamo(undefined)).toBe("younger");
  });
});

describe("levelThresholds", () => {
  test("level 1 at half (rounded up), level 2 at all", () => {
    expect(levelThresholds(6)).toEqual({ level1: 3, level2: 6 });
    expect(levelThresholds(7)).toEqual({ level1: 4, level2: 7 });
  });
});

describe("younger standing", () => {
  // yoga has 8 items → level 1 at 4, level 2 at 8.
  test("counts each item once: duplicate rows for one index never add up", () => {
    const st = younger([
      item({ specialtyId: "yoga", itemIndex: 0 }),
      item({ specialtyId: "yoga", itemIndex: 0 }),
      item({ specialtyId: "yoga", itemIndex: 0 }),
      item({ specialtyId: "yoga", itemIndex: 1 }),
    ]).get("yoga")!;
    expect(st.approvedCount).toBe(2);
    expect(st.level).toBe(0);
    expect(st.earned).toBe(false);
    expect(st.missingForNextLevel).toBe(2);
  });

  test("ignores indexes outside the catalog's item list", () => {
    const st = younger([
      item({ specialtyId: "yoga", itemIndex: -1 }),
      item({ specialtyId: "yoga", itemIndex: 8 }),
      item({ specialtyId: "yoga", itemIndex: 99 }),
      item({ specialtyId: "yoga", itemIndex: 3 }),
    ]).get("yoga")!;
    expect(st.approvedCount).toBe(1);
    expect(st.items).toHaveLength(8);
  });

  test("a missing status counts as approved (legacy rows)", () => {
    const st = younger([
      item({ specialtyId: "yoga", itemIndex: 0, status: undefined }),
    ]).get("yoga")!;
    expect(st.items[0]?.status).toBe("approved");
  });

  test("approved wins when an index has both an approved and a pending row", () => {
    const st = younger([
      item({ specialtyId: "yoga", itemIndex: 0, status: "approved" }),
      item({ specialtyId: "yoga", itemIndex: 0, status: "pending" }),
    ]).get("yoga")!;
    expect(st.approvedCount).toBe(1);
    expect(st.pendingCount).toBe(0);
  });

  test("level 1 at half, level 2 at all; earned from level 1", () => {
    const half = younger(
      [0, 1, 2, 3].map((i) => item({ specialtyId: "yoga", itemIndex: i })),
    ).get("yoga")!;
    expect(half.level).toBe(1);
    expect(half.earned).toBe(true);
    expect(half.missingForNextLevel).toBe(4);

    const all = younger(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => item({ specialtyId: "yoga", itemIndex: i })),
    ).get("yoga")!;
    expect(all.level).toBe(2);
    expect(all.missingForNextLevel).toBeNull();
  });

  test("pending items never count toward the level; oldest pending is reported", () => {
    const st = younger([
      item({ specialtyId: "yoga", itemIndex: 0, status: "pending", completedAt: 50 }),
      item({ specialtyId: "yoga", itemIndex: 1, status: "pending", completedAt: 20 }),
      item({ specialtyId: "yoga", itemIndex: 2, status: "pending", completedAt: 30 }),
      item({ specialtyId: "yoga", itemIndex: 3, status: "pending", completedAt: 40 }),
    ]).get("yoga")!;
    expect(st.pendingCount).toBe(4);
    expect(st.level).toBe(0);
    expect(st.oldestPendingAt).toBe(20);
  });

  test("a legacy slug lands on its canonical especialidade", () => {
    const byId = younger([item({ specialtyId: "ciencias-da-terra", itemIndex: 0 })]);
    expect(byId.has("geologia")).toBe(true);
    expect(byId.has("ciencias-da-terra")).toBe(false);
  });

  test("unknown ids and older-group rows are ignored", () => {
    const byId = younger([
      item({ specialtyId: "nao-existe", itemIndex: 0 }),
      item({ specialtyId: "yoga", itemIndex: 0, ramoGroup: "older" }),
    ]);
    expect(byId.size).toBe(0);
  });
});

describe("older standing", () => {
  test("earned only once all three etapas are approved, in any order", () => {
    const two = older([
      report({ specialtyId: "comunicacoes", step: "compartilhar" }),
      report({ specialtyId: "comunicacoes", step: "conhecer" }),
    ]).get("comunicacoes")!;
    expect(two.approvedCount).toBe(2);
    expect(two.earned).toBe(false);

    const three = older([
      report({ specialtyId: "comunicacoes", step: "compartilhar" }),
      report({ specialtyId: "comunicacoes", step: "conhecer" }),
      report({ specialtyId: "comunicacoes", step: "fazer" }),
    ]).get("comunicacoes")!;
    expect(three.earned).toBe(true);
  });

  test("only an explicit approved counts — a missing status is waiting", () => {
    const st = older([
      report({ specialtyId: "comunicacoes", step: "conhecer", status: undefined }),
      report({ specialtyId: "comunicacoes", step: "fazer" }),
      report({ specialtyId: "comunicacoes", step: "compartilhar" }),
    ]).get("comunicacoes")!;
    expect(st.etapas.conhecer?.status).toBe("pending");
    expect(st.earned).toBe(false);
  });

  test("keeps the relato text and row id per etapa", () => {
    const row = report({
      specialtyId: "comunicacoes",
      step: "fazer",
      status: "pending",
      text: "Fiz um podcast",
    });
    const st = older([row]).get("comunicacoes")!;
    expect(st.etapas.fazer).toMatchObject({
      status: "pending",
      rowId: row._id,
      text: "Fiz um podcast",
    });
    expect(st.etapas.conhecer).toBeNull();
  });

  test("a legacy slug lands on its canonical especialidade", () => {
    const byId = older([
      report({ specialtyId: "natureza-e-ciencias-ambientais", step: "conhecer" }),
    ]);
    expect(byId.has("natureza-e-ciencias-naturais")).toBe(true);
  });
});

describe("helpers", () => {
  test("earnedSpecialtyIds lists only earned standings", () => {
    const standings = computeStandings("younger", {
      items: [
        ...[0, 1, 2, 3].map((i) => item({ specialtyId: "yoga", itemIndex: i })),
        item({ specialtyId: "administracao", itemIndex: 0 }),
      ],
    });
    expect([...earnedSpecialtyIds(standings)]).toEqual(["yoga"]);
  });

  test("emptyStanding knows the catalog and starts from zero", () => {
    const st = emptyStanding("younger", "yoga") as YoungerStanding;
    expect(st.approvedCount).toBe(0);
    expect(st.total).toBe(8);
    expect(st.missingForNextLevel).toBe(4);
    expect(emptyStanding("older", "yoga")).toBeNull();
    expect(emptyStanding("older", "comunicacoes")?.total).toBe(3);
  });
});
