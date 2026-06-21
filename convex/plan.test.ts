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

/** Directly insert a plannedItem row, bypassing validation/positioning logic. */
async function insertPlanned(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  itemKey: string,
  position: number,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("plannedItems", { userId, itemKey, position }),
  );
}

/** Read a single plannedItem row (by user + itemKey) for assertions. */
async function getPlanned(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  itemKey: string,
) {
  return await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("plannedItems")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    return rows.find((r) => r.itemKey === itemKey) ?? null;
  });
}

describe("getMyPlan", () => {
  test("returns [] for unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.plan.getMyPlan, {});
    expect(res).toEqual([]);
  });

  test("returns the user's planned items ordered by position ascending", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    // Insert out-of-order positions.
    await insertPlanned(t, userId, "custom:c", 2);
    await insertPlanned(t, userId, "custom:a", 0);
    await insertPlanned(t, userId, "custom:b", 1);

    const res = await as(t, userId).query(api.plan.getMyPlan, {});
    expect(res.map((r) => r.itemKey)).toEqual(["custom:a", "custom:b", "custom:c"]);
    expect(res.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  test("only returns the caller's own items", async () => {
    const t = convexTest(schema, modules);
    const me = await insertUser(t);
    const other = await insertUser(t);
    await insertPlanned(t, me, "custom:mine", 0);
    await insertPlanned(t, other, "custom:theirs", 0);

    const res = await as(t, me).query(api.plan.getMyPlan, {});
    expect(res.map((r) => r.itemKey)).toEqual(["custom:mine"]);
  });
});

describe("togglePlanned: key validation", () => {
  test("throws for keys failing ITEM_KEY_PATTERN", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, { itemKey: "garbage" }),
    ).rejects.toThrow("Chave de item inválida");

    // `action:` needs at least blocoId + type:index after the prefix.
    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, { itemKey: "action:onlytwo" }),
    ).rejects.toThrow("Chave de item inválida");

    // 3 segments before type:index exceeds the 1-2 allowed.
    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, {
        itemKey: "action:escoteiro:bloco:bad:0",
      }),
    ).rejects.toThrow("Chave de item inválida");
  });

  test("accepts valid keys (new 4-part action, legacy 3-part action, specialty, custom)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    const validKeys = [
      "action:escoteiro:aprendizagem-continua:fixed:0",
      "action:aprendizagem-continua:fixed:0",
      "specialty:aprendizagem-continua:Leitura",
      "custom:abc123",
    ];

    for (const itemKey of validKeys) {
      // Should not throw.
      await as(t, userId).mutation(api.plan.togglePlanned, { itemKey });
    }

    const res = await as(t, userId).query(api.plan.getMyPlan, {});
    expect(res.map((r) => r.itemKey).sort()).toEqual([...validKeys].sort());
  });
});

describe("togglePlanned: toggle behavior", () => {
  test("first toggle inserts at position 0 when plan empty; second toggle removes it", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const key = "action:escoteiro:aprendizagem-continua:fixed:0";

    await as(t, userId).mutation(api.plan.togglePlanned, { itemKey: key });
    let row = await getPlanned(t, userId, key);
    expect(row).not.toBeNull();
    expect(row?.position).toBe(0);

    // Toggling the same key again removes it (untoggle).
    await as(t, userId).mutation(api.plan.togglePlanned, { itemKey: key });
    row = await getPlanned(t, userId, key);
    expect(row).toBeNull();
  });

  test("positions increment: toggling key A then key B yields positions 0 then 1", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    const keyA = "custom:a";
    const keyB = "custom:b";

    await as(t, userId).mutation(api.plan.togglePlanned, { itemKey: keyA });
    await as(t, userId).mutation(api.plan.togglePlanned, { itemKey: keyB });

    const rowA = await getPlanned(t, userId, keyA);
    const rowB = await getPlanned(t, userId, keyB);
    expect(rowA?.position).toBe(0);
    expect(rowB?.position).toBe(1);
  });
});

