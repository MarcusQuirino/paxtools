/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  addEscoteiro,
  addEscotista,
  as,
  newTest,
  seedGrupo,
  type TestConvex,
} from "./fixtures.testkit";
import {
  explainWeakPassword,
  generateTemporaryPassword,
  normalizeScoutId,
} from "./lib/managedAccounts";

async function createKid(
  t: TestConvex,
  callerId: Id<"users">,
  scoutId = "123456",
  ramo: "escoteiro" | "lobinho" = "escoteiro",
) {
  return as(t, callerId).action(api.managedAccounts.createManagedMember, {
    name: "Joãozinho",
    scoutId,
    role: "escoteiro",
    ramo,
  });
}

/** The member picks their own password, leaving the forced-change state. */
async function chooseOwnPassword(
  t: TestConvex,
  userId: Id<"users">,
  password = "minhaSenha!",
) {
  await as(t, userId).action(api.managedAccounts.changeOwnPassword, {
    newPassword: password,
  });
  return password;
}

describe("pure rules", () => {
  test("normalizeScoutId accepts six digits, with punctuation stripped", () => {
    expect(normalizeScoutId("123456")).toBe("123456");
    expect(normalizeScoutId(" 123.456 ")).toBe("123456");
    expect(normalizeScoutId("123-456")).toBe("123456");
    expect(normalizeScoutId("12345")).toBeNull();
    expect(normalizeScoutId("1234567")).toBeNull();
    expect(normalizeScoutId("12a456")).toBeNull();
  });

  test("explainWeakPassword rejects guessable passwords", () => {
    expect(explainWeakPassword("abc", "123456")).not.toBeNull();
    expect(explainWeakPassword("123456", "999999")).not.toBeNull();
    expect(explainWeakPassword("234567", "999999")).not.toBeNull();
    expect(explainWeakPassword("aaaaaa", "999999")).not.toBeNull();
    expect(explainWeakPassword("x999999", "999999")).not.toBeNull();
    expect(explainWeakPassword("Escoteiro", "999999")).not.toBeNull();
    expect(explainWeakPassword("lobo-azul-4821", "999999")).toBeNull();
  });

  test("temporary passwords are readable and pass the strength rule", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTemporaryPassword();
      expect(pw).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
      expect(explainWeakPassword(pw, "123456")).toBeNull();
    }
  });
});

describe("createManagedMember", () => {
  test("escotista creates an approved, onboarded escoteiro of their ramo", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotistaId = await addEscotista(t, groupId, ["escoteiro"]);

    const res = await createKid(t, escotistaId, "123.456");
    expect(res.scoutId).toBe("123456");
    expect(res.password).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);

    const kid = await t.run((ctx) => ctx.db.get(res.userId));
    expect(kid).toMatchObject({
      name: "Joãozinho",
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
      scoutId: "123456",
      managedBy: escotistaId,
      mustChangePassword: true,
    });
    expect(kid?.email).toBeUndefined();
    expect(kid?.image).toBeUndefined();

    const account = await t.run((ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", res.userId).eq("provider", "managed"),
        )
        .unique(),
    );
    expect(account?.providerAccountId).toBe("123456");
    // Hashed, never the plaintext.
    expect(account?.secret).not.toBe(res.password);

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events.some((e) => e.type === "memberJoin" && e.subjectUserId === res.userId)).toBe(true);
  });

  test("rejects a malformed or already-used registro", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await expect(createKid(t, adminId, "12345")).rejects.toThrow("6 dígitos");
    await createKid(t, adminId, "111111");
    await expect(createKid(t, adminId, "111111")).rejects.toThrow("já tem acesso");
  });

  test("a non-admin escotista cannot create outside their ramos", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotistaId = await addEscotista(t, groupId, ["escoteiro"]);
    await expect(createKid(t, escotistaId, "222222", "lobinho")).rejects.toThrow(
      "não acompanha",
    );
  });

  test("only an admin can create an escotista", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const escotistaId = await addEscotista(t, groupId, ["escoteiro"]);
    const args = {
      name: "Chefe",
      scoutId: "333333",
      role: "escotista" as const,
      escotistaRamos: ["escoteiro" as const],
    };
    await expect(
      as(t, escotistaId).action(api.managedAccounts.createManagedMember, args),
    ).rejects.toThrow("Apenas administradores");
    const res = await as(t, adminId).action(
      api.managedAccounts.createManagedMember,
      args,
    );
    const chefe = await t.run((ctx) => ctx.db.get(res.userId));
    expect(chefe).toMatchObject({ role: "escotista", escotistaRamos: ["escoteiro"] });
    expect(chefe?.ramo).toBeUndefined();
  });

  test("escoteiros and outsiders cannot create accounts", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escoteiroId = await addEscoteiro(t, groupId);
    await expect(createKid(t, escoteiroId, "444444")).rejects.toThrow(
      "Apenas escotistas",
    );
    await expect(
      t.action(api.managedAccounts.createManagedMember, {
        name: "X",
        scoutId: "444444",
        role: "escoteiro",
        ramo: "escoteiro",
      }),
    ).rejects.toThrow("Não autenticado");
  });
});

