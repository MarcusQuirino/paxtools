/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Bun's test runner has no `import.meta.glob` (Vite-only). Enumerate convex
// modules explicitly so the in-memory backend can load them. At least one
// "_generated/" path must be present so convex-test can find the project root.
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

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

// `withIdentity({ subject: userId })` makes @convex-dev/auth's getAuthUserId
// return `userId` (it splits the JWT subject on "|" and takes the first part).
function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: Partial<{
    name: string;
    email: string;
    role: "escoteiro" | "escotista";
    ramo: Ramo;
    escotistaRamos: Ramo[];
    groupId: Id<"groups">;
    isAdmin: boolean;
    membershipStatus: "pending" | "approved";
    onboardingComplete: boolean;
    bannedAt: number;
  }> = {},
): Promise<Id<"users">> {
  return await t.run(async (ctx) => ctx.db.insert("users", { name: "U", ...fields }));
}

/** Seed a group owned by a fresh admin escotista; returns ids. */
async function seedGroup(
  t: ReturnType<typeof convexTest>,
  opts: { ramoNames?: Record<string, string> } = {},
) {
  const adminId = await insertUser(t, {
    name: "Admin",
    email: "admin@example.com",
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
      ramoNames: opts.ramoNames ?? {},
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

// ---------------------------------------------------------------------------
// Local helpers for inserting completion rows directly via t.run.
// ---------------------------------------------------------------------------

/** Insert an approved escoteiro into the group. */
async function seedEscoteiro(
  t: ReturnType<typeof convexTest>,
  groupId: Id<"groups">,
  ramo: Ramo = "escoteiro",
  extra: Partial<{
    name: string;
    membershipStatus: "pending" | "approved";
    bannedAt: number;
  }> = {},
) {
  return insertUser(t, {
    name: "Escoteiro",
    role: "escoteiro",
    ramo,
    groupId,
    membershipStatus: extra.membershipStatus ?? "approved",
    ...extra,
  });
}

async function insertAction(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  status: "pending" | "approved" | undefined = "pending",
) {
  return t.run(async (ctx) =>
    ctx.db.insert("actionCompletions", {
      userId,
      actionId: "escoteiro:bloco1:type:0",
      completedAt: 1,
      status,
    }),
  );
}

async function insertSpecialty(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  status: "pending" | "approved" | undefined = "pending",
) {
  return t.run(async (ctx) =>
    ctx.db.insert("specialtyCompletions", {
      userId,
      blocoId: "bloco1",
      specialtyName: "Especialidade X",
      completedAt: 1,
      status,
    }),
  );
}

async function insertLis(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  status: "pending" | "approved" | undefined = "pending",
) {
  return t.run(async (ctx) =>
    ctx.db.insert("lisDeOuroCompletions", {
      userId,
      itemId: "item1",
      completedAt: 1,
      status,
    }),
  );
}

async function insertCustom(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: {
    completed?: boolean;
    status?: "pending" | "approved" | undefined;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("customActions", {
      userId,
      blocoId: "bloco1",
      text: "Ação custom",
      completed: opts.completed ?? true,
      createdAt: 1,
      status: opts.status ?? "pending",
    }),
  );
}

// ===========================================================================
// 1. approve* core behavior
// ===========================================================================

describe("approveAction / approveSpecialty / approveLisDeOuroItem", () => {
  test("approveAction throws 'Não encontrado' for a dangling id", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertAction(t, esc);
    await t.run(async (ctx) => ctx.db.delete(id)); // id valid but row gone
    await expect(
      as(t, adminId).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("Não encontrado");
  });

  test("approveAction throws 'não está pendente' when status is approved", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertAction(t, esc, "approved");
    await expect(
      as(t, adminId).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("não está pendente");
  });

  test("approveAction sets status=approved, approvedBy=caller, approvedAt", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertAction(t, esc);
    await as(t, adminId).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
    expect(row?.approvedBy).toBe(adminId);
    expect(typeof row?.approvedAt).toBe("number");
  });

  test("approveSpecialty: dangling -> 'Não encontrado'; approved -> 'não está pendente'; success", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);

    const gone = await insertSpecialty(t, esc);
    await t.run(async (ctx) => ctx.db.delete(gone));
    await expect(
      as(t, adminId).mutation(api.approvals.approveSpecialty, { completionId: gone }),
    ).rejects.toThrow("Não encontrado");

    const already = await insertSpecialty(t, esc, "approved");
    await expect(
      as(t, adminId).mutation(api.approvals.approveSpecialty, { completionId: already }),
    ).rejects.toThrow("não está pendente");

    const ok = await insertSpecialty(t, esc);
    await as(t, adminId).mutation(api.approvals.approveSpecialty, { completionId: ok });
    const row = await t.run(async (ctx) => ctx.db.get(ok));
    expect(row?.status).toBe("approved");
    expect(row?.approvedBy).toBe(adminId);
    expect(typeof row?.approvedAt).toBe("number");
  });

  test("approveLisDeOuroItem: dangling -> 'Não encontrado'; approved -> 'não está pendente'; success", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);

    const gone = await insertLis(t, esc);
    await t.run(async (ctx) => ctx.db.delete(gone));
    await expect(
      as(t, adminId).mutation(api.approvals.approveLisDeOuroItem, { completionId: gone }),
    ).rejects.toThrow("Não encontrado");

    const already = await insertLis(t, esc, "approved");
    await expect(
      as(t, adminId).mutation(api.approvals.approveLisDeOuroItem, { completionId: already }),
    ).rejects.toThrow("não está pendente");

    const ok = await insertLis(t, esc);
    await as(t, adminId).mutation(api.approvals.approveLisDeOuroItem, { completionId: ok });
    const row = await t.run(async (ctx) => ctx.db.get(ok));
    expect(row?.status).toBe("approved");
    expect(row?.approvedBy).toBe(adminId);
    expect(typeof row?.approvedAt).toBe("number");
  });

  test("same-group approved escotista (non-admin, matching ramo) can approve", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    const esc = await seedEscoteiro(t, groupId, "escoteiro");
    const id = await insertAction(t, esc);
    await as(t, escotista).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
    expect(row?.approvedBy).toBe(escotista);
  });
});

