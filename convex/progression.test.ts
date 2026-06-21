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

// A valid action id per ACTION_ID_PATTERN: ramo:blocoId:type:index
const VALID_ACTION_ID = "escoteiro:aprendizagem-continua:fixed:0";

// ---------------------------------------------------------------------------

describe("toggleAction", () => {
  test("invalid actionId throws (auth runs first, so caller must be authed)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleAction, { actionId: "bad-id" }),
    ).rejects.toThrow("ID de ação inválido");
  });

  test("escoteiro (self) toggling an unset action inserts status=pending", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, escoteiro).mutation(api.progression.toggleAction, {
      actionId: VALID_ACTION_ID,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.actionId).toBe(VALID_ACTION_ID);
    expect(rows[0]!.approvedBy).toBeUndefined();
  });

  test("escotista (self) toggling inserts status=approved with no approvedBy", async () => {
    const t = convexTest(schema, modules);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, escotista).mutation(api.progression.toggleAction, {
      actionId: VALID_ACTION_ID,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escotista))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("approved");
    // NOTE: possible bug — escotista self-approval records status "approved"
    // but leaves approvedBy and approvedAt undefined (no approver recorded).
    expect(rows[0]!.approvedBy).toBeUndefined();
    expect(rows[0]!.approvedAt).toBeUndefined();
  });

  test("escoteiro toggling an existing PENDING row deletes it (untoggle)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escoteiro,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "pending",
      }),
    );
    await as(t, escoteiro).mutation(api.progression.toggleAction, {
      actionId: VALID_ACTION_ID,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("escoteiro toggling an existing APPROVED row throws (approval lock)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escoteiro,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "approved",
      }),
    );
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleAction, {
        actionId: VALID_ACTION_ID,
      }),
    ).rejects.toThrow("Apenas um escotista pode desfazer");
  });

  test("escotista toggling an existing APPROVED row deletes it (allowed)", async () => {
    const t = convexTest(schema, modules);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escotista,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "approved",
      }),
    );
    await as(t, escotista).mutation(api.progression.toggleAction, {
      actionId: VALID_ACTION_ID,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escotista))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("escotista with targetUserId patches a pending row to approved with approvedBy", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escoteiro,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "pending",
      }),
    );
    await as(t, adminId).mutation(api.progression.toggleAction, {
      actionId: VALID_ACTION_ID,
      targetUserId: escoteiro,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("approved");
    expect(rows[0]!.approvedBy).toBe(adminId);
    expect(rows[0]!.approvedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("toggleSpecialty", () => {
  const BLOCO = "vida-ao-ar-livre";
  const SPEC = "Acampador";

  test("invalid blocoId throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
        blocoId: "Invalid Bloco!",
        specialtyName: SPEC,
      }),
    ).rejects.toThrow("ID de bloco inválido");
  });

  test("empty specialtyName throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
        blocoId: BLOCO,
        specialtyName: "   ",
      }),
    ).rejects.toThrow("Nome de especialidade inválido");
  });

  test("specialtyName >200 chars throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
        blocoId: BLOCO,
        specialtyName: "x".repeat(201),
      }),
    ).rejects.toThrow("Nome de especialidade inválido");
  });

  test("escoteiro (self) inserts status=pending", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
      blocoId: BLOCO,
      specialtyName: SPEC,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.blocoId).toBe(BLOCO);
    expect(rows[0]!.specialtyName).toBe(SPEC);
  });

  test("escotista (self) inserts status=approved", async () => {
    const t = convexTest(schema, modules);
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, escotista).mutation(api.progression.toggleSpecialty, {
      blocoId: BLOCO,
      specialtyName: SPEC,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escotista))
        .collect(),
    );
    expect(rows[0]!.status).toBe("approved");
  });

  test("escoteiro toggling existing pending deletes it", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) =>
      ctx.db.insert("specialtyCompletions", {
        userId: escoteiro,
        blocoId: BLOCO,
        specialtyName: SPEC,
        completedAt: 1,
        status: "pending",
      }),
    );
    await as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
      blocoId: BLOCO,
      specialtyName: SPEC,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("escoteiro toggling existing approved throws (approval lock)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) =>
      ctx.db.insert("specialtyCompletions", {
        userId: escoteiro,
        blocoId: BLOCO,
        specialtyName: SPEC,
        completedAt: 1,
        status: "approved",
      }),
    );
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleSpecialty, {
        blocoId: BLOCO,
        specialtyName: SPEC,
      }),
    ).rejects.toThrow("Apenas um escotista pode desfazer");
  });

  test("escotista with targetUserId patches pending → approved with approvedBy", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await t.run(async (ctx) =>
      ctx.db.insert("specialtyCompletions", {
        userId: escoteiro,
        blocoId: BLOCO,
        specialtyName: SPEC,
        completedAt: 1,
        status: "pending",
      }),
    );
    await as(t, adminId).mutation(api.progression.toggleSpecialty, {
      blocoId: BLOCO,
      specialtyName: SPEC,
      targetUserId: escoteiro,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows[0]!.status).toBe("approved");
    expect(rows[0]!.approvedBy).toBe(adminId);
  });
});

