/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Enumerate modules explicitly (Bun has no import.meta.glob).
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
  "./specialties.ts": () => import("./specialties"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: Partial<{
    name: string;
    role: "escoteiro" | "escotista";
    ramo: Ramo;
    escotistaRamos: Ramo[];
    groupId: Id<"groups">;
    isAdmin: boolean;
    membershipStatus: "pending" | "approved";
    onboardingComplete: boolean;
  }> = {},
): Promise<Id<"users">> {
  return t.run(async (ctx) => ctx.db.insert("users", { name: "U", ...fields }));
}

async function seedGroup(t: ReturnType<typeof convexTest>) {
  const escotistaId = await insertUser(t, {
    name: "Escotista",
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo",
      number: "1",
      password: "XYZ",
      createdBy: escotistaId,
      createdAt: 1,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(escotistaId, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    }),
  );
  const escoteiroId = await insertUser(t, {
    name: "Escoteiro",
    role: "escoteiro",
    ramo: "escoteiro",
    groupId,
    onboardingComplete: true,
    membershipStatus: "approved",
  });
  return { escotistaId, escoteiroId, groupId };
}

describe("toggleSpecialtyItem", () => {
  test("check → creates pending row", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.specialtyId).toBe("administracao");
    expect(rows[0]!.itemIndex).toBe(0);
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.ramoGroup).toBe("younger");
  });

  test("uncheck pending → deletes row", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    // Check
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });
    // Uncheck
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("uncheck approved item as escoteiro → throws", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Escoteiro checks
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    // Escotista approves
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
      completionId: rowId,
    });

    // Escoteiro tries to uncheck approved — should throw
    await expect(
      as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: 0,
      }),
    ).rejects.toThrow();
  });

  test("lobinho gets ramoGroup=younger", async () => {
    const t = convexTest(schema, modules);
    const escotistaId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["lobinho"],
      onboardingComplete: true,
    });
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "G",
        password: "A",
        createdBy: escotistaId,
        createdAt: 1,
      }),
    );
    await t.run(async (ctx) =>
      ctx.db.patch(escotistaId, {
        groupId,
        isAdmin: true,
        membershipStatus: "approved",
      }),
    );
    const lobinhoId = await insertUser(t, {
      role: "escoteiro",
      ramo: "lobinho",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    });

    await as(t, lobinhoId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 3,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", lobinhoId))
        .collect(),
    );
    expect(rows[0]!.ramoGroup).toBe("younger");
  });
});

describe("approveSpecialtyItem", () => {
  test("approve pending → status=approved", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 1,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;

    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
      completionId: rowId,
    });

    const updated = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(updated!.status).toBe("approved");
    expect(updated!.approvedBy).toBe(escotistaId);
  });

  test("approve non-pending → throws", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Insert already-approved row directly
    const rowId = await t.run(async (ctx) =>
      ctx.db.insert("specialtyItemCompletions", {
        userId: escoteiroId,
        ramoGroup: "younger",
        specialtyId: "administracao",
        itemIndex: 0,
        completedAt: Date.now(),
        status: "approved",
      }),
    );

    await expect(
      as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
        completionId: rowId,
      }),
    ).rejects.toThrow();
  });
});

describe("rejectSpecialtyItem", () => {
  test("reject pending → row deleted", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 2,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;

    await as(t, escotistaId).mutation(api.specialties.rejectSpecialtyItem, {
      completionId: rowId,
    });

    const after = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(after).toBeNull();
  });
});

describe("approveSpecialtyItems (bulk)", () => {
  test("approve multiple pending items → all approved", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Check 3 items
    for (const i of [0, 1, 2]) {
      await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: i,
      });
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(3);

    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItems, {
      escoteiroId,
      specialtyId: "administracao",
      ramoGroup: "younger",
      itemIds: rows.map((r) => r._id),
    });

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(after.every((r) => r.status === "approved")).toBe(true);
  });
});

describe("rejectSpecialtyItems (bulk)", () => {
  test("reject multiple pending items → all deleted", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    for (const i of [0, 1]) {
      await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "robotica",
        itemIndex: i,
      });
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );

    await as(t, escotistaId).mutation(api.specialties.rejectSpecialtyItems, {
      escoteiroId,
      specialtyId: "robotica",
      ramoGroup: "younger",
      itemIds: rows.map((r) => r._id),
    });

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(after).toHaveLength(0);
  });
});

describe("getMySpecialtyItems", () => {
  test("returns all items for current user", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 0,
    });
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 2,
    });

    const items = await as(t, escoteiroId).query(
      api.specialties.getMySpecialtyItems,
      {},
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.specialtyId === "yoga")).toBe(true);
  });

  test("returns [] for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const items = await t.query(api.specialties.getMySpecialtyItems, {});
    expect(items).toHaveLength(0);
  });
});
