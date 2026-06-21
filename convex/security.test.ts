/// <reference types="bun" />
/**
 * Regression tests for the security-hardening fixes. Each `describe` pins that
 * a specific abuse path is now BLOCKED, while the corresponding legitimate flow
 * still works (behavior-preserving for normal users).
 */
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
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: Record<string, unknown> = {},
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "U", ...fields }),
  );
}

/** A group owned by a fresh admin escotista (escotistaRamos: ["escoteiro"]). */
async function seedGroup(t: ReturnType<typeof convexTest>) {
  const adminId = await insertUser(t, {
    name: "Admin",
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo A",
      number: "100",
      password: "AAAAAA",
      createdBy: adminId,
      createdAt: 1,
      ramoNames: {},
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(adminId, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    }),
  );
  return { adminId, groupId };
}

async function insertPendingAction(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
): Promise<Id<"actionCompletions">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("actionCompletions", {
      userId,
      actionId: "escoteiro:aprendizagem-continua:fixed:0",
      completedAt: 1,
      status: "pending",
    }),
  );
}

// ===========================================================================
// #1 — Self privilege escalation via setRole after joining a group
// ===========================================================================
describe("setRole cannot change role once in a group", () => {
  test("approved escoteiro cannot self-promote to escotista", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escoteiro).mutation(api.onboarding.setRole, { role: "escotista" }),
    ).rejects.toThrow("Papel já definido");
    const after = await t.run(async (ctx) => ctx.db.get(escoteiro));
    expect(after?.role).toBe("escoteiro");
  });

  test("legit: role can still be chosen/changed during onboarding (no group yet)", async () => {
    const t = convexTest(schema, modules);
    const user = await insertUser(t, { role: "escoteiro" }); // mid-onboarding, no group
    await as(t, user).mutation(api.onboarding.setRole, { role: "escotista" });
    const after = await t.run(async (ctx) => ctx.db.get(user));
    expect(after?.role).toBe("escotista");
  });
});

// ===========================================================================
// #3 — Non-admin escotista self-expands ramo scope
// ===========================================================================
describe("ramo setters are blocked once in a group", () => {
  test("in-group escotista cannot widen own ramos", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escotista).mutation(api.onboarding.setEscotistaRamos, {
        ramos: ["lobinho", "escoteiro", "senior", "pioneiro"],
      }),
    ).rejects.toThrow("administrador");
    const after = await t.run(async (ctx) => ctx.db.get(escotista));
    expect(after?.escotistaRamos).toEqual(["senior"]);
  });

  test("in-group escoteiro cannot change own ramo", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escoteiro).mutation(api.onboarding.setEscoteiroRamo, {
        ramo: "lobinho",
      }),
    ).rejects.toThrow("administrador");
  });

  test("legit: ramos can be set during onboarding (no group yet)", async () => {
    const t = convexTest(schema, modules);
    const user = await insertUser(t, { role: "escotista" });
    await as(t, user).mutation(api.onboarding.setEscotistaRamos, {
      ramos: ["escoteiro", "senior"],
    });
    const after = await t.run(async (ctx) => ctx.db.get(user));
    expect(after?.escotistaRamos?.sort()).toEqual(["escoteiro", "senior"]);
  });
});

// ===========================================================================
// #4 — Cross-ramo IDOR: ramo-less escoteiro escapes the ramo boundary
// ===========================================================================
describe("ramo-less escoteiro is not actionable by a non-admin escotista", () => {
  test("non-admin escotista is rejected on a ramo-less escoteiro", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["lobinho"],
      groupId,
      membershipStatus: "approved",
    });
    // ramo-less escoteiro (e.g. demoted from escotista): ramo undefined.
    const victim = await insertUser(t, {
      role: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const id = await insertPendingAction(t, victim);
    await expect(
      as(t, escotista).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("não pertence ao seu ramo");
  });

  test("admin escotista can still act on a ramo-less escoteiro", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const victim = await insertUser(t, {
      role: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const id = await insertPendingAction(t, victim);
    await as(t, adminId).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
  });
});

// ===========================================================================
// #7 — Pending member is writable/approvable
// ===========================================================================
describe("pending members are not actionable until approved", () => {
  test("admin cannot approve completions for a not-yet-approved member", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const pending = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "pending",
    });
    const id = await insertPendingAction(t, pending);
    await expect(
      as(t, adminId).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("não foi aprovado");
  });

  test("legit: an approved member's completion can be approved", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const approved = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const id = await insertPendingAction(t, approved);
    await as(t, adminId).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
  });
});

// ===========================================================================
// #6 — Last-admin invariant on join/create another group
// ===========================================================================
describe("sole admin cannot abandon their group by join/create", () => {
  test("sole admin cannot join another group", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: adminId,
        createdAt: 1,
        ramoNames: {},
      }),
    );
    await expect(
      as(t, adminId).mutation(api.groups.joinGroup, { password: "BBBBBB" }),
    ).rejects.toThrow("único administrador");
  });

  test("sole admin cannot create another group", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await expect(
      as(t, adminId).mutation(api.groups.createGroup, { name: "Novo", number: "300" }),
    ).rejects.toThrow("único administrador");
  });

  test("legit: an admin with a co-admin can leave by joining another group", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    // A second admin keeps the group covered.
    await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    });
    await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: adminId,
        createdAt: 1,
        ramoNames: {},
      }),
    );
    await as(t, adminId).mutation(api.groups.joinGroup, { password: "BBBBBB" });
    const after = await t.run(async (ctx) => ctx.db.get(adminId));
    expect(after?.membershipStatus).toBe("pending"); // moved to group B
  });
});

// ===========================================================================
// #5 — Banned user self-reads return empty
// ===========================================================================
describe("banned users cannot self-read their data", () => {
  test("viewer / getMyCompletions / getMyPlan are empty for a banned user", async () => {
    const t = convexTest(schema, modules);
    const banned = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      bannedAt: 123,
    });
    // Seed owned rows that must NOT leak.
    await t.run(async (ctx) => {
      await ctx.db.insert("actionCompletions", {
        userId: banned,
        actionId: "escoteiro:aprendizagem-continua:fixed:0",
        completedAt: 1,
        status: "approved",
      });
      await ctx.db.insert("plannedItems", {
        userId: banned,
        itemKey: "action:escoteiro:aprendizagem-continua:fixed:0",
        position: 0,
      });
    });

    expect(await as(t, banned).query(api.users.viewer, {})).toBeNull();

    const completions = await as(t, banned).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(completions.actions).toEqual([]);
    expect(completions.ramo).toBeNull();

    const plan = await as(t, banned).query(api.plan.getMyPlan, {});
    expect(plan).toEqual([]);
  });
});