// ---------------------------------------------------------------------------

describe("addCustomAction", () => {
  const BLOCO = "servir";

  test("invalid blocoId throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.addCustomAction, {
        blocoId: "Bad Bloco",
        text: "fazer algo",
      }),
    ).rejects.toThrow("ID de bloco inválido");
  });

  test("empty text throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.addCustomAction, {
        blocoId: BLOCO,
        text: "   ",
      }),
    ).rejects.toThrow("Texto vazio");
  });

  test("text >500 chars throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.addCustomAction, {
        blocoId: BLOCO,
        text: "x".repeat(501),
      }),
    ).rejects.toThrow("Texto muito longo");
  });

  test("enforces MAX_CUSTOM_ACTIONS_PER_BLOCO=20 (21st throws)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) {
        await ctx.db.insert("customActions", {
          userId: escoteiro,
          blocoId: BLOCO,
          text: `acao ${i}`,
          completed: false,
          createdAt: i,
        });
      }
    });
    await expect(
      as(t, escoteiro).mutation(api.progression.addCustomAction, {
        blocoId: BLOCO,
        text: "uma a mais",
      }),
    ).rejects.toThrow("Limite de ações personalizadas atingido");
  });

  test("returns inserted id; row has completed=false and no status", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const id = await as(t, escoteiro).mutation(api.progression.addCustomAction, {
      blocoId: BLOCO,
      text: "  minha ação  ",
    });
    expect(id).toBeDefined();
    const doc = await t.run(async (ctx) => ctx.db.get(id));
    expect(doc!.completed).toBe(false);
    expect(doc!.status).toBeUndefined();
    expect(doc!.text).toBe("minha ação"); // trimmed
  });
});

// ---------------------------------------------------------------------------

describe("toggleCustomAction", () => {
  const BLOCO = "servir";

  test("throws Não encontrado when doc.userId !== effectiveUserId (ownership)", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const other = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: owner,
        blocoId: BLOCO,
        text: "algo",
        completed: false,
        createdAt: 1,
      }),
    );
    await expect(
      as(t, other).mutation(api.progression.toggleCustomAction, {
        customActionId: customId,
      }),
    ).rejects.toThrow("Não encontrado");
  });

  test("toggling an incomplete one marks completed=true with status", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: escoteiro,
        blocoId: BLOCO,
        text: "algo",
        completed: false,
        createdAt: 1,
      }),
    );
    await as(t, escoteiro).mutation(api.progression.toggleCustomAction, {
      customActionId: customId,
    });
    const doc = await t.run(async (ctx) => ctx.db.get(customId));
    expect(doc!.completed).toBe(true);
    expect(doc!.status).toBe("pending");
  });

  test("escotista with targetUserId approves a completed+pending custom action", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: escoteiro,
        blocoId: BLOCO,
        text: "algo",
        completed: true,
        createdAt: 1,
        status: "pending",
      }),
    );
    await as(t, adminId).mutation(api.progression.toggleCustomAction, {
      customActionId: customId,
      targetUserId: escoteiro,
    });
    const doc = await t.run(async (ctx) => ctx.db.get(customId));
    expect(doc!.completed).toBe(true); // still completed; just approved
    expect(doc!.status).toBe("approved");
    expect(doc!.approvedBy).toBe(adminId);
  });

  test("escoteiro unchecking a completed+approved custom action hits approval lock", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: escoteiro,
        blocoId: BLOCO,
        text: "algo",
        completed: true,
        createdAt: 1,
        status: "approved",
      }),
    );
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleCustomAction, {
        customActionId: customId,
      }),
    ).rejects.toThrow("Apenas um escotista pode desfazer");
  });
});

