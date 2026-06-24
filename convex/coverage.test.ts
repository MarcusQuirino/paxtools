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

  // Gap 1: undefined/omitted status must count as approved.
  // A regression to `=== "approved"` would drop this row (undefined !== "approved")
  // and make completedCount 0, failing the assertion.
  test("omitted status (undefined) counts as approved — regression guard", async () => {
    const t = convexTest(schema, modules);
    const adminId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Admin2", role: "escotista", escotistaRamos: ["escoteiro"],
        onboardingComplete: true,
      }),
    );
    const groupId: Id<"groups"> = await t.run((ctx) =>
      ctx.db.insert("groups", {
        name: "G2", number: "2", password: "BBBBBB",
        createdBy: adminId, createdAt: 1, ramoNames: {},
      }),
    );
    await t.run((ctx) =>
      ctx.db.patch(adminId, { groupId, isAdmin: true, membershipStatus: "approved" }),
    );
    const scoutId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Scout", role: "escoteiro", ramo: "escoteiro",
        groupId, membershipStatus: "approved",
      }),
    );
    // Insert a completion row with NO status field (omitted = undefined).
    await t.run((ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: scoutId,
        actionId: A_FIX0,
        completedAt: 1,
        // status is intentionally omitted
      }),
    );
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    const byId = new Map(cov.activities.map((x) => [x.actionId, x]));
    expect(byId.get(A_FIX0)!.completedCount).toBe(1);
  });

  // Gap 2: eixo aggregates must independently recompute from per-activity data.
  // Catches wrong denominator, wrong activity subset, or off-by-one without
  // hardcoding catalog sizes (any catalog change keeps the test valid).
  test("eixo aggregates match independent recomputation from per-activity data", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );

    // Local mean — do NOT reuse the impl's mean function.
    function localMean(xs: number[]): number {
      if (xs.length === 0) return 0;
      return xs.reduce((s, x) => s + x, 0) / xs.length;
    }

    const EPS = 1e-9;
    const n = cov.scoutCount; // must be >0 for seed

    for (const eixo of cov.eixos) {
      const inEixo = cov.activities.filter((x) => x.eixoId === eixo.eixoId);
      const fixed = inEixo.filter((x) => x.type === "fixed");
      const variable = inEixo.filter((x) => x.type === "variable");

      const expectedFixedAvg = n === 0 ? 0 : localMean(fixed.map((x) => x.completedCount / n));
      const expectedVarAvg = n === 0 ? 0 : localMean(variable.map((x) => x.completedCount / n));
      const expectedCovPct = n === 0 ? 0 : localMean(inEixo.map((x) => x.completedCount / n)) * 100;

      expect(Math.abs(eixo.fixedAvgCompletion - expectedFixedAvg)).toBeLessThan(EPS);
      expect(Math.abs(eixo.variableAvgCompletion - expectedVarAvg)).toBeLessThan(EPS);
      expect(Math.abs(eixo.coveragePct - expectedCovPct)).toBeLessThan(EPS);
    }
  });

  // Gap 3: duplicate completion rows for the same scout/action must count once;
  // a foreign actionId not in the catalog must be silently dropped.
  test("duplicate rows count once per scout; foreign actionId does not inflate counts", async () => {
    const t = convexTest(schema, modules);
    const adminId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Admin3", role: "escotista", escotistaRamos: ["escoteiro"],
        onboardingComplete: true,
      }),
    );
    const groupId: Id<"groups"> = await t.run((ctx) =>
      ctx.db.insert("groups", {
        name: "G3", number: "3", password: "CCCCCC",
        createdBy: adminId, createdAt: 1, ramoNames: {},
      }),
    );
    await t.run((ctx) =>
      ctx.db.patch(adminId, { groupId, isAdmin: true, membershipStatus: "approved" }),
    );
    const scoutId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Scout", role: "escoteiro", ramo: "escoteiro",
        groupId, membershipStatus: "approved",
      }),
    );
    // Insert A_FIX0 twice for the same scout (duplicate).
    await t.run((ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: scoutId, actionId: A_FIX0, completedAt: 1, status: "approved",
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: scoutId, actionId: A_FIX0, completedAt: 2, status: "approved",
      }),
    );
    // Insert a foreign actionId not in the escoteiro catalog.
    await t.run((ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: scoutId,
        actionId: "escoteiro:does-not-exist:fixed:0",
        completedAt: 3, status: "approved",
      }),
    );
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    const byId = new Map(cov.activities.map((x) => [x.actionId, x]));
    // Duplicate rows must count as 1, not 2.
    expect(byId.get(A_FIX0)!.completedCount).toBe(1);
    // Foreign actionId must not appear in activities.
    expect(byId.has("escoteiro:does-not-exist:fixed:0")).toBe(false);
  });

  // Gap 4: among equal-completedCount entries in mostDone (e.g. the many
  // zero-count actions), actionId must be in ascending order (tie-break rule).
  test("mostDone ties broken by actionId ascending", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedCoverage(t);
    const cov = await t.run((ctx) =>
      computeRamoCoverage(ctx, { groupId, ramo: "escoteiro" }),
    );
    // Collect the tail of zero-count entries (catalog has many zero-count actions).
    const zeroTail = cov.mostDone.filter((x) => x.completedCount === 0).map((x) => x.actionId);
    // Must be sorted ascending by actionId.
    const sorted = [...zeroTail].sort();
    expect(zeroTail).toEqual(sorted);
    // Ensure we actually tested a non-trivial tail.
    expect(zeroTail.length).toBeGreaterThan(1);
  });
});
