/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import { as, insertUser, newTest } from "./fixtures.testkit";

describe("getAuthenticatedUser", () => {
  test("unauthenticated mutation throws Não autenticado", async () => {
    const t = newTest();
    await expect(
      t.mutation(api.users.updateName, { name: "x" }),
    ).rejects.toThrow("Não autenticado");
  });

  test("banned user is locked out", async () => {
    const t = newTest();
    const userId = await insertUser(t, { name: "Banned", bannedAt: 123 });
    await expect(
      as(t, userId).mutation(api.users.updateName, { name: "New" }),
    ).rejects.toThrow("Você foi banido do grupo");
  });
});

describe("maybeBackfillUser (via ensureBackfill)", () => {
  test("groupId set + membershipStatus undefined => approved", async () => {
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
