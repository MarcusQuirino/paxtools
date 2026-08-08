/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { backfillSectionsForGroup } from "./lib/sections";

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
    sectionId: Id<"sections">;
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

  test("stores the região normalized to uppercase", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const res = await as(t, userId).mutation(api.groups.createGroup, {
      name: "G",
      number: "38",
      regiao: " rs ",
    });
    const group = await t.run(async (ctx) => ctx.db.get(res.groupId));
    expect(group?.regiao).toBe("RS");
  });

  test("rejects a região that is not a UF", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await expect(
      as(t, userId).mutation(api.groups.createGroup, {
        name: "G",
        number: "38",
        regiao: "XX",
      }),
    ).rejects.toThrow("Região escoteira inválida");
    await expect(
      as(t, userId).mutation(api.groups.createGroup, {
        name: "G",
        number: "38",
        regiao: "Rio Grande do Sul",
      }),
    ).rejects.toThrow("Região escoteira inválida");
  });

  test("leaves the região unset when it is omitted", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const res = await as(t, userId).mutation(api.groups.createGroup, {
      name: "G",
      number: "38",
    });
    const group = await t.run(async (ctx) => ctx.db.get(res.groupId));
    expect(group?.regiao).toBeUndefined();
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

  test("updateGroup edits the região, normalizing and validating it", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);

    await as(t, adminId).mutation(api.groups.updateGroup, { regiao: " sp " });
    expect(await t.run(async (ctx) => (await ctx.db.get(groupId))?.regiao)).toBe(
      "SP",
    );

    await expect(
      as(t, adminId).mutation(api.groups.updateGroup, { regiao: "XX" }),
    ).rejects.toThrow("Região escoteira inválida");

    // An empty string clears it — a group may legitimately have no região.
    // Asserted through the query the UI reads, since convex-test keeps a
    // cleared field as null where the real backend drops it entirely.
    await as(t, adminId).mutation(api.groups.updateGroup, { regiao: "" });
    const cleared = await as(t, adminId).query(api.groups.getMyGroup, {});
    expect(cleared?.regiao).toBeNull();
  });

  test("updateGroup requires admin to edit the região", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const member = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
    });
    // Pin the *authorization* rejection: a bare toThrow() would also pass on
    // an unrelated failure and hide the missing guard.
    await expect(
      as(t, member).mutation(api.groups.updateGroup, { regiao: "SP" }),
    ).rejects.toThrow("Apenas administradores podem realizar esta ação");
    // …and that the rejected edit left the grupo untouched. Asserted through
    // the query, which reports "no região" as null either way.
    const after = await as(t, member).query(api.groups.getMyGroup, {});
    expect(after?.regiao).toBeNull();
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

  test("getMyGroup returns the região, null for a group that has none", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);

    // Seeded groups predate the field: no região on the doc at all.
    const before = await as(t, adminId).query(api.groups.getMyGroup, {});
    expect(before?.number).toBe("100");
    expect(before?.regiao).toBeNull();

    await t.run(async (ctx) => ctx.db.patch(groupId, { regiao: "RS" }));
    const after = await as(t, adminId).query(api.groups.getMyGroup, {});
    expect(after?.regiao).toBe("RS");
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

