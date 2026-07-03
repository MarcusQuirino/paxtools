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

describe("createGroup", () => {
  test("rejects non-escotista", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, { name: "G", number: "1" }),
    ).rejects.toThrow("Apenas escotistas podem criar grupos");
  });

  test("rejects escotista with no ramos", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escotista" });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, { name: "G", number: "1" }),
    ).rejects.toThrow("pelo menos um ramo");
  });

  test("rejects invalid name (empty / too long)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, { name: "   ", number: "1" }),
    ).rejects.toThrow("Nome do grupo inválido");
    await expect(
      as(t, userId).mutation(api.groups.createGroup, {
        name: "x".repeat(101),
        number: "1",
      }),
    ).rejects.toThrow("Nome do grupo inválido");
  });

  test("rejects invalid number", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, { name: "G", number: "abc" }),
    ).rejects.toThrow("Número do grupo inválido");
  });

  test("creates group, makes caller admin/approved, returns 6-char password", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const res = await as(t, userId).mutation(api.groups.createGroup, {
      name: " Grupo X ",
      number: "007",
    });
    expect(res.password).toMatch(/^[A-Z0-9]{6}$/);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.groupId).toBe(res.groupId);
    expect(user?.isAdmin).toBe(true);
    expect(user?.membershipStatus).toBe("approved");

    const group = await t.run(async (ctx) => ctx.db.get(res.groupId));
    expect(group?.name).toBe("Grupo X"); // trimmed
    expect(group?.number).toBe("7"); // leading zeros normalized
  });

  test("rejects duplicate group number (excluding soft-deleted)", async () => {
    const t = convexTest(schema, modules);
    const a = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, a).mutation(api.groups.createGroup, { name: "G1", number: "42" });

    const b = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await expect(
      as(t, b).mutation(api.groups.createGroup, { name: "G2", number: "42" }),
    ).rejects.toThrow("Já existe um grupo com este número");
  });

  test("rejects oversized ramo names", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, {
        name: "G",
        number: "1",
        ramoNames: { escoteiro: "x".repeat(61) },
      }),
    ).rejects.toThrow("Nome do ramo muito longo");
  });
});

describe("joinGroup", () => {
  test("rejects wrong password", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    expect(groupId).toBeDefined();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.groups.joinGroup, { password: "ZZZZZZ" }),
    ).rejects.toThrow("Grupo não encontrado");
  });

  test("rejects escoteiro without a ramo", async () => {
    const t = convexTest(schema, modules);
    await seedGroup(t);
    const userId = await insertUser(t, { role: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.groups.joinGroup, { password: "AAAAAA" }),
    ).rejects.toThrow("Escolha seu ramo");
  });

  test("rejects escotista without ramos", async () => {
    const t = convexTest(schema, modules);
    await seedGroup(t);
    const userId = await insertUser(t, { role: "escotista" });
    await expect(
      as(t, userId).mutation(api.groups.joinGroup, { password: "AAAAAA" }),
    ).rejects.toThrow("pelo menos um ramo");
  });

  test("joins as pending (case-insensitive, trimmed password)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const res = await as(t, userId).mutation(api.groups.joinGroup, {
      password: "  aaaaaa  ",
    });
    expect(res.groupId).toBe(groupId);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.groupId).toBe(groupId);
    expect(user?.membershipStatus).toBe("pending");
    expect(user?.isAdmin).toBe(false);
  });

  test("cannot join a soft-deleted group", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    await t.run(async (ctx) => ctx.db.patch(groupId, { deletedAt: 123 }));
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.groups.joinGroup, { password: "AAAAAA" }),
    ).rejects.toThrow("Grupo não encontrado");
  });
});

