import { describe, expect, test } from "bun:test";
import {
  SPECIAL_INTEREST_BADGES,
  badgeGroupsFor,
  badgeRequirementsFor,
} from "../../data/badge-data";
import { getEixosForRamo, type Ramo } from "../../data/progression-data";
import { toSpecialtySlug } from "../completion-logic";
import { computeBadgeStandings, earnedBadgeIds } from "../badge-standing";
import { deriveProgression } from "../progression-state";

const APRENDER = "insignia-do-aprender";
const total = badgeRequirementsFor(APRENDER, "escoteiro").length;
const all = (status?: string) =>
  Array.from({ length: total }, (_, i) => ({
    badgeId: APRENDER,
    requirementIndex: i,
    status,
  }));

describe("badge catalog", () => {
  test("ids are the slug of the name and unique", () => {
    const ids = SPECIAL_INTEREST_BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of SPECIAL_INTEREST_BADGES) expect(b.id).toBe(toSpecialtySlug(b.name));
  });

  test("every catalogued badge is named by some bloco, spelled the same", () => {
    const named = new Set<string>();
    for (const ramo of ["lobinho", "escoteiro", "senior", "pioneiro"] as Ramo[]) {
      for (const e of getEixosForRamo(ramo))
        for (const b of e.blocos)
          for (const alt of b.alternativeCompletions)
            if (alt.type === "insignia") alt.items.forEach((n) => named.add(n));
    }
    for (const b of SPECIAL_INTEREST_BADGES) expect(named.has(b.name)).toBe(true);
  });

  test("requirements resolve per ramo, falling back to `all`", () => {
    expect(badgeRequirementsFor(APRENDER, "lobinho")).not.toEqual(
      badgeRequirementsFor(APRENDER, "escoteiro"),
    );
    expect(badgeRequirementsFor("mensageiros-da-paz", "senior").length).toBeGreaterThan(0);
    expect(badgeRequirementsFor("nao-existe", "escoteiro")).toEqual([]);
  });
});

describe("computeBadgeStandings", () => {
  test("no levels: earned only when every requirement is approved", () => {
    const allButOne = all("approved").slice(0, -1);
    const partial = computeBadgeStandings("escoteiro", allButOne).get(APRENDER)!;
    expect(partial.approvedCount).toBe(total - 1);
    expect(partial.earned).toBe(false);

    const done = computeBadgeStandings("escoteiro", all("approved")).get(APRENDER)!;
    expect(done.earned).toBe(true);
    expect([...earnedBadgeIds(computeBadgeStandings("escoteiro", all("approved")))]).toEqual([
      APRENDER,
    ]);
  });

  test("pending requirements never earn; legacy (no status) counts as approved", () => {
    expect(computeBadgeStandings("escoteiro", all("pending")).get(APRENDER)!.earned).toBe(false);
    expect(computeBadgeStandings("escoteiro", all(undefined)).get(APRENDER)!.earned).toBe(true);
  });

  test("ignores unknown badges and out-of-range indexes", () => {
    const s = computeBadgeStandings("escoteiro", [
      { badgeId: "nao-existe", requirementIndex: 0, status: "approved" },
      { badgeId: APRENDER, requirementIndex: 999, status: "approved" },
    ]);
    expect(s.has("nao-existe")).toBe(false);
    expect(s.get(APRENDER)!.approvedCount).toBe(0);
  });
});

describe("groups that ask for only some items", () => {
  const CONE_SUL = "insignia-do-cone-sul";
  const groups = badgeGroupsFor(CONE_SUL, "senior");
  const offsets = groups.map((_, i) =>
    groups.slice(0, i).reduce((n, g) => n + g.items.length, 0),
  );
  /** Approve the first `n` items of every group, or the given picks. */
  const approve = (picks: number[][]) =>
    picks.flatMap((items, g) =>
      items.map((i) => ({
        badgeId: CONE_SUL,
        requirementIndex: offsets[g]! + i,
        status: "approved",
      })),
    );
  const linguagem = groups.findIndex((g) => g.title === "Linguagem e Comunicação");

  test("official rules are encoded: 'pelo menos duas, sendo obrigatória a primeira'", () => {
    expect(groups.every((g) => g.required === 2)).toBe(true);
    expect(groups[linguagem]!.mandatory).toEqual([0]);
  });

  test("two of each group (mandatory included) earns it, without doing all", () => {
    const s = computeBadgeStandings("senior", approve(groups.map(() => [0, 1])));
    const b = s.get(CONE_SUL)!;
    expect(b.approvedCount).toBeLessThan(b.total);
    expect(b.progress).toBe(b.needed);
    expect(b.earned).toBe(true);
  });

  test("enough items but missing the mandatory one does not earn it", () => {
    const picks = groups.map(() => [0, 1]);
    picks[linguagem] = [1, 2];
    const b = computeBadgeStandings("senior", approve(picks)).get(CONE_SUL)!;
    expect(b.groups[linguagem]!.satisfied).toBe(false);
    expect(b.earned).toBe(false);
  });

  test("pioneiro picks one of two options", () => {
    const pioneiro = badgeGroupsFor(CONE_SUL, "pioneiro");
    expect(pioneiro).toHaveLength(1);
    expect(pioneiro[0]!.required).toBe(1);
    const b = computeBadgeStandings("pioneiro", [
      { badgeId: CONE_SUL, requirementIndex: 1, status: "approved" },
    ]).get(CONE_SUL)!;
    expect(b.earned).toBe(true);
  });
});

describe("an earned insígnia in the progression", () => {
  test("satisfies the variable section of the bloco that names it", () => {
    const rows = (badgeRequirements: ReturnType<typeof all>) =>
      deriveProgression({
        ramo: "escoteiro",
        actions: [],
        customActions: [],
        irrItems: [],
        earnedSpecialtyIds: [],
        badgeRequirements,
      });
    const blocoId = "aprendizagem-continua"; // names "Insígnia do Aprender"
    expect(rows(all("pending")).blocos.get(blocoId)!.earnedViaSpecialty).toBe(false);
    const s = rows(all("approved"));
    expect(s.earnedBadgeIds.has(APRENDER)).toBe(true);
    expect(s.blocos.get(blocoId)!.earnedViaSpecialty).toBe(true);
  });
});