describe("togglePlanned: MAX_PLANNED_ITEMS limit", () => {
  test("throws 'Limite de itens no plano atingido' once 500 items exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);

    // Bulk-insert 500 planned items directly.
    await t.run(async (ctx) => {
      for (let i = 0; i < 500; i++) {
        await ctx.db.insert("plannedItems", {
          userId,
          itemKey: `custom:limit${i}`,
          position: i,
        });
      }
    });

    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, { itemKey: "custom:overflow" }),
    ).rejects.toThrow("Limite de itens no plano atingido");
  });
});

describe("reorderPlan", () => {
  test("throws when the itemKey isn't planned for the user", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await expect(
      as(t, userId).mutation(api.plan.reorderPlan, {
        itemKey: "custom:missing",
        beforeItemKey: undefined,
        afterItemKey: undefined,
      }),
    ).rejects.toThrow("Item não está no plano");
  });

  test("with both before and after → midpoint position", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertPlanned(t, userId, "custom:before", 0);
    await insertPlanned(t, userId, "custom:target", 1);
    await insertPlanned(t, userId, "custom:after", 4);

    await as(t, userId).mutation(api.plan.reorderPlan, {
      itemKey: "custom:target",
      beforeItemKey: "custom:before",
      afterItemKey: "custom:after",
    });

    const target = await getPlanned(t, userId, "custom:target");
    // (0 + 4) / 2 = 2
    expect(target?.position).toBe(2);
  });

  test("with only before → before.position + 1", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertPlanned(t, userId, "custom:before", 5);
    await insertPlanned(t, userId, "custom:target", 0);

    await as(t, userId).mutation(api.plan.reorderPlan, {
      itemKey: "custom:target",
      beforeItemKey: "custom:before",
      afterItemKey: undefined,
    });

    const target = await getPlanned(t, userId, "custom:target");
    expect(target?.position).toBe(6);
  });

  test("with only after → after.position - 1", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertPlanned(t, userId, "custom:after", 5);
    await insertPlanned(t, userId, "custom:target", 0);

    await as(t, userId).mutation(api.plan.reorderPlan, {
      itemKey: "custom:target",
      beforeItemKey: undefined,
      afterItemKey: "custom:after",
    });

    const target = await getPlanned(t, userId, "custom:target");
    expect(target?.position).toBe(4);
  });

  test("with neither before nor after → throws 'Reordenação inválida'", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertPlanned(t, userId, "custom:target", 0);

    await expect(
      as(t, userId).mutation(api.plan.reorderPlan, {
        itemKey: "custom:target",
        beforeItemKey: undefined,
        afterItemKey: undefined,
      }),
    ).rejects.toThrow("Reordenação inválida");
  });

  // NOTE: possible bug — reorderPlan uses a fractional midpoint
  // ((before.position + after.position) / 2) and never normalizes positions.
  // Two neighbours one position apart (e.g. 0 and 1) yield 0.5, and the moved
  // row can collide with an existing row's position when before/after aren't
  // immediate neighbours of the target. This test pins the CURRENT observable
  // behavior: a midpoint that equals an unrelated row's position is written
  // as-is, producing duplicate positions (no uniqueness enforcement).
  test("midpoint can collide with an existing row's position (current behavior)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t);
    await insertPlanned(t, userId, "custom:before", 0);
    await insertPlanned(t, userId, "custom:mid", 2); // unrelated row sitting at 2
    await insertPlanned(t, userId, "custom:after", 4);
    await insertPlanned(t, userId, "custom:target", 10);

    await as(t, userId).mutation(api.plan.reorderPlan, {
      itemKey: "custom:target",
      beforeItemKey: "custom:before",
      afterItemKey: "custom:after",
    });

    const target = await getPlanned(t, userId, "custom:target");
    const mid = await getPlanned(t, userId, "custom:mid");
    // Midpoint (0+4)/2 = 2 collides with custom:mid which is also at 2.
    expect(target?.position).toBe(2);
    expect(mid?.position).toBe(2);
  });
});