describe("leaveGroup", () => {
  test("rejects when not in a group", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.groups.leaveGroup, {}),
    ).rejects.toThrow("não está em nenhum grupo");
  });

  test("sole admin cannot leave", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await expect(
      as(t, adminId).mutation(api.groups.leaveGroup, {}),
    ).rejects.toThrow("único administrador");
  });

  test("non-admin member can leave (fields cleared)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const memberId = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await as(t, memberId).mutation(api.groups.leaveGroup, {});
    const user = await t.run(async (ctx) => ctx.db.get(memberId));
    expect(user?.groupId).toBeUndefined();
    expect(user?.membershipStatus).toBeUndefined();
  });
});

describe("membership admin actions", () => {
  test("approveMembership requires admin and pending target in group", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const pending = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "pending",
    });

    // Non-admin cannot approve.
    const outsider = await insertUser(t, { role: "escotista", escotistaRamos: ["escoteiro"] });
    await expect(
      as(t, outsider).mutation(api.groups.approveMembership, { userId: pending }),
    ).rejects.toThrow();

    await as(t, adminId).mutation(api.groups.approveMembership, { userId: pending });
    const user = await t.run(async (ctx) => ctx.db.get(pending));
    expect(user?.membershipStatus).toBe("approved");
  });

  test("approveMembership rejects a non-pending target", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const approved = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, adminId).mutation(api.groups.approveMembership, { userId: approved }),
    ).rejects.toThrow("não está pendente");
  });

  test("rejectMembership clears the pending user's group", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const pending = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "pending",
    });
    await as(t, adminId).mutation(api.groups.rejectMembership, { userId: pending });
    const user = await t.run(async (ctx) => ctx.db.get(pending));
    expect(user?.groupId).toBeUndefined();
    expect(user?.membershipStatus).toBeUndefined();
  });

  test("banMember bans a member; banned user is then locked out", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const member = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await as(t, adminId).mutation(api.groups.banMember, { userId: member });
    const user = await t.run(async (ctx) => ctx.db.get(member));
    expect(user?.bannedAt).toBeDefined();
    expect(user?.groupId).toBeUndefined();

    // Banned user cannot perform authenticated actions.
    await expect(
      as(t, member).mutation(api.users.updateName, { name: "x" }),
    ).rejects.toThrow("banido");
  });

  test("admin cannot ban self", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await expect(
      as(t, adminId).mutation(api.groups.banMember, { userId: adminId }),
    ).rejects.toThrow("banir a si mesmo");
  });

  test("changeMemberRole to escoteiro clears admin + escotistaRamos", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const other = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    });
    await as(t, adminId).mutation(api.groups.changeMemberRole, {
      userId: other,
      role: "escoteiro",
    });
    const user = await t.run(async (ctx) => ctx.db.get(other));
    expect(user?.role).toBe("escoteiro");
    expect(user?.isAdmin).toBe(false);
    expect(user?.escotistaRamos).toBeUndefined();
  });

  test("setMemberRamos dedupes and rejects empty", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const other = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
    });
    await as(t, adminId).mutation(api.groups.setMemberRamos, {
      userId: other,
      ramos: ["escoteiro", "escoteiro", "senior"],
    });
    const user = await t.run(async (ctx) => ctx.db.get(other));
    expect(user?.escotistaRamos?.sort()).toEqual(["escoteiro", "senior"]);

    await expect(
      as(t, adminId).mutation(api.groups.setMemberRamos, { userId: other, ramos: [] }),
    ).rejects.toThrow("pelo menos um ramo");
  });
});

describe("updateGroup / deleteGroup", () => {
  test("updateGroup requires admin and validates name", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    await as(t, adminId).mutation(api.groups.updateGroup, { name: " New " });
    const group = await t.run(async (ctx) => ctx.db.get(groupId));
    expect(group?.name).toBe("New");

    await expect(
      as(t, adminId).mutation(api.groups.updateGroup, { name: "  " }),
    ).rejects.toThrow("Nome do grupo inválido");
  });

  test("deleteGroup requires exact name confirmation; soft-deletes", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    await expect(
      as(t, adminId).mutation(api.groups.deleteGroup, { confirmName: "wrong" }),
    ).rejects.toThrow("Confirmação inválida");

    await as(t, adminId).mutation(api.groups.deleteGroup, { confirmName: "Grupo A" });
    const group = await t.run(async (ctx) => ctx.db.get(groupId));
    expect(group?.deletedAt).toBeDefined();
  });
});