// ===========================================================================
// 2. approveCustomAction
// ===========================================================================

describe("approveCustomAction", () => {
  test("requires completed===true AND status==='pending'", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);

    // completed false -> not pending
    const notCompleted = await insertCustom(t, esc, { completed: false, status: "pending" });
    await expect(
      as(t, adminId).mutation(api.approvals.approveCustomAction, { completionId: notCompleted }),
    ).rejects.toThrow("não está pendente");

    // status approved -> not pending
    const alreadyApproved = await insertCustom(t, esc, { completed: true, status: "approved" });
    await expect(
      as(t, adminId).mutation(api.approvals.approveCustomAction, { completionId: alreadyApproved }),
    ).rejects.toThrow("não está pendente");

    // completed + pending -> success
    const ok = await insertCustom(t, esc, { completed: true, status: "pending" });
    await as(t, adminId).mutation(api.approvals.approveCustomAction, { completionId: ok });
    const row = await t.run(async (ctx) => ctx.db.get(ok));
    expect(row?.status).toBe("approved");
    expect(row?.approvedBy).toBe(adminId);
    expect(typeof row?.approvedAt).toBe("number");
  });

  test("dangling id -> 'Não encontrado'", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertCustom(t, esc);
    await t.run(async (ctx) => ctx.db.delete(id));
    await expect(
      as(t, adminId).mutation(api.approvals.approveCustomAction, { completionId: id }),
    ).rejects.toThrow("Não encontrado");
  });
});

// ===========================================================================
// 3. reject* delete-vs-patch behavior
// ===========================================================================

