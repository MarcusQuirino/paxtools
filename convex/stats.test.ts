/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";
import { OLDER_SPECIALTIES } from "../src/data/specialty-data/older";
import { getEixosForRamo } from "../src/data/progression-data";
import { getEarnedSpecialtyBlocoIds } from "../src/lib/completion-logic";
import { as, newTest, type TestConvex } from "./fixtures.testkit";

const A_FIX0 = "escoteiro:aprendizagem-continua:fixed:0";

async function seed(t: TestConvex) {
  const adminId: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Admin", role: "escotista", escotistaRamos: ["senior"],
      onboardingComplete: true,
    }),
  );
  const groupId: Id<"groups"> = await t.run((ctx) =>
    ctx.db.insert("groups", {
      name: "G", number: "1", password: "AAAAAA",
      createdBy: adminId, createdAt: 1, ramoNames: {},
    }),
  );
  await t.run((ctx) =>
    ctx.db.patch(adminId, { groupId, isAdmin: true, membershipStatus: "approved" }),
  );
  // Non-admin escotista scoped to "escoteiro" only.
  const escotistaId: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Esc", role: "escotista", escotistaRamos: ["escoteiro"],
      groupId, membershipStatus: "approved", onboardingComplete: true,
    }),
  );
  const scout: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "S", role: "escoteiro", ramo: "escoteiro", groupId,
      membershipStatus: "approved",
    }),
  );
  await t.run((ctx) =>
    ctx.db.insert("actionCompletions", {
      userId: scout, actionId: A_FIX0, completedAt: 1, status: "approved",
    }),
  );
  return { adminId, escotistaId, groupId, scout };
}

describe("getRamoCoverage authz (Task 3)", () => {
  test("non-admin escotista reads their own ramo", async () => {
    const t = newTest();
    const { escotistaId } = await seed(t);
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("non-admin escotista is rejected for a ramo not in escotistaRamos", async () => {
    const t = newTest();
    const { escotistaId } = await seed(t);
    await expect(
      as(t, escotistaId).query(api.stats.getRamoCoverage, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });

  test("admin may read any ramo", async () => {
    const t = newTest();
    const { adminId } = await seed(t);
    const cov = await as(t, adminId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("omitted ramo defaults to the caller's first escotistaRamos", async () => {
    const t = newTest();
    const { escotistaId } = await seed(t);
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, {});
    expect(cov.ramo).toBe("escoteiro");
  });

  test("a non-escotista is rejected with the module's generic message", async () => {
    const t = newTest();
    const { scout } = await seed(t);
    await expect(
      as(t, scout).query(api.stats.getRamoCoverage, { ramo: "escoteiro" }),
    ).rejects.toThrow("Apenas escotistas podem realizar esta ação");
  });

  test("escotista only sees their own group's scouts (group isolation)", async () => {
    const t = newTest();
    // group1 has 1 escoteiro in "escoteiro" (seeded by seed())
    const { escotistaId } = await seed(t);

    // Build a second group with 2 escoteiros in "escoteiro" — same field shape as seed().
    const admin2Id: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Admin2", role: "escotista", escotistaRamos: ["escoteiro"],
        onboardingComplete: true,
      }),
    );
    const group2Id: Id<"groups"> = await t.run((ctx) =>
      ctx.db.insert("groups", {
        name: "G2", number: "2", password: "BBBBBB",
        createdBy: admin2Id, createdAt: 2, ramoNames: {},
      }),
    );
    await t.run((ctx) =>
      ctx.db.patch(admin2Id, { groupId: group2Id, membershipStatus: "approved" }),
    );
    // escotista2 — non-admin, scoped to "escoteiro", member of group2
    const escotista2Id: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Esc2", role: "escotista", escotistaRamos: ["escoteiro"],
        groupId: group2Id, membershipStatus: "approved", onboardingComplete: true,
      }),
    );
    // 2 escoteiros in group2 — mirrors seed() scout shape exactly
    for (const name of ["S2a", "S2b"]) {
      await t.run((ctx) =>
        ctx.db.insert("users", {
          name, role: "escoteiro", ramo: "escoteiro", groupId: group2Id,
          membershipStatus: "approved",
        }),
      );
    }

    // group1's escotista sees only group1's 1 scout, not group2's 2 scouts
    const cov1 = await as(t, escotistaId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov1.scoutCount).toBe(1);

    // group2's escotista sees only group2's 2 scouts (proves they ARE real + countable)
    const cov2 = await as(t, escotista2Id).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov2.scoutCount).toBe(2);
  });
});

