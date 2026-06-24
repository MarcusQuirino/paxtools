/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { snapshotProgression } from "./lib/progression";

// Per-file modules map (Bun has no import.meta.glob). At least one
// "_generated/" path is required so convex-test finds the project root.
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
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};
// NOTE: do NOT list "./stats.ts" here — it does not exist until Task 3, and a
// phantom module path makes convex-test throw ERR_MODULE_NOT_FOUND (Step 2
// would fail for the wrong reason). coverage.test.ts calls the helpers via
// t.run, never via api.stats, so it needs no stats module.

describe("snapshotProgression completedBlockCount (Task 1)", () => {
  test("works under a QueryCtx (run) and reports zero blocks for a fresh escoteiro", async () => {
    const t = convexTest(schema, modules);
    const escoteiro: Id<"users"> = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "E", role: "escoteiro", ramo: "escoteiro" }),
    );
    const snap = await t.run((ctx) => snapshotProgression(ctx, escoteiro));
    expect(snap.completedBlockCount).toBe(0);
    expect(snap.stageId).toBe("pista");
  });
});

import { computeRamoCoverage, type RamoCoverage } from "./lib/coverage";

const A_FIX0 = "escoteiro:aprendizagem-continua:fixed:0";
const A_FIX1 = "escoteiro:aprendizagem-continua:fixed:1";
const A_VAR0 = "escoteiro:aprendizagem-continua:variable:0";

async function seedCoverage(t: ReturnType<typeof convexTest>) {
  const adminId: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Admin", role: "escotista", escotistaRamos: ["escoteiro"],
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
  const mk = async (over: Record<string, unknown>) =>
    t.run((ctx) =>
      ctx.db.insert("users", {
        name: "S", role: "escoteiro", ramo: "escoteiro", groupId,
        membershipStatus: "approved", ...over,
      }),
    );
  const a = await mk({ name: "A" });
  const b = await mk({ name: "B" });
  const banned = await mk({ name: "X", bannedAt: 1 });
  const senior = await mk({ name: "Y", ramo: "senior" });
  const ins = (userId: Id<"users">, actionId: string, status: "pending" | "approved") =>
    t.run((ctx) =>
      ctx.db.insert("actionCompletions", {
        userId, actionId, completedAt: 1, status,
      }),
    );
  await ins(a, A_FIX0, "approved");
  await ins(a, A_FIX1, "approved");
  await ins(a, A_VAR0, "pending");
  await ins(b, A_FIX0, "approved");
  await ins(banned, A_FIX0, "approved"); // excluded
  await ins(senior, A_FIX0, "approved"); // excluded
  return { adminId, groupId };
}

describe("computeRamoCoverage (Task 2)", () => {
  test("counts approved only, excludes banned/other-ramo, computes counts", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov: RamoCoverage = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    expect(cov.scoutCount).toBe(2); // A + B only
    const byId = new Map(cov.activities.map((x) => [x.actionId, x]));
    expect(byId.get(A_FIX0)!.completedCount).toBe(2);
    expect(byId.get(A_FIX1)!.completedCount).toBe(1);
    expect(byId.get(A_VAR0)!.completedCount).toBe(0); // pending not counted
    expect(byId.get(A_FIX0)!.type).toBe("fixed");
    expect(byId.get(A_VAR0)!.type).toBe("variable");
    expect(byId.get(A_FIX0)!.eixoId).toBe("habilidades-para-a-vida");
  });

  test("topGapsFixed ASC, neglectedVariable ASC, mostDone DESC by completedCount", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    // mostDone first entry is the highest count (A_FIX0 = 2).
    expect(cov.mostDone[0]!.completedCount).toBe(2);
    expect(cov.mostDone[0]!.actionId).toBe(A_FIX0);
    // topGapsFixed is fixed-only, ascending: first has the fewest (0).
    expect(cov.topGapsFixed[0]!.completedCount).toBe(0);
    expect(cov.topGapsFixed.every((x) => x.type === "fixed")).toBe(true);
    // neglectedVariable is variable-only, ascending.
    expect(cov.neglectedVariable.every((x) => x.type === "variable")).toBe(true);
    // non-decreasing counts in the gap lists
    const f = cov.topGapsFixed.map((x) => x.completedCount);
    expect([...f].sort((p, q) => p - q)).toEqual(f);
  });

  test("eixo coveragePct and avg completion match the pinned formulas", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    const hv = cov.eixos.find((e) => e.eixoId === "habilidades-para-a-vida")!;
    // Every percentage is in range and a clean number (not NaN).
    expect(hv.coveragePct).toBeGreaterThanOrEqual(0);
    expect(hv.coveragePct).toBeLessThanOrEqual(100);
    expect(Number.isNaN(hv.coveragePct)).toBe(false);
    expect(hv.fixedAvgCompletion).toBeGreaterThanOrEqual(0);
    expect(hv.fixedAvgCompletion).toBeLessThanOrEqual(1);
    // fixedCount/variableCount equal the catalog activity counts for the eixo.
    expect(hv.fixedCount).toBeGreaterThan(0);
  });

  test("empty ramo (no scouts) returns zeros, not NaN", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "pioneiro" }),
    );
    expect(cov.scoutCount).toBe(0);
    expect(cov.eixos.every((e) => e.coveragePct === 0)).toBe(true);
    expect(cov.eixos.every((e) => e.fixedAvgCompletion === 0)).toBe(true);
    expect(cov.mostDone.every((x) => x.completedCount === 0)).toBe(true);
  });

  test("stageDistribution sums to scoutCount and contains all stage ids", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    const sum = Object.values(cov.stageDistribution).reduce((s, n) => s + n, 0);
    expect(sum).toBe(cov.scoutCount);
    expect(cov.stageDistribution).toHaveProperty("pista");
    expect(cov.stageDistribution).toHaveProperty("trilha");
    expect(cov.stageDistribution).toHaveProperty("rumo");
    expect(cov.stageDistribution).toHaveProperty("travessia");
  });
});