describe("rejectAction / rejectSpecialty / rejectLisDeOuroItem (delete)", () => {
  test("rejectAction deletes the row", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertAction(t, esc);
    await as(t, adminId).mutation(api.approvals.rejectAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).toBeNull();
  });

  test("rejectSpecialty deletes the row", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertSpecialty(t, esc);
    await as(t, adminId).mutation(api.approvals.rejectSpecialty, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).toBeNull();
  });

  test("rejectLisDeOuroItem deletes the row", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertLis(t, esc);
    await as(t, adminId).mutation(api.approvals.rejectLisDeOuroItem, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).toBeNull();
  });

  test("rejectAction: dangling -> 'Não encontrado'; not pending -> 'não está pendente'", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);

    const gone = await insertAction(t, esc);
    await t.run(async (ctx) => ctx.db.delete(gone));
    await expect(
      as(t, adminId).mutation(api.approvals.rejectAction, { completionId: gone }),
    ).rejects.toThrow("Não encontrado");

    const approved = await insertAction(t, esc, "approved");
    await expect(
      as(t, adminId).mutation(api.approvals.rejectAction, { completionId: approved }),
    ).rejects.toThrow("não está pendente");
  });

  // NOTE: possible bug — reject*/rejectCustomAction check doc-existence and
  // status BEFORE any authentication/authorization (assertCanActOnEscoteiro
  // runs only after the status check), unlike approve* which authenticate
  // first. So an UNAUTHENTICATED caller hitting a dangling id gets
  // "Não encontrado" rather than an auth error — a small existence/status
  // info-leak in functions the spec calls security-critical. Pinning current
  // behavior.
  test("rejectAction leaks existence: unauthenticated + dangling id -> 'Não encontrado'", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const gone = await insertAction(t, esc);
    await t.run(async (ctx) => ctx.db.delete(gone));
    // No identity attached: still surfaces "Não encontrado" (not "Não autenticado").
    await expect(
      t.mutation(api.approvals.rejectAction, { completionId: gone }),
    ).rejects.toThrow("Não encontrado");
  });
});

describe("rejectCustomAction (patch, not delete)", () => {
  test("does NOT delete; sets completed=false, status=undefined", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertCustom(t, esc, { completed: true, status: "pending" });
    await as(t, adminId).mutation(api.approvals.rejectCustomAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).not.toBeNull();
    expect(row?.completed).toBe(false);
    expect(row?.status).toBeUndefined();
    expect(row?.approvedBy).toBeUndefined();
    expect(row?.approvedAt).toBeUndefined();
  });

  test("requires completed && pending: completed=false -> 'não está pendente'", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const id = await insertCustom(t, esc, { completed: false, status: "pending" });
    await expect(
      as(t, adminId).mutation(api.approvals.rejectCustomAction, { completionId: id }),
    ).rejects.toThrow("não está pendente");
  });
});

// ===========================================================================
// 4. Cross-group authorization (security-critical)
// ===========================================================================

describe("cross-group authorization", () => {
  test("approveAction: escotista from a DIFFERENT group is rejected", async () => {
    const t = convexTest(schema, modules);
    // Group A with its admin.
    const { adminId: adminA } = await seedGroup(t);
    // A separate group B with an escoteiro owning a pending row.
    const groupB = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: adminA, // arbitrary; not used by the check
        createdAt: 1,
        ramoNames: {},
      }),
    );
    const escB = await seedEscoteiro(t, groupB, "escoteiro");
    const id = await insertAction(t, escB); // pending, so we reach the group check
    await expect(
      as(t, adminA).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("não pertence ao seu grupo");
  });

  test("rejectAction: escotista from a DIFFERENT group is rejected", async () => {
    const t = convexTest(schema, modules);
    const { adminId: adminA } = await seedGroup(t);
    const groupB = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: adminA,
        createdAt: 1,
        ramoNames: {},
      }),
    );
    const escB = await seedEscoteiro(t, groupB, "escoteiro");
    const id = await insertAction(t, escB);
    await expect(
      as(t, adminA).mutation(api.approvals.rejectAction, { completionId: id }),
    ).rejects.toThrow("não pertence ao seu grupo");
    // Row still exists (auth failed before delete).
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).not.toBeNull();
  });
});

// ===========================================================================
// 5. Ramo authorization (security-critical)
// ===========================================================================

