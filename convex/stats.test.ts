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

  test("a non-escotista is rejected", async () => {
    const t = convexTest(schema, modules);
    const { scout } = await seed(t);
    await expect(
      as(t, scout).query(api.stats.getRamoCoverage, { ramo: "escoteiro" }),
    ).rejects.toThrow();
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