describe("seções", () => {
  test("an admin adds a seção and it comes back from listSections", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "  Alcateia Norte  ",
      ramo: "lobinho",
    });
    const sections = await as(t, adminId).query(api.groups.listSections, {});
    expect(sections).toEqual([
      { _id: sectionId, name: "Alcateia Norte", ramo: "lobinho" },
    ]);
  });

  test("a grupo runs two alcateias and no seção in the sênior ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await as(t, adminId).mutation(api.groups.addSection, {
      name: "Alcateia Norte",
      ramo: "lobinho",
    });
    await as(t, adminId).mutation(api.groups.addSection, {
      name: "Alcateia Sul",
      ramo: "lobinho",
    });
    const sections = await as(t, adminId).query(api.groups.listSections, {});
    expect(sections.filter((s) => s.ramo === "lobinho").map((s) => s.name)).toEqual([
      "Alcateia Norte",
      "Alcateia Sul",
    ]);
    expect(sections.filter((s) => s.ramo === "senior")).toEqual([]);
  });

  test("addSection rejects an empty or over-long name", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    await expect(
      as(t, adminId).mutation(api.groups.addSection, {
        name: "   ",
        ramo: "escoteiro",
      }),
    ).rejects.toThrow("Nome da seção é obrigatório");
    await expect(
      as(t, adminId).mutation(api.groups.addSection, {
        name: "x".repeat(61),
        ramo: "escoteiro",
      }),
    ).rejects.toThrow("Nome da seção muito longo");
  });

  test("a non-admin member cannot add a seção", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const member = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await expect(
      as(t, member).mutation(api.groups.addSection, {
        name: "Tropa Nova",
        ramo: "escoteiro",
      }),
    ).rejects.toThrow("Apenas administradores");
  });

  test("renameSection trims, validates and persists the new name", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Velha",
      ramo: "escoteiro",
    });
    await expect(
      as(t, adminId).mutation(api.groups.renameSection, {
        sectionId,
        name: "x".repeat(61),
      }),
    ).rejects.toThrow("Nome da seção muito longo");
    await as(t, adminId).mutation(api.groups.renameSection, {
      sectionId,
      name: "  Tropa Nova  ",
    });
    const sections = await as(t, adminId).query(api.groups.listSections, {});
    expect(sections.map((s) => s.name)).toEqual(["Tropa Nova"]);
  });

  test("an admin cannot touch a seção of another grupo", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    const otherAdmin = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const otherGroupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: otherAdmin,
        createdAt: 1,
      }),
    );
    await t.run(async (ctx) =>
      ctx.db.patch(otherAdmin, {
        groupId: otherGroupId,
        isAdmin: true,
        membershipStatus: "approved",
      }),
    );
    const foreign = await as(t, otherAdmin).mutation(api.groups.addSection, {
      name: "Clã Alheio",
      ramo: "pioneiro",
    });
    await expect(
      as(t, adminId).mutation(api.groups.renameSection, {
        sectionId: foreign,
        name: "Roubada",
      }),
    ).rejects.toThrow("Seção não pertence ao seu grupo");
    await expect(
      as(t, adminId).mutation(api.groups.removeSection, { sectionId: foreign }),
    ).rejects.toThrow("Seção não pertence ao seu grupo");
  });

  test("removeSection deletes an empty seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Clã Antigo",
      ramo: "pioneiro",
    });
    await as(t, adminId).mutation(api.groups.removeSection, { sectionId });
    expect(await as(t, adminId).query(api.groups.listSections, {})).toEqual([]);
    expect(await t.run(async (ctx) => ctx.db.get(sectionId))).toBeNull();
  });

  test("removeSection refuses to strand escoteiros still in the seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Cheia",
      ramo: "escoteiro",
    });
    await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      sectionId,
    });
    await expect(
      as(t, adminId).mutation(api.groups.removeSection, { sectionId }),
    ).rejects.toThrow("escoteiros");
    expect(await t.run(async (ctx) => ctx.db.get(sectionId))).not.toBeNull();
  });

  test("removeSection ignores an ex-member's stale seção assignment", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Esvaziada",
      ramo: "escoteiro",
    });
    const gone = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      sectionId,
    });
    // Left (or was banned from) the grupo, keeping the old sectionId behind.
    await t.run(async (ctx) =>
      ctx.db.patch(gone, { groupId: undefined, membershipStatus: undefined }),
    );
    await as(t, adminId).mutation(api.groups.removeSection, { sectionId });
    expect(await t.run(async (ctx) => ctx.db.get(sectionId))).toBeNull();
    // ...and the leftover pointer goes with it, so nothing dangles at a row
    // that no longer exists if that person ever rejoins.
    expect(
      await t.run(
        async (ctx) => (await ctx.db.get(gone))?.sectionId ?? "unassigned",
      ),
    ).toBe("unassigned");
  });

  test("a non-admin member cannot rename or remove a seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Alheia",
      ramo: "escoteiro",
    });
    const member = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await expect(
      as(t, member).mutation(api.groups.renameSection, {
        sectionId,
        name: "Tropa Tomada",
      }),
    ).rejects.toThrow("Apenas administradores");
    await expect(
      as(t, member).mutation(api.groups.removeSection, { sectionId }),
    ).rejects.toThrow("Apenas administradores");
    expect(await t.run(async (ctx) => ctx.db.get(sectionId))).not.toBeNull();
  });

  test("an unauthenticated caller cannot add a seção", async () => {
    const t = convexTest(schema, modules);
    await seedGroup(t);
    await expect(
      t.mutation(api.groups.addSection, { name: "Tropa", ramo: "escoteiro" }),
    ).rejects.toThrow("Não autenticado");
  });

  test("listSections is empty for a user in no group", async () => {
    const t = convexTest(schema, modules);
    const outsider = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    expect(await as(t, outsider).query(api.groups.listSections, {})).toEqual([]);
  });

  test("createGroup turns the unit names it is given into seções", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, userId).mutation(api.groups.createGroup, {
      name: "G",
      number: "42",
      ramoNames: { lobinho: "Alcateia Só", escoteiro: "Tropa Só" },
    });
    const sections = await as(t, userId).query(api.groups.listSections, {});
    expect(
      sections.map((s) => `${s.ramo}:${s.name}`).sort(),
    ).toEqual(["escoteiro:Tropa Só", "lobinho:Alcateia Só"]);
  });
});

