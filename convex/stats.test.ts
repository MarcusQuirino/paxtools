/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./approvals.ts": () => import("./approvals"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./groups.ts": () => import("./groups"),
  "./http.ts": () => import("./http"),
  "./onboarding.ts": () => import("./onboarding"),
  "./plan.ts": () => import("./plan"),
  "./progression.ts": () => import("./progression"),
  "./stats.ts": () => import("./stats"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

const A_FIX0 = "escoteiro:aprendizagem-continua:fixed:0";

async function seed(t: ReturnType<typeof convexTest>) {
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
    const t = convexTest(schema, modules);
    const { escotistaId } = await seed(t);
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("non-admin escotista is rejected for a ramo not in escotistaRamos", async () => {
    const t = convexTest(schema, modules);
    const { escotistaId } = await seed(t);
    await expect(
      as(t, escotistaId).query(api.stats.getRamoCoverage, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });

  test("admin may read any ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seed(t);
    const cov = await as(t, adminId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("omitted ramo defaults to the caller's first escotistaRamos", async () => {
    const t = convexTest(schema, modules);
    const { escotistaId } = await seed(t);
    const cov = await as(t, escotistaId).query(api.stats.getRamoCoverage, {});
    expect(cov.ramo).toBe("escoteiro");
  });

  test("a non-escotista is rejected with the module's generic message", async () => {
    const t = convexTest(schema, modules);
    const { scout } = await seed(t);
    await expect(
      as(t, scout).query(api.stats.getRamoCoverage, { ramo: "escoteiro" }),
    ).rejects.toThrow("Apenas escotistas podem realizar esta ação");
  });

  test("escotista only sees their own group's scouts (group isolation)", async () => {
    const t = convexTest(schema, modules);
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
  async function seedLegacyCreator(t: ReturnType<typeof convexTest>) {
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
    const t = convexTest(schema, modules);
    const { creatorId } = await seedLegacyCreator(t);
    const cov = await as(t, creatorId).query(api.stats.getRamoCoverage, {
      ramo: "escoteiro",
    });
    expect(cov.ramo).toBe("escoteiro");
    expect(cov.scoutCount).toBe(1);
  });

  test("creator (isAdmin unset) may read the scout roster for a ramo they do not accompany", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    const { escotistaId } = await seed(t);
    await expect(
      as(t, escotistaId).query(api.stats.getRamoScouts, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });

  test("excludes banned and pending scouts from the roster", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