describe("legacy grupo-creator admin scope", () => {
  // A creator that predates the isAdmin flag: createdBy points at them but the
  // flag was never set. The module resolves them as admin on every surface, so
  // stats must accept a ramo they do not accompany (previously timeline-only).
  async function seedLegacyCreator(t: TestConvex) {
    const creatorId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Legacy", role: "escotista", escotistaRamos: ["senior"],
        membershipStatus: "approved", onboardingComplete: true,
      }),
    );
    const groupId: Id<"groups"> = await t.run((ctx) =>
      ctx.db.insert("groups", {
        name: "GL", number: "7", password: "LLLLLL",
        createdBy: creatorId, createdAt: 1, ramoNames: {},
      }),
    );
    // groupId only — isAdmin deliberately stays unset.
    await t.run((ctx) => ctx.db.patch(creatorId, { groupId }));
    const scout: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "LS", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved",
      }),
    );
    return { creatorId, groupId, scout };
  }

  test("creator (isAdmin unset) may read coverage for a ramo they do not accompany", async () => {
    const t = newTest();
    const { creatorId } = await seedLegacyCreator(t);
    const cov = await as(t, creatorId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("creator (isAdmin unset) may read the scout roster for a ramo they do not accompany", async () => {
    const t = newTest();
    const { creatorId, scout } = await seedLegacyCreator(t);
    const rows = await as(t, creatorId).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!._id).toBe(scout);
  });
});

describe("getRamoScouts (Task 4)", () => {
  test("returns the ramo's scouts with stage + block count + name + joinedAt", async () => {
    const t = newTest();
    const { escotistaId, scout } = await seed(t);
    const rows = await as(t, escotistaId).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!._id).toBe(scout);
    expect(rows[0]!.name).toBe("S");
    expect(rows[0]!.stageId).toBe("pista");
    expect(rows[0]!.completedBlockCount).toBe(0);
    expect(typeof rows[0]!.joinedAt).toBe("number");
  });

  test("is rejected for a non-admin's out-of-scope ramo", async () => {
    const t = newTest();
    const { escotistaId } = await seed(t);
    await expect(
      as(t, escotistaId).query(api.stats.getRamoScouts, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });

  test("excludes banned and pending scouts from the roster", async () => {
    const t = newTest();
    const { adminId, groupId, scout } = await seed(t);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Banned", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved", bannedAt: 1,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Pending", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "pending",
      }),
    );
    const rows = await as(t, adminId).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!._id).toBe(scout);
  });

  test("sorts ascending by completedBlockCount (who is behind first)", async () => {
    const t = newTest();
    const { adminId, groupId } = await seed(t);
    // Add a second scout with NO completions (also 0 blocks).
    await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Z", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved",
      }),
    );
    const rows = await as(t, adminId).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    const counts = rows.map((r) => r.completedBlockCount);
    expect([...counts].sort((a, b) => a - b)).toEqual(counts);
  });

  test("tie-break: among tied block counts, older accounts come first (newest last)", async () => {
    const t = newTest();
    const { adminId, groupId } = await seed(t);
    // Insert "older" then "newer" scout sequentially; _creationTime increases.
    const olderId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Older", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved",
      }),
    );
    const newerId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Newer", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved",
      }),
    );
    const rows = await as(t, adminId).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    // All have 0 blocks; among ties oldest should be first (lowest joinedAt index 0),
    // newest should be last (highest joinedAt).
    const joinedAts = rows.map((r) => r.joinedAt);
    expect([...joinedAts].sort((a, b) => a - b)).toEqual(joinedAts);
    // The newer scout must not be at index 0 (brand-new member doesn't falsely lead).
    const newerRow = rows.find((r) => r._id === newerId)!;
    const olderRow = rows.find((r) => r._id === olderId)!;
    expect(olderRow.joinedAt).toBeLessThanOrEqual(newerRow.joinedAt);
    expect(rows.indexOf(olderRow)).toBeLessThan(rows.indexOf(newerRow));
  });
});

