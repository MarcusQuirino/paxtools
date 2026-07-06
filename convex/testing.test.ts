/// <reference types="bun" />
import { test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { snapshotProgression } from "./lib/progression";
import { getRamoRules } from "../src/data/progression-rules";

const TEST_EMAIL = "wipeme@test.paxtools.local";
const REAL_EMAIL = "real@gmail.com";
const RAMOS = ["lobinho", "escoteiro", "senior", "pioneiro"] as const;

// Bun's test runner has no `import.meta.glob` (Vite-only). Enumerate
// convex modules explicitly so the in-memory backend can load them.
// At least one "_generated/" path must be present so convex-test can
// locate the project root via findModulesRoot.
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

test("wipeTestData removes only @test.paxtools.local users", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = convexTest(schema, modules);

    const realId = await t.run(async (ctx) => {
      const real = await ctx.db.insert("users", {
        email: REAL_EMAIL,
        name: "Real Developer",
      });
      await ctx.db.insert("users", {
        email: TEST_EMAIL,
        name: "Test User",
      });
      return real;
    });

    await t.mutation(internal.testing.wipeTestData, {});

    const survivors = await t.run(async (ctx) => ctx.db.query("users").collect());

    // Invariant: no surviving user matches the test-email pattern.
    for (const u of survivors) {
      expect(u.email?.endsWith("@test.paxtools.local") ?? false).toBe(false);
    }

    // And the real user is still there.
    const real = survivors.find((u) => u._id === realId);
    expect(real).toBeDefined();
    expect(real?.email).toBe(REAL_EMAIL);
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});

test("seedSimulatedTroop covers all four ramos: stats, especialidades, IRR, pendings, events, logins", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = convexTest(schema, modules);
    await t.mutation(internal.testing.seedTestUsers, {});
    const res = await t.action(internal.testing.seedSimulatedTroop, {});

    const expectedScouts = {
      lobinho: 16,
      escoteiro: 15,
      senior: 13,
      pioneiro: 5,
    } as const;
    for (const ramo of RAMOS) {
      const summary = res.perRamo[ramo];
      if (!summary) throw new Error(`no summary for ${ramo}`);
      expect(summary.scouts).toBe(expectedScouts[ramo]);
      expect(summary.escotistas).toBeGreaterThanOrEqual(2);
      expect(summary.pendingRequests).toBeGreaterThanOrEqual(1);
      // Every etapa of the ramo has at least one scout.
      for (const etapa of getRamoRules(ramo).etapas) {
        expect(summary.perStage[etapa.id] ?? 0).toBeGreaterThan(0);
      }
      expect(summary.events).toBeGreaterThanOrEqual(6);
    }

    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      const simScouts = users.filter((u) =>
        u.email?.startsWith("sim-troop-"),
      );

      for (const ramo of RAMOS) {
        const scouts = simScouts.filter((u) => u.ramo === ramo);

        // ≥1 IRR holder per ramo, derived the way the app derives it.
        let irrHolders = 0;
        let pendingRows = 0;
        let planRows = 0;
        let customRows = 0;
        for (const s of scouts) {
          const snap = await snapshotProgression(ctx, s._id);
          if (snap.lisDeOuro) irrHolders++;
          const actions = await ctx.db
            .query("actionCompletions")
            .withIndex("by_userId", (q) => q.eq("userId", s._id))
            .collect();
          pendingRows += actions.filter((r) => r.status === "pending").length;
          planRows += (
            await ctx.db
              .query("plannedItems")
              .withIndex("by_userId", (q) => q.eq("userId", s._id))
              .collect()
          ).length;
          customRows += (
            await ctx.db
              .query("customActions")
              .withIndex("by_userId", (q) => q.eq("userId", s._id))
              .collect()
          ).length;
        }
        expect(irrHolders).toBeGreaterThanOrEqual(1);
        expect(pendingRows).toBeGreaterThan(0);
        expect(planRows).toBeGreaterThan(0);
        expect(customRows).toBeGreaterThan(0);

        // Pending join request for the ramo.
        expect(
          users.some(
            (u) =>
              u.email?.startsWith(`sim-pending-${ramo}-`) &&
              u.membershipStatus === "pending",
          ),
        ).toBe(true);

        // ≥2 approved escotistas accompany the ramo (sim + CATALOG).
        const escotistas = users.filter(
          (u) =>
            u.role === "escotista" &&
            u.membershipStatus === "approved" &&
            (u.escotistaRamos ?? []).includes(ramo),
        );
        expect(escotistas.length).toBeGreaterThanOrEqual(2);
      }

      // Multi-ramo history: past-ramo record exists but must not bleed.
      const clara = users.find((u) => u.name === "Clara Estevão");
      expect(clara?.ramo).toBe("pioneiro");
      if (!clara) throw new Error("history scout missing");
      const claraRows = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", clara._id))
        .collect();
      expect(claraRows.some((r) => r.actionId.startsWith("lobinho:"))).toBe(true);
      expect(claraRows.some((r) => r.actionId.startsWith("senior:"))).toBe(true);
      const claraSnap = await snapshotProgression(ctx, clara._id);
      expect(claraSnap.ramo).toBe("pioneiro");
      // Only pioneiro blocos count — never the ~54 past-ramo ones.
      expect(claraSnap.completedBlockCount).toBeLessThan(10);

      // Every sim persona can authenticate (test auth account exists).
      const accounts = await ctx.db.query("authAccounts").collect();
      const withAccount = new Set(accounts.map((a) => a.userId));
      for (const u of users.filter((x) => x.email?.startsWith("sim-"))) {
        expect(withAccount.has(u._id)).toBe(true);
      }

      // Events reference sim scouts per ramo.
      const events = await ctx.db.query("events").collect();
      for (const ramo of RAMOS) {
        expect(
          events.filter((e) => e.scope === "ramo" && e.subjectRamo === ramo)
            .length,
        ).toBeGreaterThanOrEqual(6);
      }
    });

    // Idempotent: reseeding replaces, never accumulates.
    const before = await t.run(async (ctx) =>
      (await ctx.db.query("users").collect()).filter((u) =>
        u.email?.startsWith("sim-"),
      ).length,
    );
    await t.action(internal.testing.seedSimulatedTroop, {});
    const after = await t.run(async (ctx) =>
      (await ctx.db.query("users").collect()).filter((u) =>
        u.email?.startsWith("sim-"),
      ).length,
    );
    expect(after).toBe(before);
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});

test("updateName rejects unauthenticated callers", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.updateName, { name: "Test Name" }),
    ).rejects.toThrow("Não autenticado");
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});
