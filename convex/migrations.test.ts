/// <reference types="bun" />
import { test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

// See testing.test.ts for why modules are enumerated explicitly.
const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./approvals.ts": () => import("./approvals"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./groups.ts": () => import("./groups"),
  "./http.ts": () => import("./http"),
  "./migrations.ts": () => import("./migrations"),
  "./onboarding.ts": () => import("./onboarding"),
  "./plan.ts": () => import("./plan"),
  "./progression.ts": () => import("./progression"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

async function makeUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { name: "U" }));
}

test("prefixLegacyActionIds prefixes legacy ids and is idempotent", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("actionCompletions", {
      userId,
      actionId: "aprendizagem-continua:fixed:0",
      completedAt: 1,
      status: "approved",
    });
  });

  const first = await t.mutation(internal.migrations.prefixLegacyActionIds, {});
  expect(first.migrated).toBe(1);
  expect(first.merged).toBe(0);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("actionCompletions").collect(),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]!.actionId).toBe("escoteiro:aprendizagem-continua:fixed:0");

  // Idempotent: re-running migrates nothing.
  const second = await t.mutation(internal.migrations.prefixLegacyActionIds, {});
  expect(second.migrated).toBe(0);
  expect(second.skipped).toBe(1);
});

test("prefixLegacyActionIds merges a legacy row into an existing 4-part row (approved wins)", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    // Legacy 3-part (approved) + already-migrated 4-part (pending) for the
    // same action — the collision the migration must not duplicate.
    await ctx.db.insert("actionCompletions", {
      userId,
      actionId: "aprendizagem-continua:fixed:0",
      completedAt: 5,
      status: "approved",
    });
    await ctx.db.insert("actionCompletions", {
      userId,
      actionId: "escoteiro:aprendizagem-continua:fixed:0",
      completedAt: 9,
      status: "pending",
    });
  });

  const res = await t.mutation(internal.migrations.prefixLegacyActionIds, {});
  expect(res.merged).toBe(1);
  expect(res.migrated).toBe(0);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("actionCompletions").collect(),
  );
  // Exactly one row survives, in 4-part form, with the approved status merged in.
  expect(rows).toHaveLength(1);
  expect(rows[0]!.actionId).toBe("escoteiro:aprendizagem-continua:fixed:0");
  expect(rows[0]!.status).toBe("approved");
  expect(rows[0]!.completedAt).toBe(5);

  // dryRun changes nothing, reports the same merge.
  const dry = await t.mutation(internal.migrations.prefixLegacyActionIds, {
    dryRun: true,
  });
  expect(dry.merged + dry.migrated).toBe(0);
});

test("prefixLegacyPlannedItemKeys prefixes action keys, leaves specialty/custom, handles collisions", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("plannedItems", {
      userId,
      itemKey: "action:aprendizagem-continua:variable:2",
      position: 0,
    });
    await ctx.db.insert("plannedItems", {
      userId,
      itemKey: "specialty:aprendizagem-continua:Leitura",
      position: 1,
    });
    await ctx.db.insert("plannedItems", {
      userId,
      itemKey: "custom:abc123",
      position: 2,
    });
    // Collision: legacy + already-migrated 4-part for the same action.
    await ctx.db.insert("plannedItems", {
      userId,
      itemKey: "action:autonomia-lideranca:fixed:0",
      position: 3,
    });
    await ctx.db.insert("plannedItems", {
      userId,
      itemKey: "action:escoteiro:autonomia-lideranca:fixed:0",
      position: 4,
    });
  });

  const res = await t.mutation(
    internal.migrations.prefixLegacyPlannedItemKeys,
    {},
  );
  expect(res.migrated).toBe(1); // only the first action key patched
  expect(res.merged).toBe(1); // the colliding legacy row deleted
  expect(res.skipped).toBe(3); // specialty + custom + already-4-part action

  const keys = await t.run(async (ctx) =>
    (await ctx.db.query("plannedItems").collect()).map((d) => d.itemKey).sort(),
  );
  expect(keys).toEqual(
    [
      "action:escoteiro:aprendizagem-continua:variable:2",
      "action:escoteiro:autonomia-lideranca:fixed:0",
      "custom:abc123",
      "specialty:aprendizagem-continua:Leitura",
    ].sort(),
  );
});

// ---------------------------------------------------------------------------
// copyLisDeOuroToIrr (#36) — recognition table copy-forward + Lis→IRR rename.
// ---------------------------------------------------------------------------

test("copyLisDeOuroToIrr copies rows to irrCompletions with irr_* ids + ramo, source intact", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "lis_promessa",
      completedAt: 1,
      status: "approved",
    });
    await ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "lis_blocos",
      completedAt: 2,
      status: "pending",
    });
  });

  const res = await t.mutation(internal.migrations.copyLisDeOuroToIrr, {});
  expect(res.sourceCount).toBe(2);
  expect(res.copied).toBe(2);
  expect(res.destCount).toBe(2);

  const irr = await t.run(async (ctx) =>
    ctx.db.query("irrCompletions").collect(),
  );
  expect(irr.map((r) => r.itemId).sort()).toEqual(["irr_blocos", "irr_promessa"]);
  // Every copied row is stamped escoteiro.
  expect(irr.every((r) => r.ramo === "escoteiro")).toBe(true);
  // Status carried across.
  expect(irr.find((r) => r.itemId === "irr_promessa")?.status).toBe("approved");
  expect(irr.find((r) => r.itemId === "irr_blocos")?.status).toBe("pending");

  // Copy-forward: the source table is left intact (not moved).
  const source = await t.run(async (ctx) =>
    ctx.db.query("lisDeOuroCompletions").collect(),
  );
  expect(source).toHaveLength(2);
});

test("copyLisDeOuroToIrr throws when a non-escoteiro action id exists, copies nothing", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("actionCompletions", {
      userId,
      actionId: "lobinho:bloco:fixed:0",
      completedAt: 1,
      status: "approved",
    });
    await ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "lis_promessa",
      completedAt: 1,
      status: "approved",
    });
  });

  await expect(
    t.mutation(internal.migrations.copyLisDeOuroToIrr, {}),
  ).rejects.toThrow("non-escoteiro action id");

  const irr = await t.run(async (ctx) =>
    ctx.db.query("irrCompletions").collect(),
  );
  expect(irr).toHaveLength(0);
});

test("copyLisDeOuroToIrr is idempotent — re-running copies no duplicates", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "lis_promessa",
      completedAt: 1,
      status: "approved",
    });
  });

  const first = await t.mutation(internal.migrations.copyLisDeOuroToIrr, {});
  expect(first.copied).toBe(1);

  const second = await t.mutation(internal.migrations.copyLisDeOuroToIrr, {});
  expect(second.copied).toBe(0);
  expect(second.skipped).toBe(1);

  const irr = await t.run(async (ctx) =>
    ctx.db.query("irrCompletions").collect(),
  );
  expect(irr).toHaveLength(1);
});

test("copyLisDeOuroToIrr dryRun inserts nothing", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "lis_promessa",
      completedAt: 1,
      status: "approved",
    });
  });

  const res = await t.mutation(internal.migrations.copyLisDeOuroToIrr, {
    dryRun: true,
  });
  expect(res.copied).toBe(1);
  expect(res.destCount).toBe(0);

  const irr = await t.run(async (ctx) =>
    ctx.db.query("irrCompletions").collect(),
  );
  expect(irr).toHaveLength(0);
});
