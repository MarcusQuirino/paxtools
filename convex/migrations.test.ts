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

// ---------------------------------------------------------------------------
// backfillRamoOnCompletions (#37) — in-place ramo stamp on the three remaining
// ramo-unscoped tables, collision-safe for the two with unique write-lookups.
// ---------------------------------------------------------------------------

test("backfillRamoOnCompletions stamps escoteiro across the three tables and is idempotent", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId, blocoId: "b1", specialtyName: "S", completedAt: 1, status: "approved",
    });
    await ctx.db.insert("customActions", {
      userId, blocoId: "b1", text: "C", completed: true, createdAt: 1, status: "pending",
    });
    await ctx.db.insert("plannedItems", { userId, itemKey: "custom:x", position: 0 });
  });

  const res = await t.mutation(internal.migrations.backfillRamoOnCompletions, {});
  expect(res.stamped).toBe(3);
  expect(res.merged).toBe(0);

  const stampedAll = await t.run(async (ctx) => {
    const sp = await ctx.db.query("specialtyCompletions").collect();
    const ca = await ctx.db.query("customActions").collect();
    const pl = await ctx.db.query("plannedItems").collect();
    return [...sp, ...ca, ...pl].every((r) => r.ramo === "escoteiro");
  });
  expect(stampedAll).toBe(true);

  // Idempotent: re-running stamps nothing.
  const second = await t.mutation(internal.migrations.backfillRamoOnCompletions, {});
  expect(second.stamped).toBe(0);
  expect(second.skipped).toBe(3);
});

test("backfillRamoOnCompletions throws when a non-escoteiro action id exists, stamps nothing", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("actionCompletions", {
      userId, actionId: "lobinho:b1:fixed:0", completedAt: 1, status: "approved",
    });
    await ctx.db.insert("specialtyCompletions", {
      userId, blocoId: "b1", specialtyName: "S", completedAt: 1, status: "approved",
    });
  });

  await expect(
    t.mutation(internal.migrations.backfillRamoOnCompletions, {}),
  ).rejects.toThrow("non-escoteiro action id");

  const untouched = await t.run(async (ctx) =>
    (await ctx.db.query("specialtyCompletions").collect())[0]!.ramo,
  );
  expect(untouched ?? null).toBeNull();
});

test("backfillRamoOnCompletions merges a specialty collision (approved wins) instead of duplicating", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    // Unstamped source (approved) + an already-stamped escoteiro row for the
    // same (userId, ramo, blocoId, specialtyName) — the deploy-window dup.
    await ctx.db.insert("specialtyCompletions", {
      userId, blocoId: "b1", specialtyName: "S", completedAt: 5, status: "approved",
    });
    await ctx.db.insert("specialtyCompletions", {
      userId, ramo: "escoteiro", blocoId: "b1", specialtyName: "S",
      completedAt: 9, status: "pending",
    });
  });

  const res = await t.mutation(internal.migrations.backfillRamoOnCompletions, {});
  expect(res.merged).toBe(1);
  expect(res.stamped).toBe(0);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("specialtyCompletions").collect(),
  );
  // Exactly one row survives, escoteiro-stamped, approved merged in, earliest date.
  expect(rows).toHaveLength(1);
  expect(rows[0]!.ramo).toBe("escoteiro");
  expect(rows[0]!.status).toBe("approved");
  expect(rows[0]!.completedAt).toBe(5);
});

test("backfillRamoOnCompletions drops a colliding planned item instead of duplicating", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("plannedItems", { userId, itemKey: "custom:x", position: 0 });
    await ctx.db.insert("plannedItems", {
      userId, ramo: "escoteiro", itemKey: "custom:x", position: 3,
    });
  });

  const res = await t.mutation(internal.migrations.backfillRamoOnCompletions, {});
  expect(res.merged).toBe(1);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("plannedItems").collect(),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]!.ramo).toBe("escoteiro");
  expect(rows[0]!.position).toBe(3); // the existing stamped row was kept
});

test("backfillRamoOnCompletions dryRun stamps nothing", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("customActions", {
      userId, blocoId: "b1", text: "C", completed: false, createdAt: 1,
    });
  });

  const res = await t.mutation(internal.migrations.backfillRamoOnCompletions, {
    dryRun: true,
  });
  expect(res.stamped).toBe(1);

  const ramo = await t.run(async (ctx) =>
    (await ctx.db.query("customActions").collect())[0]!.ramo,
  );
  expect(ramo ?? null).toBeNull();
});

// ── migrateSpecialtyCompletions ────────────────────────────────