/**
 * `users.sectionId` points at a row owned by one grupo, so every path that
 * detaches a member from their grupo — or stops them being an escoteiro — has
 * to drop it. Otherwise the pointer follows them into the next grupo and
 * silently re-blocks `removeSection` if they ever come back.
 */
describe("seções: sectionId is dropped when a member leaves the grupo", () => {
  async function seedAssignedEscoteiro(t: ReturnType<typeof convexTest>) {
    const { adminId, groupId } = await seedGroup(t);
    const sectionId = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Origem",
      ramo: "escoteiro",
    });
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      sectionId,
    });
    return { adminId, groupId, sectionId, escoteiro };
  }

  // Checked inside `t.run`: an undefined field would come back as null across
  // the convex-test boundary, which reads as "still set" to `toBeUndefined`.
  const sectionOf = (t: ReturnType<typeof convexTest>, userId: Id<"users">) =>
    t.run(async (ctx) => (await ctx.db.get(userId))?.sectionId ?? "unassigned");

  test("leaveGroup drops it", async () => {
    const t = convexTest(schema, modules);
    const { escoteiro } = await seedAssignedEscoteiro(t);
    await as(t, escoteiro).mutation(api.groups.leaveGroup, {});
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });

  test("banMember drops it", async () => {
    const t = convexTest(schema, modules);
    const { adminId, escoteiro } = await seedAssignedEscoteiro(t);
    await as(t, adminId).mutation(api.groups.banMember, { userId: escoteiro });
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });

  test("rejectMembership drops it", async () => {
    const t = convexTest(schema, modules);
    const { adminId, escoteiro } = await seedAssignedEscoteiro(t);
    await t.run(async (ctx) =>
      ctx.db.patch(escoteiro, { membershipStatus: "pending" }),
    );
    await as(t, adminId).mutation(api.groups.rejectMembership, {
      userId: escoteiro,
    });
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });

  test("joining another grupo drops it, so the old seção can be removed", async () => {
    const t = convexTest(schema, modules);
    const { adminId, sectionId, escoteiro } = await seedAssignedEscoteiro(t);
    const otherAdmin = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, otherAdmin).mutation(api.groups.createGroup, {
      name: "Grupo B",
      number: "200",
    });
    const other = await t.run(async (ctx) => ctx.db.get(otherAdmin));
    const otherGroup = await t.run(async (ctx) => ctx.db.get(other!.groupId!));

    await as(t, escoteiro).mutation(api.groups.joinGroup, {
      password: otherGroup!.password,
    });
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
    // The seção they left behind is now genuinely empty.
    await as(t, adminId).mutation(api.groups.removeSection, { sectionId });
    expect(await t.run(async (ctx) => ctx.db.get(sectionId))).toBeNull();
  });

  test("becoming an escotista drops it — seções hold escoteiros", async () => {
    const t = convexTest(schema, modules);
    const { adminId, escoteiro } = await seedAssignedEscoteiro(t);
    await as(t, adminId).mutation(api.groups.changeMemberRole, {
      userId: escoteiro,
      role: "escotista",
    });
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });
});

