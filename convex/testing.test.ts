/// <reference types="bun" />
import { test, expect } from "bun:test";
import { Scrypt } from "lucia";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { snapshotProgression } from "./lib/progression";
import { getRamoRules } from "../src/data/progression-rules";
import { newTest } from "./fixtures.testkit";
import { widenLegacyTestRegistro } from "./lib/legacyTestRegistro";
import {
  CANONICAL_SCOUT_IDS,
  DEFAULT_TEST_PASSWORD,
  simScoutId,
  type SimKind,
  widenLegacyTestScoutId,
} from "./lib/testAccounts";
import { MANAGED_PROVIDER, normalizeScoutId } from "./lib/managedAccounts";

const RAMOS = ["lobinho", "escoteiro", "senior", "pioneiro"] as const;

/** Is `u` a sim persona of `kind` (any ramo)? */
function isSim(kind: SimKind) {
  const ids = new Set(
    RAMOS.flatMap((r) =>
      Array.from({ length: 99 }, (_, i) => simScoutId(r, kind, i + 1)),
    ),
  );
  return (u: Doc<"users">) => u.scoutId !== undefined && ids.has(u.scoutId);
}

test("wipeTestData removes only test users (99xxxxx registros + legacy emails)", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = newTest();

    const realIds = await t.run(async (ctx) => {
      const google = await ctx.db.insert("users", {
        email: "real@gmail.com",
        name: "Real Developer",
      });
      const managed = await ctx.db.insert("users", {
        scoutId: "123456",
        name: "Real Managed",
      });
      await ctx.db.insert("users", { scoutId: "9900123", name: "Test User" });
      await ctx.db.insert("users", {
        email: "wipeme@test.paxtools.local",
        name: "Legacy Test User",
      });
      return [google, managed];
    });

    await t.action(internal.testing.wipeTestData, {});

    const survivors = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(survivors.map((u) => u._id).sort()).toEqual([...realIds].sort());
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});

test("seedSimulatedTroop covers all four ramos: stats, especialidades, IRR, pendings, events, logins", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = newTest();
    await t.action(internal.testing.seedTestUsers, {});
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
      const simScouts = users.filter(isSim("troop"));

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
              u.scoutId === simScoutId(ramo, "pending", 1) &&
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

      // Every persona is a conta gerenciada: a `managed` account keyed by its
      // registro, holding a hash the provider accepts for the test password.
      const accounts = await ctx.db.query("authAccounts").collect();
      const accountByUser = new Map(accounts.map((a) => [a.userId, a]));
      const personas = users.filter((u) => u.scoutId?.startsWith("99"));
      expect(personas.length).toBeGreaterThan(40);
      for (const u of personas) {
        const account = accountByUser.get(u._id);
        expect(account?.provider).toBe(MANAGED_PROVIDER);
        expect(account?.providerAccountId).toBe(u.scoutId);
        expect(u.email).toBeUndefined();
      }
      const admin = users.find((u) => u.scoutId === CANONICAL_SCOUT_IDS.admin);
      const adminSecret = admin && accountByUser.get(admin._id)?.secret;
      if (!adminSecret) throw new Error("admin account missing");
      expect(await new Scrypt().verify(adminSecret, DEFAULT_TEST_PASSWORD)).toBe(
        true,
      );

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
        u.scoutId?.startsWith("99") && !u.scoutId.startsWith("990"),
      ).length,
    );
    await t.action(internal.testing.seedSimulatedTroop, {});
    const after = await t.run(async (ctx) =>
      (await ctx.db.query("users").collect()).filter((u) =>
        u.scoutId?.startsWith("99") && !u.scoutId.startsWith("990"),
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
    const t = newTest();
    await expect(
      t.mutation(api.users.updateName, { name: "Test Name" }),
    ).rejects.toThrow("Não autenticado");
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});

test("test registros are seven digits; legacy 6-digit ones widen to the same layout", () => {
  for (const id of Object.values(CANONICAL_SCOUT_IDS)) {
    expect(normalizeScoutId(id)).toBe(id);
  }
  expect(simScoutId("senior", "pending", 7)).toBe("9933007");
  expect(normalizeScoutId(simScoutId("pioneiro", "troop", 99))).not.toBeNull();
  expect(widenLegacyTestScoutId("990001")).toBe(CANONICAL_SCOUT_IDS.admin);
  expect(widenLegacyTestScoutId("993307")).toBe("9933007");
  expect(widenLegacyTestScoutId("9900001")).toBeNull();
  expect(widenLegacyTestScoutId("123456")).toBeNull();
});

test("widenLegacyTestRegistro re-keys test personas only", async () => {
  const t = newTest();
  const { testId, realId } = await t.run(async (ctx) => {
    const testId = await ctx.db.insert("users", { scoutId: "990001", name: "Admin" });
    await ctx.db.insert("authAccounts", {
      userId: testId,
      provider: MANAGED_PROVIDER,
      providerAccountId: "990001",
      secret: "x",
    });
    const realId = await ctx.db.insert("users", { scoutId: "1234567", name: "Real" });
    return { testId, realId };
  });
  await t.run(async (ctx) => {
    for (const u of await ctx.db.query("users").collect()) {
      await widenLegacyTestRegistro(ctx, u);
    }
  });
  await t.run(async (ctx) => {
    expect((await ctx.db.get(testId))?.scoutId).toBe("9900001");
    expect((await ctx.db.get(realId))?.scoutId).toBe("1234567");
    const accounts = await ctx.db.query("authAccounts").collect();
    expect(accounts.map((a) => a.providerAccountId)).toEqual(["9900001"]);
  });
});
