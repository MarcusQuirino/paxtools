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

describe("viewer", () => {
  test("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.users.viewer, {});
    expect(res).toBeNull();
  });

  test("returns the user doc when authenticated", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { name: "Alice" });
    const res = await as(t, userId).query(api.users.viewer, {});
    expect(res?._id).toBe(userId);
    expect(res?.name).toBe("Alice");
  });
});

describe("updateName", () => {
  test("trims and patches the name", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { name: "Old" });
    await as(t, userId).mutation(api.users.updateName, { name: "  New Name  " });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.name).toBe("New Name");
  });

  test("throws for empty / whitespace name", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {});
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "   " }),
    ).rejects.toThrow("Nome não pode ser vazio");
  });

  test("throws for name longer than 100 chars", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {});
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "x".repeat(101) }),
    ).rejects.toThrow("Nome muito longo");
  });

  test("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.updateName, { name: "x" }),
    ).rejects.toThrow("Não autenticado");
  });
});

describe("toggleFavoriteEscoteiro", () => {
  test("throws unless caller is an escotista", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