describe("seções: atribuir um escoteiro a uma seção", () => {
  async function seedGrupoComSecoes(t: ReturnType<typeof convexTest>) {
    const { adminId, groupId } = await seedGroup(t);
    const tropa = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Norte",
      ramo: "escoteiro",
    });
    const alcateia = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Alcateia Sul",
      ramo: "lobinho",
    });
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    return { adminId, groupId, tropa, alcateia, escoteiro };
  }

  // Checked inside `t.run`: an undefined field comes back as null across the
  // convex-test boundary, which reads as "still set" to `toBeUndefined`.
  const sectionOf = (t: ReturnType<typeof convexTest>, userId: Id<"users">) =>
    t.run(async (ctx) => (await ctx.db.get(userId))?.sectionId ?? "unassigned");

  test("an admin places an escoteiro in a seção of their own ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa, escoteiro } = await seedGrupoComSecoes(t);
    await as(t, adminId).mutation(api.groups.setMemberSection, {
      userId: escoteiro,
      sectionId: tropa,
    });
    expect(await sectionOf(t, escoteiro)).toBe(tropa);
    const members = await as(t, adminId).query(api.groups.getGroupMembers, {});
    expect(members.find((m) => m._id === escoteiro)?.sectionId).toBe(tropa);
  });

  // The decision this ticket pins: a seção whose ramo differs from the
  // escoteiro's own ramo is REFUSED, not silently accepted or reconciled.
  test("a seção of another ramo is refused", async () => {
    const t = convexTest(schema, modules);
    const { adminId, alcateia, escoteiro } = await seedGrupoComSecoes(t);
    await expect(
      as(t, adminId).mutation(api.groups.setMemberSection, {
        userId: escoteiro,
        sectionId: alcateia,
      }),
    ).rejects.toThrow("outro ramo");
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });

  test("an escoteiro with no ramo cannot be placed in any seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId, tropa } = await seedGrupoComSecoes(t);
    const ramoless = await insertUser(t, {
      role: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, adminId).mutation(api.groups.setMemberSection, {
        userId: ramoless,
        sectionId: tropa,
      }),
    ).rejects.toThrow("ramo do escoteiro");
  });

  test("passing null takes the escoteiro out of their seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa, escoteiro } = await seedGrupoComSecoes(t);
    await as(t, adminId).mutation(api.groups.setMemberSection, {
      userId: escoteiro,
      sectionId: tropa,
    });
    await as(t, adminId).mutation(api.groups.setMemberSection, {
      userId: escoteiro,
      sectionId: null,
    });
    expect(await sectionOf(t, escoteiro)).toBe("unassigned");
  });

  test("only escoteiros belong to a seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId, tropa } = await seedGrupoComSecoes(t);
    const outro = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, adminId).mutation(api.groups.setMemberSection, {
        userId: outro,
        sectionId: tropa,
      }),
    ).rejects.toThrow("Apenas escoteiros");
  });

  test("a non-admin escotista cannot place an escoteiro", async () => {
    const t = convexTest(schema, modules);
    const { groupId, tropa, escoteiro } = await seedGrupoComSecoes(t);
    const member = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await expect(
      as(t, member).mutation(api.groups.setMemberSection, {
        userId: escoteiro,
        sectionId: tropa,
      }),
    ).rejects.toThrow("Apenas administradores");
  });

  test("a seção of another grupo is refused", async () => {
    const t = convexTest(schema, modules);
    const { adminId, escoteiro } = await seedGrupoComSecoes(t);
    const otherAdmin = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, otherAdmin).mutation(api.groups.createGroup, {
      name: "Grupo B",
      number: "200",
    });
    const foreign = await as(t, otherAdmin).mutation(api.groups.addSection, {
      name: "Tropa Alheia",
      ramo: "escoteiro",
    });
    await expect(
      as(t, adminId).mutation(api.groups.setMemberSection, {
        userId: escoteiro,
        sectionId: foreign,
      }),
    ).rejects.toThrow("Seção não pertence ao seu grupo");
  });

  test("advancing ramo leaves the old ramo's seção behind", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId, alcateia } = await seedGrupoComSecoes(t);
    const lobinho = await insertUser(t, {
      role: "escoteiro",
      ramo: "lobinho",
      groupId,
      membershipStatus: "approved",
    });
    await as(t, adminId).mutation(api.groups.setMemberSection, {
      userId: lobinho,
      sectionId: alcateia,
    });
    await as(t, adminId).mutation(api.groups.setMemberRamo, {
      userId: lobinho,
      ramo: "escoteiro",
    });
    expect(await sectionOf(t, lobinho)).toBe("unassigned");
    // ...and the emptied seção can now be removed.
    await as(t, adminId).mutation(api.groups.removeSection, {
      sectionId: alcateia,
    });
    expect(await t.run(async (ctx) => ctx.db.get(alcateia))).toBeNull();
  });

  test("a ramo change that keeps the ramo keeps the seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa, escoteiro } = await seedGrupoComSecoes(t);
    await as(t, adminId).mutation(api.groups.setMemberSection, {
      userId: escoteiro,
      sectionId: tropa,
    });
    // Same ramo: a no-op change must not throw the escoteiro out of the seção.
    await as(t, adminId).mutation(api.groups.setMemberRamo, {
      userId: escoteiro,
      ramo: "escoteiro",
    });
    expect(await sectionOf(t, escoteiro)).toBe(tropa);
  });
});

