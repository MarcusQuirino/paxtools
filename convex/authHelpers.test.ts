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

describe("getAuthenticatedUser", () => {
  test("unauthenticated mutation throws Não autenticado", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.updateName, { name: "x" }),
    ).rejects.toThrow("Não autenticado");
  });

  test("banned user is locked out", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { name: "Banned", bannedAt: 123 });
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "New" }),
    ).rejects.toThrow("Você foi banido do grupo");
  });
});

describe("maybeBackfillUser (via ensureBackfill)", () => {
  test("groupId set + membershipStatus undefined => approved", async () => {
    const t = convexTest(schema, modules);
    // Create a group then attach the user to it without a membershipStatus.
    const ownerId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "G",
        number: "1",
        password: "AAAAAA",
        createdBy: ownerId,
        createdAt: 1,
      }),
    );
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await t.run(async (ctx) => ctx.db.patch(userId, { groupId }));

    await as(t, userId).mutation(api.groups.ensureBackfill, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.membershipStatus).toBe("approved");
  });

  test("group creator with isAdmin undefined => isAdmin true", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    // Group whose createdBy is the user; user.isAdmin left undefined.
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "G",
        number: "1",
        password: "AAAAAA",
        createdBy: userId,
        createdAt: 1,
      }),
    );
    await t.run(async (ctx) => ctx.db.patch(userId, { groupId }));

    await as(t, userId).mutation(api.groups.ensureBackfill, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.isAdmin).toBe(true);
  });
});

describe("assertAdmin legacy createdBy fallback", () => {
  test("non-flagged creator can still perform admin action", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "Old Name",
        number: "1",
        password: "AAAAAA",
        createdBy: userId,
        createdAt: 1,
      }),
    );
    // groupId set on the user, isAdmin left undefined.
    await t.run(async (ctx) => ctx.db.patch(userId, { groupId }));

    // updateGroup is a mutation, so getAuthenticatedUser -> maybeBackfillUser
    // sets isAdmin=true for the creator BEFORE assertAdmin runs. The action
    // succeeds either way; pin the user-facing behavior (legacy creator can
    // update the group) regardless of which path enforces it.
    // NOTE: possible bug — assertAdmin's legacy `createdBy` fallback (the
    // `if (!caller.isAdmin)` branch) is effectively dead code for any mutation:
    // backfill pre-empts it with the same createdBy/groupId conditions, so the
    // branch never executes on a mutation. (It can still matter on queries,
    // which don't run backfill.)
    await as(t, userId).mutation(api.groups.updateGroup, { name: " Renamed " });
    const group = await t.run(async (ctx) => ctx.db.get(groupId));
    expect(group?.name).toBe("Renamed");
  });
});