describe("ramo authorization", () => {
  test("non-admin escotista without the target's ramo is rejected", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // escotista covers only 'senior'.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    // target is an 'escoteiro' ramo escoteiro -> not in caller's ramos.
    const esc = await seedEscoteiro(t, groupId, "escoteiro");
    const id = await insertAction(t, esc);
    await expect(
      as(t, escotista).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("não pertence ao seu ramo");
  });

  test("admin escotista bypasses the ramo check", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t); // admin escotistaRamos=['escoteiro']
    // target is a 'senior' escoteiro -> outside admin's ramos, but admin bypasses.
    const esc = await seedEscoteiro(t, groupId, "senior");
    const id = await insertAction(t, esc);
    await as(t, adminId).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
  });

  test("approving a banned escoteiro's stale pending conclusão fails", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId, "escoteiro");
    const id = await insertAction(t, esc); // pending row left behind by the ban
    await t.run(async (ctx) => ctx.db.patch(esc, { bannedAt: 123 }));
    await expect(
      as(t, adminId).mutation(api.approvals.approveAction, { completionId: id }),
    ).rejects.toThrow("banido");
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("pending");
  });

  test("rejecting a banned escoteiro's stale pending conclusão fails", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId, "escoteiro");
    const id = await insertAction(t, esc);
    await t.run(async (ctx) => ctx.db.patch(esc, { bannedAt: 123 }));
    await expect(
      as(t, adminId).mutation(api.approvals.rejectAction, { completionId: id }),
    ).rejects.toThrow("banido");
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).not.toBeNull();
  });

  test("unstamped (undefined) membershipStatus caller can approve an in-ramo escoteiro", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // Legacy escotista: membershipStatus was never stamped.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
    });
    const esc = await seedEscoteiro(t, groupId, "escoteiro");
    const id = await insertAction(t, esc);
    await as(t, escotista).mutation(api.approvals.approveAction, { completionId: id });
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.status).toBe("approved");
  });
});

// ===========================================================================
// 6. bulkAction
// ===========================================================================

describe("bulkAction", () => {
  test("approve: approves all pending action/specialty/lis/custom rows", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const a = await insertAction(t, esc);
    const s = await insertSpecialty(t, esc);
    const l = await insertLis(t, esc);
    const c = await insertCustom(t, esc, { completed: true, status: "pending" });

    await as(t, adminId).mutation(api.approvals.bulkAction, {
      action: "approve",
      actionIds: [a],
      specialtyIds: [s],
      lisIds: [l],
      customActionIds: [c],
    });

    const rows = await t.run(async (ctx) => ({
      a: await ctx.db.get(a),
      s: await ctx.db.get(s),
      l: await ctx.db.get(l),
      c: await ctx.db.get(c),
    }));
    expect(rows.a?.status).toBe("approved");
    expect(rows.s?.status).toBe("approved");
    expect(rows.l?.status).toBe("approved");
    expect(rows.c?.status).toBe("approved");
    expect(rows.a?.approvedBy).toBe(adminId);
  });

  test("reject: deletes action/specialty/lis rows; resets custom actions", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const a = await insertAction(t, esc);
    const s = await insertSpecialty(t, esc);
    const l = await insertLis(t, esc);
    const c = await insertCustom(t, esc, { completed: true, status: "pending" });

    await as(t, adminId).mutation(api.approvals.bulkAction, {
      action: "reject",
      actionIds: [a],
      specialtyIds: [s],
      lisIds: [l],
      customActionIds: [c],
    });

    const rows = await t.run(async (ctx) => ({
      a: await ctx.db.get(a),
      s: await ctx.db.get(s),
      l: await ctx.db.get(l),
      c: await ctx.db.get(c),
    }));
    expect(rows.a).toBeNull();
    expect(rows.s).toBeNull();
    expect(rows.l).toBeNull();
    // custom action is NOT deleted; it is reset.
    expect(rows.c).not.toBeNull();
    expect(rows.c?.completed).toBe(false);
    expect(rows.c?.status).toBeUndefined();
  });

  test("non-pending rows are skipped (no throw)", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const approvedAction = await insertAction(t, esc, "approved");
    const pendingAction = await insertAction(t, esc, "pending");
    const notCompletedCustom = await insertCustom(t, esc, { completed: false, status: "pending" });

    await as(t, adminId).mutation(api.approvals.bulkAction, {
      action: "approve",
      actionIds: [approvedAction, pendingAction],
      specialtyIds: [],
      lisIds: [],
      customActionIds: [notCompletedCustom],
    });

    const rows = await t.run(async (ctx) => ({
      approved: await ctx.db.get(approvedAction),
      pending: await ctx.db.get(pendingAction),
      custom: await ctx.db.get(notCompletedCustom),
    }));
    // already-approved row stays approved (skipped, not re-stamped errors).
    expect(rows.approved?.status).toBe("approved");
    // the genuinely-pending row becomes approved.
    expect(rows.pending?.status).toBe("approved");
    // not-completed custom is skipped, left untouched.
    expect(rows.custom?.completed).toBe(false);
    expect(rows.custom?.status).toBe("pending");
  });

  test("customActionIds is optional (omitted)", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const a = await insertAction(t, esc);
    await as(t, adminId).mutation(api.approvals.bulkAction, {
      action: "approve",
      actionIds: [a],
      specialtyIds: [],
      lisIds: [],
      // customActionIds omitted entirely
    });
    const row = await t.run(async (ctx) => ctx.db.get(a));
    expect(row?.status).toBe("approved");
  });
});

