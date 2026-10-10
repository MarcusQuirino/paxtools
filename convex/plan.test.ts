/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  addEscotista,
  addEscoteiro,
  as,
  insertUser,
  newTest,
  seedGrupo,
  type Ramo,
  type TestConvex,
} from "./fixtures.testkit";

/**
 * Directly insert a plannedItem row, bypassing validation/positioning logic.
 * Stamps `ramo: "escoteiro"` by default so the row is visible to the ramo-scoped
 * reads (#37) for a default (ramo-less → escoteiro) test user.
 */
async function insertPlanned(
  t: TestConvex,
  userId: Id<"users">,
  itemKey: string,
  position: number,
  ramo: Ramo = "escoteiro",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("plannedItems", { userId, ramo, itemKey, position }),
  );
}

/** Read a single plannedItem row (by user + itemKey) for assertions. */
async function getPlanned(
  t: TestConvex,
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
    const t = newTest();
    const res = await t.query(api.plan.getMyPlan, {});
    expect(res).toEqual([]);
  });

  test("returns the user's planned items ordered by position ascending", async () => {
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
    const userId = await insertUser(t);

    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, { itemKey: "garbage" }),
    ).rejects.toThrow("Chave de item inválida");

    // `especialidade:` takes a bare slug — no spaces/uppercase/extra segments.
    await expect(
      as(t, userId).mutation(api.plan.togglePlanned, {
        itemKey: "especialidade:Não Slug",
      }),
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

  test("accepts valid keys (new 4-part action, legacy 3-part action, specialty, especialidade, custom)", async () => {
    const t = newTest();
    const userId = await insertUser(t);

    const validKeys = [
      "action:escoteiro:aprendizagem-continua:fixed:0",
      "action:aprendizagem-continua:fixed:0",
      "specialty:aprendizagem-continua:Leitura",
      "especialidade:administracao",
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
    const userId = await insertUser(t);

    // Bulk-insert 500 planned items directly.
    await t.run(async (ctx) => {
      for (let i = 0; i < 500; i++) {
        await ctx.db.insert("plannedItems", {
          userId,
          ramo: "escoteiro",
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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

// ---------------------------------------------------------------------------
// Ramo-scoped plano (#37) — the plan is isolated to the current ramo, prior
// ramos are retained, and toggles stamp the acting user's ramo.
// ---------------------------------------------------------------------------

describe("ramo-scoped plano (#37)", () => {
  test("getMyPlan returns only the current ramo's planned items", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) => {
      await ctx.db.insert("plannedItems", {
        userId, ramo: "escoteiro", itemKey: "custom:esc1", position: 0,
      });
      await ctx.db.insert("plannedItems", {
        userId, ramo: "lobinho", itemKey: "custom:lob1", position: 0,
      });
    });

    const plan = await as(t, userId).query(api.plan.getMyPlan, {});
    expect(plan.map((p) => p.itemKey)).toEqual(["custom:esc1"]);

    // Switching ramo surfaces the other ramo's plan; nothing was deleted.
    await t.run(async (ctx) => ctx.db.patch(userId, { ramo: "lobinho" }));
    const lobPlan = await as(t, userId).query(api.plan.getMyPlan, {});
    expect(lobPlan.map((p) => p.itemKey)).toEqual(["custom:lob1"]);
    const total = await t.run(async (ctx) =>
      (await ctx.db.query("plannedItems").collect()).length,
    );
    expect(total).toBe(2);
  });

  test("togglePlanned stamps the acting user's ramo, and the same key in another ramo is independent", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "lobinho" });
    // A pre-existing escoteiro row with the SAME itemKey must not be toggled off.
    await t.run(async (ctx) => {
      await ctx.db.insert("plannedItems", {
        userId, ramo: "escoteiro", itemKey: "custom:shared", position: 0,
      });
    });

    await as(t, userId).mutation(api.plan.togglePlanned, {
      itemKey: "custom:shared",
    });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("plannedItems").collect(),
    );
    // The lobinho toggle added a new lobinho row; the escoteiro row is untouched.
    expect(rows).toHaveLength(2);
    const byRamo = Object.fromEntries(rows.map((r) => [r.ramo, r.itemKey]));
    expect(byRamo).toEqual({ escoteiro: "custom:shared", lobinho: "custom:shared" });
  });
});

describe("getPlanForUser", () => {
  test("escotista of the escoteiro's ramo reads their current-ramo plan in order", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["escoteiro"]);
    const escoteiro = await addEscoteiro(t, groupId, "escoteiro");
    await insertPlanned(t, escoteiro, "custom:b", 1);
    await insertPlanned(t, escoteiro, "custom:a", 0);
    await insertPlanned(t, escoteiro, "custom:old", 0, "lobinho");

    const plan = await as(t, escotista).query(api.plan.getPlanForUser, {
      targetUserId: escoteiro,
    });
    expect(plan.map((p) => p.itemKey)).toEqual(["custom:a", "custom:b"]);
  });

  test("escotista of another ramo is denied (visibilidade de ramo)", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["senior"]);
    const escoteiro = await addEscoteiro(t, groupId, "escoteiro");
    await insertPlanned(t, escoteiro, "custom:a", 0);

    await expect(
      as(t, escotista).query(api.plan.getPlanForUser, { targetUserId: escoteiro }),
    ).rejects.toThrow();
  });

  test("an escoteiro cannot read another escoteiro's plan", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const peer = await addEscoteiro(t, groupId, "escoteiro");
    const escoteiro = await addEscoteiro(t, groupId, "escoteiro");
    await insertPlanned(t, escoteiro, "custom:a", 0);

    await expect(
      as(t, peer).query(api.plan.getPlanForUser, { targetUserId: escoteiro }),
    ).rejects.toThrow();
  });
});
