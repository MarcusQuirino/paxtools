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
    ).rejects.toThrow("ramo");
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
});