describe("seções: a seção observada pelo escotista", () => {
  async function seedObservable(t: ReturnType<typeof convexTest>) {
    const { adminId, groupId } = await seedGroup(t);
    const tropa = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Tropa Norte",
      ramo: "escoteiro",
    });
    const alcateia = await as(t, adminId).mutation(api.groups.addSection, {
      name: "Alcateia Sul",
      ramo: "lobinho",
    });
    return { adminId, groupId, tropa, alcateia };
  }

  const observedOf = (t: ReturnType<typeof convexTest>, userId: Id<"users">) =>
    t.run(
      async (ctx) => (await ctx.db.get(userId))?.observedSectionId ?? "todas",
    );

  test("the choice is stored on the escotista, so it survives a reload", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa } = await seedObservable(t);
    await as(t, adminId).mutation(api.groups.setObservedSection, {
      sectionId: tropa,
    });
    expect(await observedOf(t, adminId)).toBe(tropa);
    // A fresh read (what a reload does) still reports the same seção.
    const stats = await as(t, adminId).query(api.approvals.getGroupStats, {});
    expect(stats?.observedSection).toEqual({
      _id: tropa,
      name: "Tropa Norte",
      ramo: "escoteiro",
    });
  });

  test("null goes back to observing the whole grupo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa } = await seedObservable(t);
    await as(t, adminId).mutation(api.groups.setObservedSection, {
      sectionId: tropa,
    });
    await as(t, adminId).mutation(api.groups.setObservedSection, {
      sectionId: null,
    });
    expect(await observedOf(t, adminId)).toBe("todas");
    const stats = await as(t, adminId).query(api.approvals.getGroupStats, {});
    expect(stats?.observedSection).toBeNull();
  });

  test("a seção of another grupo cannot be observed", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedObservable(t);
    const otherAdmin = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, otherAdmin).mutation(api.groups.createGroup, {
      name: "Grupo B",
      number: "200",
    });
    const foreign = await as(t, otherAdmin).mutation(api.groups.addSection, {
      name: "Tropa Alheia",
      ramo: "escoteiro",
    });
    await expect(
      as(t, adminId).mutation(api.groups.setObservedSection, {
        sectionId: foreign,
      }),
    ).rejects.toThrow("Seção não pertence ao seu grupo");
  });

  // Observing narrows; it is never a way around visibilidade de ramo.
  test("a non-admin escotista cannot observe a ramo they do not accompany", async () => {
    const t = convexTest(schema, modules);
    const { groupId, tropa, alcateia } = await seedObservable(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escotista).mutation(api.groups.setObservedSection, {
        sectionId: alcateia,
      }),
    ).rejects.toThrow("Você não acompanha esse ramo");
    await as(t, escotista).mutation(api.groups.setObservedSection, {
      sectionId: tropa,
    });
    expect(await observedOf(t, escotista)).toBe(tropa);
  });

  test("an admin may observe any ramo's seção", async () => {
    const t = convexTest(schema, modules);
    const { adminId, alcateia } = await seedObservable(t);
    await as(t, adminId).mutation(api.groups.setObservedSection, {
      sectionId: alcateia,
    });
    expect(await observedOf(t, adminId)).toBe(alcateia);
  });

  test("an escoteiro cannot choose an observed seção", async () => {
    const t = convexTest(schema, modules);
    const { groupId, tropa } = await seedObservable(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escoteiro).mutation(api.groups.setObservedSection, {
        sectionId: tropa,
      }),
    ).rejects.toThrow("Apenas escotistas");
  });

  test("an unauthenticated caller cannot observe or assign a seção", async () => {
    const t = convexTest(schema, modules);
    const { groupId, tropa } = await seedObservable(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      t.mutation(api.groups.setObservedSection, { sectionId: tropa }),
    ).rejects.toThrow("Não autenticado");
    await expect(
      t.mutation(api.groups.setMemberSection, {
        userId: escoteiro,
        sectionId: tropa,
      }),
    ).rejects.toThrow("Não autenticado");
  });

  test("leaving the grupo drops the observed seção", async () => {
    const t = convexTest(schema, modules);
    const { groupId, tropa } = await seedObservable(t);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
    });
    await as(t, escotista).mutation(api.groups.setObservedSection, {
      sectionId: tropa,
    });
    await as(t, escotista).mutation(api.groups.leaveGroup, {});
    expect(await observedOf(t, escotista)).toBe("todas");
  });

  // Nothing cleans the pointer up when the seção goes away, so the read side
  // has to: a dangling observedSectionId means "todas as seções" again.
  test("removing the observed seção falls back to the whole grupo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, tropa } = await seedObservable(t);
    await as(t, adminId).mutation(api.groups.setObservedSection, {
      sectionId: tropa,
    });
    await as(t, adminId).mutation(api.groups.removeSection, {
      sectionId: tropa,
    });
    const stats = await as(t, adminId).query(api.approvals.getGroupStats, {});
    expect(stats?.observedSection).toBeNull();
  });
});