describe("changeOwnPassword", () => {
  test("forced change skips the current password and clears the flag", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    await chooseOwnPassword(t, userId, "fogueira-77");
    const kid = await t.run((ctx) => ctx.db.get(userId));
    expect(kid?.mustChangePassword).toBeUndefined();
  });

  test("afterwards the current password is required and checked", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const mine = await chooseOwnPassword(t, userId);

    await expect(
      as(t, userId).action(api.managedAccounts.changeOwnPassword, {
        newPassword: "outraSenha1",
      }),
    ).rejects.toThrow("senha atual");
    await expect(
      as(t, userId).action(api.managedAccounts.changeOwnPassword, {
        currentPassword: "errada!!",
        newPassword: "outraSenha1",
      }),
    ).rejects.toThrow("Senha atual incorreta");
    await as(t, userId).action(api.managedAccounts.changeOwnPassword, {
      currentPassword: mine,
      newPassword: "outraSenha1",
    });
    // The old password no longer works; the new one does.
    await expect(
      as(t, userId).action(api.managedAccounts.changeOwnPassword, {
        currentPassword: mine,
        newPassword: "terceira1",
      }),
    ).rejects.toThrow("Senha atual incorreta");
    await as(t, userId).action(api.managedAccounts.changeOwnPassword, {
      currentPassword: "outraSenha1",
      newPassword: "terceira1",
    });
  });

  test("weak passwords are rejected", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId, "555555");
    for (const pw of ["123456", "555555x", "abc"]) {
      await expect(
        as(t, userId).action(api.managedAccounts.changeOwnPassword, {
          newPassword: pw,
        }),
      ).rejects.toThrow();
    }
  });

  test("a Google account has no password to change", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await expect(
      as(t, adminId).action(api.managedAccounts.changeOwnPassword, {
        newPassword: "qualquer-1",
      }),
    ).rejects.toThrow("Google");
  });
});

describe("resetManagedPassword", () => {
  test("issues a working temporary password and forces a change", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotistaId = await addEscotista(t, groupId, ["escoteiro"]);
    const { userId } = await createKid(t, escotistaId);
    await chooseOwnPassword(t, userId);

    // Forgotten-password attempts piled up the rate limit.
    await as(t, userId)
      .action(api.managedAccounts.changeOwnPassword, {
        currentPassword: "chute-errado",
        newPassword: "nova-senha-1",
      })
      .catch(() => {});
    expect(
      (await t.run((ctx) => ctx.db.query("authRateLimits").collect())).length,
    ).toBe(1);

    const res = await as(t, escotistaId).action(
      api.managedAccounts.resetManagedPassword,
      { userId },
    );
    expect(res.scoutId).toBe("123456");
    const kid = await t.run((ctx) => ctx.db.get(userId));
    expect(kid?.mustChangePassword).toBe(true);
    expect(
      (await t.run((ctx) => ctx.db.query("authRateLimits").collect())).length,
    ).toBe(0);

    // The temporary password is the current one now.
    await t.run((ctx) => ctx.db.patch(userId, { mustChangePassword: undefined }));
    await as(t, userId).action(api.managedAccounts.changeOwnPassword, {
      currentPassword: res.password,
      newPassword: "nova-senha-1",
    });

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events.some((e) => e.type === "accessChange" && e.subjectUserId === userId)).toBe(true);
  });

  test("an escotista outside the kid's ramo cannot reset", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const lobinhoChefe = await addEscotista(t, groupId, ["lobinho"]);
    await expect(
      as(t, lobinhoChefe).action(api.managedAccounts.resetManagedPassword, { userId }),
    ).rejects.toThrow("ramo");
  });

  test("another grupo's escotista cannot reset", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const other = await seedGrupo(t, { name: "Outro" });
    await expect(
      as(t, other.adminId).action(api.managedAccounts.resetManagedPassword, { userId }),
    ).rejects.toThrow("grupo");
  });

  test("an escoteiro cannot reset anyone", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const a = await createKid(t, adminId, "100001");
    const b = await createKid(t, adminId, "100002");
    await expect(
      as(t, a.userId).action(api.managedAccounts.resetManagedPassword, {
        userId: b.userId,
      }),
    ).rejects.toThrow("Apenas escotistas");
  });

  test("only an admin resets an escotista's password", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const chefe = await as(t, adminId).action(
      api.managedAccounts.createManagedMember,
      {
        name: "Chefe",
        scoutId: "777777",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
      },
    );
    const peer = await addEscotista(t, groupId, ["escoteiro"]);
    await expect(
      as(t, peer).action(api.managedAccounts.resetManagedPassword, {
        userId: chefe.userId,
      }),
    ).rejects.toThrow("Apenas administradores");
    await as(t, adminId).action(api.managedAccounts.resetManagedPassword, {
      userId: chefe.userId,
    });
  });

  test("a Google member has no password to reset", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const googleKid = await addEscoteiro(t, groupId);
    await expect(
      as(t, adminId).action(api.managedAccounts.resetManagedPassword, {
        userId: googleKid,
      }),
    ).rejects.toThrow("Google");
  });
});

describe("grupo membership", () => {
  test("a conta gerenciada cannot leave its grupo", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    await expect(as(t, userId).mutation(api.groups.leaveGroup, {})).rejects.toThrow(
      "registro",
    );
  });

  test("getGroupMembers exposes the registro of contas gerenciadas", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const members = await as(t, adminId).query(api.groups.getGroupMembers, {});
    expect(members.find((m) => m._id === userId)?.scoutId).toBe("123456");
    expect(members.find((m) => m._id === adminId)?.scoutId).toBeNull();
  });
});