// ===========================================================================
// 7. approveAllForEscoteiro
// ===========================================================================

describe("approveAllForEscoteiro", () => {
  test("approves all pending actions/specialties/lis/custom(completed) at once", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const a = await insertAction(t, esc);
    const s = await insertSpecialty(t, esc);
    const l = await insertLis(t, esc);
    const c = await insertCustom(t, esc, { completed: true, status: "pending" });
    // A not-completed custom: should NOT be approved (filtered out).
    const cIncomplete = await insertCustom(t, esc, { completed: false, status: "pending" });

    await as(t, adminId).mutation(api.approvals.approveAllForEscoteiro, {
      escoteiroId: esc,
    });

    const rows = await t.run(async (ctx) => ({
      a: await ctx.db.get(a),
      s: await ctx.db.get(s),
      l: await ctx.db.get(l),
      c: await ctx.db.get(c),
      ci: await ctx.db.get(cIncomplete),
    }));
    expect(rows.a?.status).toBe("approved");
    expect(rows.s?.status).toBe("approved");
    expect(rows.l?.status).toBe("approved");
    expect(rows.c?.status).toBe("approved");
    expect(rows.c?.approvedBy).toBe(adminId);
    // incomplete custom stays pending (was filtered out of the approval loop).
    expect(rows.ci?.status).toBe("pending");
  });

  test("cross-group escoteiro is rejected", async () => {
    const t = convexTest(schema, modules);
    const { adminId: adminA } = await seedGroup(t);
    const groupB = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: adminA,
        createdAt: 1,
        ramoNames: {},
      }),
    );
    const escB = await seedEscoteiro(t, groupB);
    await expect(
      as(t, adminA).mutation(api.approvals.approveAllForEscoteiro, { escoteiroId: escB }),
    ).rejects.toThrow("não pertence ao seu grupo");
  });
});

// ===========================================================================
// 8. getPendingForGroup
// ===========================================================================

