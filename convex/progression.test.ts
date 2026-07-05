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
        ramo: "escoteiro",
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
        ramo: "escoteiro",
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
        ramo: "escoteiro",
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
          ramo: "escoteiro",
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

describe("toggleIrrItem", () => {
  test("invalid itemId throws", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleIrrItem, {
        itemId: "irr_invalido",
      }),
    ).rejects.toThrow("ID de item inválido");
  });

  test("escoteiro (self) inserts status=pending stamped with ramo; escotista approved; toggle deletes", async () => {
    const t = convexTest(schema, modules);
    const escoteiro = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, escoteiro).mutation(api.progression.toggleIrrItem, {
      itemId: "irr_promessa",
    });
    let rows = await t.run(async (ctx) =>
      ctx.db
        .query("irrCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");
    // Writes stamp the acting escoteiro's ramo.
    expect(rows[0]!.ramo).toBe("escoteiro");

    // Toggle again deletes (pending, self).
    await as(t, escoteiro).mutation(api.progression.toggleIrrItem, {
      itemId: "irr_promessa",
    });
    rows = await t.run(async (ctx) =>
      ctx.db
        .query("irrCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiro))
        .collect(),
    );
    expect(rows).toHaveLength(0);

    // Escotista self → approved.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, escotista).mutation(api.progression.toggleIrrItem, {
      itemId: "irr_blocos",
    });
    const escRows = await t.run(async (ctx) =>
      ctx.db
        .query("irrCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escotista))
        .collect(),
    );
    expect(escRows[0]!.status).toBe("approved");
  });

  test("reads are ramo-scoped: only the current ramo's items return; other ramo retained", async () => {
    const t = convexTest(schema, modules);
    const user = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    // Seed the same user with recognition rows under TWO ramos.
    await t.run(async (ctx) => {
      await ctx.db.insert("irrCompletions", {
        userId: user,
        ramo: "escoteiro",
        itemId: "irr_promessa",
        completedAt: 1,
        status: "approved",
      });
      await ctx.db.insert("irrCompletions", {
        userId: user,
        ramo: "lobinho",
        itemId: "irr_jornada",
        completedAt: 1,
        status: "approved",
      });
    });

    // Current ramo escoteiro → only the escoteiro row.
    let res = await as(t, user).query(api.progression.getMyCompletions, {});
    expect(res.irrItems.map((i) => i.itemId)).toEqual(["irr_promessa"]);

    // Switch to lobinho → only the lobinho row; the escoteiro row is retained
    // in the DB and reappears when switching back.
    await t.run(async (ctx) => ctx.db.patch(user, { ramo: "lobinho" }));
    res = await as(t, user).query(api.progression.getMyCompletions, {});
    expect(res.irrItems.map((i) => i.itemId)).toEqual(["irr_jornada"]);

    await t.run(async (ctx) => ctx.db.patch(user, { ramo: "escoteiro" }));
    res = await as(t, user).query(api.progression.getMyCompletions, {});
    expect(res.irrItems.map((i) => i.itemId)).toEqual(["irr_promessa"]);

    // Nothing was deleted across the switches — both rows still exist.
    const all = await t.run(async (ctx) =>
      ctx.db
        .query("irrCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", user))
        .collect(),
    );
    expect(all).toHaveLength(2);
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
      irrItems: [],
      earnedSpecialtyBlocoIds: [],
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
    expect(res.irrItems).toEqual([]);
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

  test("unstamped (undefined) membershipStatus caller gets results", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // Legacy escotista: membershipStatus was never stamped. Queries cannot
    // backfill, so the visibility rule itself must treat undefined as approved.
    const escotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
    });
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const res = await as(t, escotista).query(api.progression.getCompletionsForUser, {
      targetUserId: escoteiro,
    });
    expect(res.ramo).toBe("escoteiro");
  });

  test("same-grupo escotista target is readable regardless of ramo", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroup(t);
    // Caller accompanies only 'senior'; target is a fellow escotista with no
    // ramo at all — the ramo rule applies to escoteiro targets only.
    const caller = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      membershipStatus: "approved",
    });
    const fellow = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["lobinho"],
      groupId,
      membershipStatus: "approved",
    });
    const res = await as(t, caller).query(api.progression.getCompletionsForUser, {
      targetUserId: fellow,
    });
    expect(res.actions).toEqual([]);
  });

  test("banned escoteiro's completions are not readable", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      bannedAt: 123,
    });
    await expect(
      as(t, adminId).query(api.progression.getCompletionsForUser, {
        targetUserId: escoteiro,
      }),
    ).rejects.toThrow("banido");
  });
});

// ---------------------------------------------------------------------------
// Ramo-scoped especialidades & ações personalizadas (#37) — isolation,
// retention across a ramo change, and write-time ramo stamping.
// ---------------------------------------------------------------------------