test("migrateSpecialtyCompletions: approved younger row → specialtyItemCompletions (8 items)", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "escoteiro",
      blocoId: "empreendedorismo-digital",
      specialtyName: "Empreendedorismo",
      completedAt: 100,
      status: "approved",
    });
  });

  const res = await t.mutation(internal.migrations.migrateSpecialtyCompletions, {});
  expect(res.convertedYounger).toBe(1);
  expect(res.convertedOlder).toBe(0);
  expect(res.skippedPending).toBe(0);

  const items = await t.run(async (ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  // Empreendedorismo has 8 items in the known map
  expect(items.length).toBe(8);
  for (const item of items) {
    expect(item.userId).toBe(userId);
    expect(item.ramoGroup).toBe("younger");
    expect(item.specialtyId).toBe("empreendedorismo");
    expect(item.status).toBe("approved");
  }
  const indices = new Set(items.map((i) => i.itemIndex));
  expect(indices.size).toBe(8);

  // Source row deleted
  const remaining = await t.run(async (ctx) =>
    ctx.db.query("specialtyCompletions").collect(),
  );
  expect(remaining.length).toBe(0);
});

test("migrateSpecialtyCompletions: approved older row → specialtyProjectReports (3 steps)", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "senior",
      blocoId: "ciencias-humanas",
      specialtyName: "Ciências Humanas",
      completedAt: 200,
      status: "approved",
    });
  });

  const res = await t.mutation(internal.migrations.migrateSpecialtyCompletions, {});
  expect(res.convertedOlder).toBe(1);
  expect(res.convertedYounger).toBe(0);

  const reports = await t.run(async (ctx) =>
    ctx.db.query("specialtyProjectReports").collect(),
  );
  expect(reports.length).toBe(3);
  const steps = new Set(reports.map((r) => r.step));
  expect(steps.has("conhecer")).toBe(true);
  expect(steps.has("fazer")).toBe(true);
  expect(steps.has("compartilhar")).toBe(true);
  for (const r of reports) {
    expect(r.userId).toBe(userId);
    expect(r.ramoGroup).toBe("older");
    expect(r.specialtyId).toBe("ciencias-humanas");
    expect(r.status).toBe("approved");
  }
});

test("migrateSpecialtyCompletions: pending rows are dropped without conversion", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "escoteiro",
      blocoId: "some-bloco",
      specialtyName: "Yoga",
      completedAt: 50,
      status: "pending",
    });
  });

  const res = await t.mutation(internal.migrations.migrateSpecialtyCompletions, {});
  expect(res.skippedPending).toBe(1);
  expect(res.convertedYounger).toBe(0);

  const items = await t.run(async (ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  expect(items.length).toBe(0);

  // Source row deleted even for pending
  const remaining = await t.run(async (ctx) =>
    ctx.db.query("specialtyCompletions").collect(),
  );
  expect(remaining.length).toBe(0);
});

test("migrateSpecialtyCompletions: idempotent (second run skips duplicates)", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "lobinho",
      blocoId: "some-bloco",
      specialtyName: "Horticultura",
      completedAt: 100,
      status: "approved",
    });
  });

  // First run
  await t.mutation(internal.migrations.migrateSpecialtyCompletions, {});
  const afterFirst = await t.run(async (ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  expect(afterFirst.length).toBe(6); // Horticultura = 6 items

  // Seed a second specialtyCompletions row to test idempotency
  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "lobinho",
      blocoId: "other-bloco",
      specialtyName: "Horticultura",
      completedAt: 200,
      status: "approved",
    });
  });

  // Second run — existing items skipped
  const res2 = await t.mutation(internal.migrations.migrateSpecialtyCompletions, {});
  expect(res2.skippedDuplicate).toBe(6); // all 6 items were already present
  const afterSecond = await t.run(async (ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  expect(afterSecond.length).toBe(6); // unchanged
});

test("migrateSpecialtyCompletions: dryRun writes nothing", async () => {
  const t = convexTest(schema, modules);
  const userId = await makeUser(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: "escoteiro",
      blocoId: "b1",
      specialtyName: "Acampamento",
      completedAt: 1,
      status: "approved",
    });
  });

  const res = await t.mutation(internal.migrations.migrateSpecialtyCompletions, { dryRun: true });
  expect(res.convertedYounger).toBe(1);

  const items = await t.run(async (ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  expect(items.length).toBe(0); // dryRun — nothing written

  const remaining = await t.run(async (ctx) =>
    ctx.db.query("specialtyCompletions").collect(),
  );
  expect(remaining.length).toBe(1); // source not deleted in dryRun
});