describe("getPendingForGroup", () => {
  test("returns [] for unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await seedGroup(t);
    const res = await t.query(api.approvals.getPendingForGroup, {});
    expect(res).toEqual([]);
  });

  test("returns [] for a non-escotista (escoteiro caller)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const res = await as(t, esc).query(api.approvals.getPendingForGroup, {});
    expect(res).toEqual([]);
  });

  test("returns [] for an escotista with no group", async () => {
    const t = convexTest(schema, modules);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const res = await as(t, escotista).query(api.approvals.getPendingForGroup, {});
    expect(res).toEqual([]);
  });

  test("admin sees one entry per escoteiro with >0 pending; totalPending correct", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    await insertAction(t, esc);
    await insertSpecialty(t, esc);
    await insertLis(t, esc);
    await insertCustom(t, esc, { completed: true, status: "pending" });

    // An escoteiro with no pending items -> absent.
    await seedEscoteiro(t, groupId);

    const res = await as(t, adminId).query(api.approvals.getPendingForGroup, {});
    expect(res.length).toBe(1);
    expect(res[0]!.escoteiro._id).toBe(esc);
    expect(res[0]!.totalPending).toBe(4);
  });

  test("only COMPLETED custom actions count; a not-completed-only escoteiro is absent", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    // Only a not-completed custom action (status pending) -> filtered out.
    await insertCustom(t, esc, { completed: false, status: "pending" });

    const res = await as(t, adminId).query(api.approvals.getPendingForGroup, {});
    expect(res.length).toBe(0);
  });

  test("banned and non-approved escoteiros are excluded", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);

    const banned = await seedEscoteiro(t, groupId, "escoteiro", { bannedAt: 123 });
    await insertAction(t, banned);

    const pendingMember = await seedEscoteiro(t, groupId, "escoteiro", {
      membershipStatus: "pending",
    });
    await insertAction(t, pendingMember);

    const res = await as(t, adminId).query(api.approvals.getPendingForGroup, {});
    expect(res.length).toBe(0);
  });

  test("non-admin escotista only sees escoteiros within escotistaRamos", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    const escSenior = await seedEscoteiro(t, groupId, "senior");
    await insertAction(t, escSenior);
    const escEscoteiro = await seedEscoteiro(t, groupId, "escoteiro");
    await insertAction(t, escEscoteiro);

    const res = await as(t, escotista).query(api.approvals.getPendingForGroup, {});
    expect(res.length).toBe(1);
    expect(res[0]!.escoteiro._id).toBe(escSenior);
  });
});

// ===========================================================================
// 9. getGroupStats
// ===========================================================================

describe("getGroupStats", () => {
  test("returns null for a non-escotista", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const esc = await seedEscoteiro(t, groupId);
    const res = await as(t, esc).query(api.approvals.getGroupStats, {});
    expect(res).toBeNull();
  });

  test("returns null for an escotista with no group", async () => {
    const t = convexTest(schema, modules);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const res = await as(t, escotista).query(api.approvals.getGroupStats, {});
    expect(res).toBeNull();
  });

  test("returns counts and exposes group.password for an admin", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    // 1 escoteiro + the admin escotista already in the group.
    const esc = await seedEscoteiro(t, groupId);
    await insertAction(t, esc, "pending");
    await insertAction(t, esc, "approved");
    // Pending specialty/lis/custom should NOT count toward totalPending.
    await insertSpecialty(t, esc, "pending");
    await insertLis(t, esc, "pending");
    await insertCustom(t, esc, { completed: true, status: "pending" });

    const res = await as(t, adminId).query(api.approvals.getGroupStats, {});
    expect(res).not.toBeNull();
    expect(res?.group.password).toBe("AAAAAA");
    expect(res?.totalMembers).toBe(2); // admin escotista + 1 escoteiro
    expect(res?.escoteiroCount).toBe(1);
    expect(res?.escotistaCount).toBe(1);
    // NOTE: possible bug — getGroupStats.totalPending sums ONLY pending
    // actionCompletions; it ignores pending specialties/lis/custom actions,
    // unlike getPendingForGroup.totalPending which sums all four categories.
    // Pinning current (actions-only) behavior: 1 pending action -> 1.
    expect(res?.totalPending).toBe(1);
  });

  test("non-admin escotista's escoteiroStats is ramo-filtered", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    const escSenior = await seedEscoteiro(t, groupId, "senior");
    const escEscoteiro = await seedEscoteiro(t, groupId, "escoteiro");

    const res = await as(t, escotista).query(api.approvals.getGroupStats, {});
    expect(res).not.toBeNull();
    const ids = res?.escoteiroStats.map((s) => s._id);
    expect(ids).toContain(escSenior);
    expect(ids).not.toContain(escEscoteiro);
    // escoteiroCount reflects only the visible (ramo-filtered) escoteiros.
    expect(res?.escoteiroCount).toBe(1);
  });
});