describe("group queries: visibility & filtering", () => {
  test("getGroupMembers hides escoteiros outside the escotista's ramos (non-admin)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // A non-admin escotista who only covers 'senior'.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await insertUser(t, {
      name: "EscoteiroEsc",
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await insertUser(t, {
      name: "EscoteiroSen",
      role: "escoteiro",
      ramo: "senior",
      groupId,
      membershipStatus: "approved",
    });

    const members = await as(t, escotista).query(api.groups.getGroupMembers, {});
    const escoteiros = members.filter((m) => m.role === "escoteiro");
    expect(escoteiros.map((m) => m.ramo)).toEqual(["senior"]);
  });

  test("getGroupMembers: unstamped (undefined membershipStatus) escotista caller gets results", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // Legacy escotista row: membershipStatus was never stamped.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
    });
    const esc = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const members = await as(t, escotista).query(api.groups.getGroupMembers, {});
    expect(members.map((m) => m._id)).toContain(esc);
  });

  test("getGroupMembers: legacy grupo-creator (isAdmin unset) sees every ramo's escoteiros", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // Creator predating the isAdmin flag: admin only via group.createdBy.
    const creator = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
    });
    await t.run(async (ctx) => ctx.db.patch(groupId, { createdBy: creator }));
    const escSenior = await insertUser(t, {
      role: "escoteiro",
      ramo: "senior",
      groupId,
      membershipStatus: "approved",
    });
    const members = await as(t, creator).query(api.groups.getGroupMembers, {});
    expect(members.map((m) => m._id)).toContain(escSenior);
  });

  test("getGroupMembers: escoteiro caller gets [] (not an error)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const esc = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const members = await as(t, esc).query(api.groups.getGroupMembers, {});
    expect(members).toEqual([]);
  });

  test("getGroupMembers: banned escotista caller gets [] (not an error)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const banned = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
      bannedAt: 123,
    });
    const members = await as(t, banned).query(api.groups.getGroupMembers, {});
    expect(members).toEqual([]);
  });

  test("getGroupMembers: escotista in no group gets [] (not an error)", async () => {
    const t = convexTest(schema, modules);
    await seedGroup(t);
    const outsider = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const members = await as(t, outsider).query(api.groups.getGroupMembers, {});
    expect(members).toEqual([]);
  });

  test("getGroupMembers: ramo-less escoteiro is visible to admins only", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const nonAdmin = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["lobinho", "escoteiro", "senior", "pioneiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    // Escoteiro without a ramo (never picked one).
    const ramoless = await insertUser(t, {
      role: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });

    const adminView = await as(t, adminId).query(api.groups.getGroupMembers, {});
    expect(adminView.map((m) => m._id)).toContain(ramoless);

    const nonAdminView = await as(t, nonAdmin).query(api.groups.getGroupMembers, {});
    expect(nonAdminView.map((m) => m._id)).not.toContain(ramoless);
  });

  test("getMyGroup exposes password only to approved escotistas", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const adminView = await as(t, adminId).query(api.groups.getMyGroup, {});
    expect(adminView?.password).toBe("AAAAAA");

    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const escView = await as(t, escoteiro).query(api.groups.getMyGroup, {});
    expect(escView?.password).toBeNull();
  });

  test("getPendingMemberships returns pending users for an admin", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    await insertUser(t, {
      name: "Pendente",
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "pending",
    });
    const pending = await as(t, adminId).query(api.groups.getPendingMemberships, {});
    expect(pending.map((p) => p.name)).toContain("Pendente");
  });
});