// ---------------------------------------------------------------------------

describe("deleteCustomAction", () => {
  const BLOCO = "servir";

  test("deleting a completed+approved custom action as owner escoteiro hits approval lock", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: escoteiro,
        blocoId: BLOCO,
        text: "algo",
        completed: true,
        createdAt: 1,
        status: "approved",
      }),
    );
    await expect(
      as(t, escoteiro).mutation(api.progression.deleteCustomAction, {
        customActionId: customId,
      }),
    ).rejects.toThrow("Apenas um escotista pode desfazer");
    // Row still present.
    const doc = await t.run(async (ctx) => ctx.db.get(customId));
    expect(doc).not.toBeNull();
  });

  test("deleting an incomplete custom action succeeds (row gone)", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    const customId = await t.run(async (ctx) =>
      ctx.db.insert("customActions", {
        userId: escoteiro,
        blocoId: BLOCO,
        text: "algo",
        completed: false,
        createdAt: 1,
      }),
    );
    await as(t, escoteiro).mutation(api.progression.deleteCustomAction, {
      customActionId: customId,
    });
    const doc = await t.run(async (ctx) => ctx.db.get(customId));
    expect(doc).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("toggleLisDeOuroItem", () => {
  test("invalid itemId throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleLisDeOuroItem, {
        itemId: "lis_invalido",
      }),
    ).rejects.toThrow("ID de item inválido");
  });

  test("escoteiro (self) inserts status=pending; escotista approved; toggle deletes", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, escoteiro).mutation(api.progression.toggleLisDeOuroItem, {
      itemId: "lis_promessa",
    });
    let rows = await t.run(async (ctx) =>
      ctx.db
        .query("lisDeOuroCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");

    // Toggle again deletes (pending, self).
    await as(t, escoteiro).mutation(api.progression.toggleLisDeOuroItem, {
      itemId: "lis_promessa",
    });
    rows = await t.run(async (ctx) =>
      ctx.db
        .query("lisDeOuroCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(0);

    // Escotista self → approved.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, escotista).mutation(api.progression.toggleLisDeOuroItem, {
      itemId: "lis_blocos",
    });
    const escRows = await t.run(async (ctx) =>
      ctx.db
        .query("lisDeOuroCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escotista))
        .collect(),
    );
    expect(escRows[0]!.status).toBe("approved");
  });
});

// ---------------------------------------------------------------------------

describe("getMyCompletions", () => {
  test("unauthenticated returns the empty shape", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.progression.getMyCompletions, {});
    expect(res).toEqual({
      ramo: null,
      actions: [],
      specialties: [],
      customActions: [],
      lisDeOuroItems: [],
    });
  });

  test("authenticated returns the user's rows and ramo", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "senior" });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escoteiro,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "pending",
      }),
    );
    const res = await as(t, escoteiro).query(api.progression.getMyCompletions, {});
    expect(res.ramo).toBe("senior");
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0]!.actionId).toBe(VALID_ACTION_ID);
    expect(res.specialties).toEqual([]);
    expect(res.customActions).toEqual([]);
    expect(res.lisDeOuroItems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("getCompletionsForUser", () => {
  test("cross-group escotista is rejected", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    // Escotista in a DIFFERENT group.
    const otherGroupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Grupo B",
        number: "200",
        password: "BBBBBB",
        createdBy: escoteiro,
        createdAt: 1,
        ramoNames: {},
      }),
    );
    const outsider = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId: otherGroupId,
      isAdmin: true,
      membershipStatus: "approved",
    });
    await expect(
      as(t, outsider).query(api.progression.getCompletionsForUser, {
        targetUserId: escoteiro,
      }),
    ).rejects.toThrow("não pertence ao seu grupo");
  });

  test("same-group escotista gets the target's completions and ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escoteiro,
        actionId: VALID_ACTION_ID,
        completedAt: 1,
        status: "pending",
      }),
    );
    const res = await as(t, adminId).query(api.progression.getCompletionsForUser, {
      targetUserId: escoteiro,
    });
    expect(res.ramo).toBe("escoteiro");
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0]!.actionId).toBe(VALID_ACTION_ID);
  });
});