describe("ramo-scoped completions (#37)", () => {
  test("reads return only the current ramo's especialidades and ações personalizadas", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    // Same user, same blocoId (blocoIds are shared across ramos) under two ramos.
    await t.run(async (ctx) => {
      await ctx.db.insert("specialtyCompletions", {
        userId, ramo: "escoteiro", blocoId: "meio-ambiente",
        specialtyName: "Esc", completedAt: 1, status: "approved",
      });
      await ctx.db.insert("specialtyCompletions", {
        userId, ramo: "lobinho", blocoId: "meio-ambiente",
        specialtyName: "Lob", completedAt: 1, status: "approved",
      });
      await ctx.db.insert("customActions", {
        userId, ramo: "escoteiro", blocoId: "meio-ambiente",
        text: "esc custom", completed: true, createdAt: 1, status: "approved",
      });
      await ctx.db.insert("customActions", {
        userId, ramo: "lobinho", blocoId: "meio-ambiente",
        text: "lob custom", completed: true, createdAt: 1, status: "approved",
      });
    });

    const res = await as(t, userId).query(api.progression.getMyCompletions, {});
    expect(res.specialties.map((s) => s.specialtyName)).toEqual(["Esc"]);
    expect(res.customActions.map((c) => c.text)).toEqual(["esc custom"]);
  });

  test("prior ramo's rows are retained and reappear after switching ramo back", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) => {
      await ctx.db.insert("specialtyCompletions", {
        userId, ramo: "lobinho", blocoId: "meio-ambiente",
        specialtyName: "Lob", completedAt: 1, status: "approved",
      });
    });

    // As an escoteiro the lobinho row is hidden...
    const asEsc = await as(t, userId).query(api.progression.getMyCompletions, {});
    expect(asEsc.specialties).toEqual([]);

    // ...but retained in the DB, and visible again once the ramo is switched back.
    await t.run(async (ctx) => ctx.db.patch(userId, { ramo: "lobinho" }));
    const asLob = await as(t, userId).query(api.progression.getMyCompletions, {});
    expect(asLob.specialties.map((s) => s.specialtyName)).toEqual(["Lob"]);

    const total = await t.run(async (ctx) =>
      (await ctx.db.query("specialtyCompletions").collect()).length,
    );
    expect(total).toBe(1); // nothing was deleted on the ramo change
  });

  test("ações personalizadas are retained across a ramo change and reappear on switch back", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) => {
      await ctx.db.insert("customActions", {
        userId, ramo: "lobinho", blocoId: "meio-ambiente",
        text: "lob custom", completed: true, createdAt: 1, status: "approved",
      });
    });

    const asEsc = await as(t, userId).query(api.progression.getMyCompletions, {});
    expect(asEsc.customActions).toEqual([]);

    await t.run(async (ctx) => ctx.db.patch(userId, { ramo: "lobinho" }));
    const asLob = await as(t, userId).query(api.progression.getMyCompletions, {});
    expect(asLob.customActions.map((c) => c.text)).toEqual(["lob custom"]);

    const total = await t.run(async (ctx) =>
      (await ctx.db.query("customActions").collect()).length,
    );
    expect(total).toBe(1); // retained across the ramo change
  });

  test("a self-toggle stamps the acting escoteiro's ramo on the new row", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "lobinho" });
    await as(t, userId).mutation(api.progression.toggleSpecialty, {
      blocoId: "meio-ambiente",
      specialtyName: "Jardinagem",
    });
    const rows = await t.run(async (ctx) =>
      ctx.db.query("specialtyCompletions").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ramo).toBe("lobinho");
  });

  test("an escotista marking a target stamps the target's ramo", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    // Admin escotista sees all ramos; target is a lobinho.
    const target = await insertUser(t, {
      role: "escoteiro", ramo: "lobinho", groupId, membershipStatus: "approved",
    });
    await as(t, adminId).mutation(api.progression.addCustomAction, {
      blocoId: "meio-ambiente",
      text: "Plantar uma árvore",
      targetUserId: target,
    });
    const rows = await t.run(async (ctx) =>
      ctx.db.query("customActions").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ramo).toBe("lobinho");
  });

  test("the per-bloco custom-action cap counts only the current ramo", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    // 20 lobinho rows in the same bloco must not block an escoteiro insert.
    await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) {
        await ctx.db.insert("customActions", {
          userId, ramo: "lobinho", blocoId: "meio-ambiente",
          text: `lob ${i}`, completed: false, createdAt: 1,
        });
      }
    });
    await as(t, userId).mutation(api.progression.addCustomAction, {
      blocoId: "meio-ambiente",
      text: "escoteiro action",
    });
    const escRows = await t.run(async (ctx) =>
      (await ctx.db.query("customActions").collect()).filter(
        (r) => r.ramo === "escoteiro",
      ),
    );
    expect(escRows).toHaveLength(1);
  });
});
