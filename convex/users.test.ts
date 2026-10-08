/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import { shouldAutoStartTour } from "../src/lib/tour";
import { as, insertUser, newTest, type TestConvex } from "./fixtures.testkit";

/** Seed a group owned by a fresh admin escotista; returns ids. */
async function seedGroup(
  t: TestConvex,
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

describe("viewer", () => {
  test("returns null when unauthenticated", async () => {
    const t = newTest();
    const res = await t.query(api.users.viewer, {});
    expect(res).toBeNull();
  });

  test("returns the user doc when authenticated", async () => {
    const t = newTest();
    const userId = await insertUser(t, { name: "Alice" });
    const res = await as(t, userId).query(api.users.viewer, {});
    expect(res?._id).toBe(userId);
    expect(res?.name).toBe("Alice");
  });
});

describe("updateName", () => {
  test("trims and patches the name", async () => {
    const t = newTest();
    const userId = await insertUser(t, { name: "Old" });
    await as(t, userId).mutation(api.users.updateName, { name: "  New Name  " });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.name).toBe("New Name");
  });

  test("throws for empty / whitespace name", async () => {
    const t = newTest();
    const userId = await insertUser(t, {});
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "   " }),
    ).rejects.toThrow("Nome não pode ser vazio");
  });

  test("throws for name longer than 100 chars", async () => {
    const t = newTest();
    const userId = await insertUser(t, {});
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "x".repeat(101) }),
    ).rejects.toThrow("Nome muito longo");
  });

  test("throws when unauthenticated", async () => {
    const t = newTest();
    await expect(
      t.mutation(api.users.updateName, { name: "x" }),
    ).rejects.toThrow("Não autenticado");
  });
});

describe("toggleFavoriteEscoteiro", () => {
  test("throws unless caller is an escotista", async () => {
    const t = newTest();
    const { groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    const target = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, escoteiro).mutation(api.users.toggleFavoriteEscoteiro, {
        escoteiroId: target,
      }),
    ).rejects.toThrow("Apenas escotistas podem favoritar");
  });

  test("throws when target is missing or not an escoteiro", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const otherEscotista = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
      groupId,
      membershipStatus: "approved",
    });
    await expect(
      as(t, adminId).mutation(api.users.toggleFavoriteEscoteiro, {
        escoteiroId: otherEscotista,
      }),
    ).rejects.toThrow("Escoteiro não encontrado");
  });

  test("throws when target is not in the caller's group", async () => {
    const t = newTest();
    const { adminId } = await seedGroup(t);
    // escoteiro in a different (no) group.
    const outsider = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
    });
    await expect(
      as(t, adminId).mutation(api.users.toggleFavoriteEscoteiro, {
        escoteiroId: outsider,
      }),
    ).rejects.toThrow("não pertence ao seu grupo");
  });

  test("toggles add then remove", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escoteiro = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
    });

    // First toggle adds.
    await as(t, adminId).mutation(api.users.toggleFavoriteEscoteiro, {
      escoteiroId: escoteiro,
    });
    let admin = await t.run(async (ctx) => ctx.db.get(adminId));
    expect(admin?.favoriteEscoteiroIds).toEqual([escoteiro]);

    // Second toggle removes.
    await as(t, adminId).mutation(api.users.toggleFavoriteEscoteiro, {
      escoteiroId: escoteiro,
    });
    admin = await t.run(async (ctx) => ctx.db.get(adminId));
    expect(admin?.favoriteEscoteiroIds).toEqual([]);
  });
});

describe("markTourSeen", () => {
  test("stamps tourSeenAt on the caller", async () => {
    const t = newTest();
    const userId = await insertUser(t, { name: "Alice" });
    await as(t, userId).mutation(api.users.markTourSeen, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(typeof user?.tourSeenAt).toBe("number");
  });

  test("rejects an unauthenticated caller", async () => {
    const t = newTest();
    await expect(t.mutation(api.users.markTourSeen, {})).rejects.toThrow();
  });

  test("viewer reflects it, so the tour stops auto-opening for that member only", async () => {
    const t = newTest();
    const member = { role: "escoteiro", ramo: "escoteiro", onboardingComplete: true } as const;
    const alice = await insertUser(t, { name: "Alice", ...member });
    const bruno = await insertUser(t, { name: "Bruno", ...member });
    const autoStarts = async (id: typeof alice) =>
      shouldAutoStartTour(await as(t, id).query(api.users.viewer, {}), "/");

    expect(await autoStarts(alice)).toBe(true);
    await as(t, alice).mutation(api.users.markTourSeen, {});
    expect(await autoStarts(alice)).toBe(false);
    // Per member: another account in the same grupo still gets the tour.
    expect(await autoStarts(bruno)).toBe(true);
  });
});