describe("seção observada scopes the stats cohort", () => {
  async function seedSections(t: TestConvex) {
    const base = await seed(t);
    const [norte, sul] = await t.run(async (ctx) => [
      await ctx.db.insert("sections", { groupId: base.groupId, name: "Norte", ramo: "escoteiro" }),
      await ctx.db.insert("sections", { groupId: base.groupId, name: "Sul", ramo: "escoteiro" }),
    ]);
    // base.scout stays unplaced; one in Norte, one in Sul.
    for (const [name, sectionId] of [["N", norte], ["Su", sul]] as const) {
      await t.run((ctx) =>
        ctx.db.insert("users", {
          name, role: "escoteiro", ramo: "escoteiro", groupId: base.groupId,
          membershipStatus: "approved", sectionId,
        }),
      );
    }
    return { ...base, norte, sul };
  }

  test("no observed seção → whole ramo", async () => {
    const t = newTest();
    const { escotistaId } = await seedSections(t);
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, { ramo: "escoteiro" });
    expect(cov.scoutCount).toBe(3);
    expect(cov.observedSectionName).toBeNull();
  });

  test("observed seção narrows coverage, roster and especialidades (unplaced kept)", async () => {
    const t = newTest();
    const { escotistaId, norte } = await seedSections(t);
    await t.run((ctx) => ctx.db.patch(escotistaId, { observedSectionId: norte }));
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, { ramo: "escoteiro" });
    expect(cov.scoutCount).toBe(2);
    expect(cov.observedSectionName).toBe("Norte");
    const rows = await as(t, escotistaId).query(api.stats.getRamoScouts, { ramo: "escoteiro" });
    expect(rows.map((r) => r.name).sort((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual(["N", "S"]);
    const esp = await as(t, escotistaId).query(api.stats.getRamoSpecialties, { ramo: "escoteiro" });
    expect(esp.scoutCount).toBe(2);
  });
});

describe("getRamoSpecialties", () => {
  const YOUNGER_ID = "administracao";
  const YOUNGER_ITEMS = YOUNGER_SPECIALTY_BY_ID.get(YOUNGER_ID)!.items.length;
  const OLDER_ID = OLDER_SPECIALTIES[0]!.id;

  async function addScout(
    t: TestConvex,
    groupId: Id<"groups">,
    name: string,
    ramo: "escoteiro" | "lobinho" | "senior",
  ): Promise<Id<"users">> {
    return t.run((ctx) =>
      ctx.db.insert("users", { name, role: "escoteiro", ramo, groupId, membershipStatus: "approved" }),
    );
  }

  async function items(
    t: TestConvex,
    userId: Id<"users">,
    specialtyId: string,
    approved: number,
    pending: number,
    completedAt = 100,
  ) {
    await t.run(async (ctx) => {
      for (let i = 0; i < approved + pending; i++) {
        await ctx.db.insert("specialtyItemCompletions", {
          userId, ramoGroup: "younger", specialtyId, itemIndex: i,
          completedAt: completedAt + i, status: i < approved ? "approved" : "pending",
        });
      }
    });
  }

  test("younger: earned / level2 / in progress / pending / scoutsWithNone", async () => {
    const t = newTest();
    const { escotistaId, groupId, scout } = await seed(t);
    const half = YOUNGER_ITEMS / 2;
    const l1 = await addScout(t, groupId, "L1", "escoteiro");
    const l2 = await addScout(t, groupId, "L2", "escoteiro");
    const wip = await addScout(t, groupId, "Wip", "escoteiro");
    // Lobinho-era record carries over but a lobinho scout is not in the cohort.
    const lob = await addScout(t, groupId, "Lob", "lobinho");
    await items(t, l1, YOUNGER_ID, half, 0);
    await items(t, l2, YOUNGER_ID, YOUNGER_ITEMS, 0);
    await items(t, wip, YOUNGER_ID, 1, 2, 50);
    await items(t, lob, YOUNGER_ID, YOUNGER_ITEMS, 0);

    const esp = await as(t, escotistaId).query(api.stats.getRamoSpecialties, { ramo: "escoteiro" });
    expect(esp.ramoGroup).toBe("younger");
    expect(esp.scoutCount).toBe(4);
    expect(esp.totals).toEqual({
      earned: 2, level2: 1, inProgress: 1, pending: 2, distinctEarned: 1, scoutsWithNone: 1,
    });
    expect(esp.topEarned).toEqual([
      { specialtyId: YOUNGER_ID, eixoId: expect.any(String), earnedCount: 2, inProgressCount: 1 },
    ]);
    expect(esp.pending).toEqual([
      { specialtyId: YOUNGER_ID, escoteiroId: wip, escoteiroName: "Wip", count: 2, oldestAt: 51 },
    ]);
    expect(scout).toBeDefined();
  });

  test("younger: earned especialidade lists the bloco it completes", async () => {
    const t = newTest();
    const { escotistaId, groupId } = await seed(t);
    const s = await addScout(t, groupId, "B", "escoteiro");
    await items(t, s, YOUNGER_ID, YOUNGER_ITEMS / 2, 0);
    const expected = getEarnedSpecialtyBlocoIds(getEixosForRamo("escoteiro"), new Set([YOUNGER_ID]));
    expect(expected.size).toBeGreaterThan(0);
    const esp = await as(t, escotistaId).query(api.stats.getRamoSpecialties, { ramo: "escoteiro" });
    expect(esp.blocosViaEspecialidade.map((b) => b.blocoId).sort((a, b) => a.localeCompare(b))).toEqual([...expected].sort((a, b) => a.localeCompare(b)));
    expect(esp.blocosViaEspecialidade.every((b) => b.scoutCount === 1 && b.blocoName)).toBe(true);
  });

  test("older: binary — 2/3 approved is in progress, 3/3 is earned", async () => {
    const t = newTest();
    const { adminId, groupId } = await seed(t);
    const done = await addScout(t, groupId, "Done", "senior");
    const half = await addScout(t, groupId, "Half", "senior");
    await t.run(async (ctx) => {
      for (const step of ["conhecer", "fazer", "compartilhar"] as const) {
        await ctx.db.insert("specialtyProjectReports", {
          userId: done, ramoGroup: "older", specialtyId: OLDER_ID, step, text: "x",
          completedAt: 1, status: "approved",
        });
      }
      await ctx.db.insert("specialtyProjectReports", {
        userId: half, ramoGroup: "older", specialtyId: OLDER_ID, step: "conhecer", text: "x",
        completedAt: 1, status: "approved",
      });
      await ctx.db.insert("specialtyProjectReports", {
        userId: half, ramoGroup: "older", specialtyId: OLDER_ID, step: "fazer", text: "x",
        completedAt: 7, status: "pending",
      });
    });
    const esp = await as(t, adminId).query(api.stats.getRamoSpecialties, { ramo: "senior" });
    expect(esp.ramoGroup).toBe("older");
    expect(esp.totals).toEqual({
      earned: 1, level2: 0, inProgress: 1, pending: 1, distinctEarned: 1, scoutsWithNone: 0,
    });
    expect(esp.pending).toEqual([
      { specialtyId: OLDER_ID, escoteiroId: half, escoteiroName: "Half", count: 1, oldestAt: 7 },
    ]);
  });

  test("demand counts only especialidade: keys of the current ramo", async () => {
    const t = newTest();
    const { escotistaId, groupId, scout } = await seed(t);
    const other = await addScout(t, groupId, "O", "escoteiro");
    await items(t, other, YOUNGER_ID, 1, 0);
    await t.run(async (ctx) => {
      for (const [userId, ramo, itemKey] of [
        [scout, "escoteiro", `especialidade:${YOUNGER_ID}`],
        [other, "escoteiro", `especialidade:${YOUNGER_ID}`],
        [scout, "lobinho", `especialidade:${YOUNGER_ID}`], // other ramo — ignored
        [scout, "escoteiro", "action:x"], // not an especialidade
        [scout, "escoteiro", "especialidade:nao-existe"], // unknown id
      ] as const) {
        await ctx.db.insert("plannedItems", { userId, ramo, itemKey, position: 0 });
      }
    });
    const esp = await as(t, escotistaId).query(api.stats.getRamoSpecialties, { ramo: "escoteiro" });
    expect(esp.demand).toEqual([
      { specialtyId: YOUNGER_ID, eixoId: expect.any(String), starredCount: 2, startedCount: 1 },
    ]);
  });

  test("non-admin is rejected outside their ramos", async () => {
    const t = newTest();
    const { escotistaId } = await seed(t);
    await expect(
      as(t, escotistaId).query(api.stats.getRamoSpecialties, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });
});