describe("backfillSectionsForGroup (migration body)", () => {
  test("turns every ramoNames entry into one seção of that ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t, {
      ramoNames: { lobinho: "Alcateia Potiguara", pioneiro: "Clã Highlander" },
    });
    await t.run(async (ctx) => {
      const group = await ctx.db.get(groupId);
      await backfillSectionsForGroup(ctx, group!);
    });
    const sections = await as(t, adminId).query(api.groups.listSections, {});
    expect(sections.map((s) => `${s.ramo}:${s.name}`).sort()).toEqual([
      "lobinho:Alcateia Potiguara",
      "pioneiro:Clã Highlander",
    ]);
  });

  test("is a no-op the second time (the component may resume a batch)", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t, {
      ramoNames: { escoteiro: "Tropa Índio Velho" },
    });
    await t.run(async (ctx) => {
      const group = await ctx.db.get(groupId);
      await backfillSectionsForGroup(ctx, group!);
      await backfillSectionsForGroup(ctx, group!);
    });
    const sections = await as(t, adminId).query(api.groups.listSections, {});
    expect(sections.map((s) => s.name)).toEqual(["Tropa Índio Velho"]);
  });

  test("leaves a grupo with no unit names, or a deleted one, alone", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    await t.run(async (ctx) => {
      const group = await ctx.db.get(groupId);
      await backfillSectionsForGroup(ctx, group!);
    });
    expect(await as(t, adminId).query(api.groups.listSections, {})).toEqual([]);

    const { groupId: deletedId } = await seedGroup(t, {
      ramoNames: { senior: "Tropa Sênior" },
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(deletedId, { deletedAt: 1 });
      const group = await ctx.db.get(deletedId);
      await backfillSectionsForGroup(ctx, group!);
      const sections = await ctx.db
        .query("sections")
        .withIndex("by_groupId", (q) => q.eq("groupId", deletedId))
        .collect();
      expect(sections).toEqual([]);
    });
  });
});
