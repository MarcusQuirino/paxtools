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
