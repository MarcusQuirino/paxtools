/// <reference types="bun" />
import { afterAll, beforeAll, describe, test, expect } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
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

describe("createManagedMember: input rules", () => {
  test("rejects a blank or over-long name", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const base = { scoutId: "123456", role: "escoteiro" as const, ramo: "escoteiro" as const };
    await expect(
      as(t, adminId).action(api.managedAccounts.createManagedMember, { ...base, name: "   " }),
    ).rejects.toThrow("Informe o nome");
    await expect(
      as(t, adminId).action(api.managedAccounts.createManagedMember, {
        ...base,
        name: "x".repeat(101),
      }),
    ).rejects.toThrow("Nome muito longo");
  });

  test("an escotista needs at least one ramo", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const base = { name: "Chefe", scoutId: "123456", role: "escotista" as const };
    await expect(
      as(t, adminId).action(api.managedAccounts.createManagedMember, base),
    ).rejects.toThrow("Selecione pelo menos um ramo");
    await expect(
      as(t, adminId).action(api.managedAccounts.createManagedMember, {
        ...base,
        escotistaRamos: [],
      }),
    ).rejects.toThrow("Selecione pelo menos um ramo");
  });

  test("an escoteiro needs a ramo", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await expect(
      as(t, adminId).action(api.managedAccounts.createManagedMember, {
        name: "Joãozinho",
        scoutId: "123456",
        role: "escoteiro",
      }),
    ).rejects.toThrow("Selecione o ramo do escoteiro");
  });

  test("an escotista's ramos are deduplicated", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const res = await as(t, adminId).action(api.managedAccounts.createManagedMember, {
      name: "Chefe",
      scoutId: "123456",
      role: "escotista",
      escotistaRamos: ["escoteiro", "senior", "escoteiro"],
    });
    const chefe = await t.run((ctx) => ctx.db.get(res.userId));
    expect(chefe?.escotistaRamos).toEqual(["escoteiro", "senior"]);
  });

  test("a registro already on a user doc counts as taken", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    // A member carrying the registro without a managed auth account.
    const kid = await addEscoteiro(t, groupId);
    await t.run((ctx) => ctx.db.patch(kid, { scoutId: "123456" }));
    await expect(createKid(t, adminId, "123456")).rejects.toThrow("já tem acesso");
  });

  test("logs the join with the creator as actor", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotistaId = await addEscotista(t, groupId, ["escoteiro"]);
    const { userId } = await createKid(t, escotistaId);
    const events = await t.run((ctx) => ctx.db.query("events").collect());
    const join = events.filter((e) => e.type === "memberJoin");
    expect(join).toHaveLength(1);
    expect(join[0]).toMatchObject({
      groupId,
      actorUserId: escotistaId,
      subjectUserId: userId,
      subjectName: "Joãozinho",
      summary: "Entrou no grupo (acesso com registro)",
    });
  });
});

describe("resetManagedPassword: refusals", () => {
  test("nobody resets their own password here", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await expect(
      as(t, adminId).action(api.managedAccounts.resetManagedPassword, {
        userId: adminId,
      }),
    ).rejects.toThrow("Use a tela de perfil");
  });

  test("an escotista of another grupo is out of reach", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const other = await seedGrupo(t, { name: "Outro" });
    const chefe = await as(t, other.adminId).action(
      api.managedAccounts.createManagedMember,
      {
        name: "Chefe",
        scoutId: "777777",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
      },
    );
    await expect(
      as(t, adminId).action(api.managedAccounts.resetManagedPassword, {
        userId: chefe.userId,
      }),
    ).rejects.toThrow("Usuário não pertence ao seu grupo");
  });

  test("a banned escotista is out of reach", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const chefe = await as(t, adminId).action(api.managedAccounts.createManagedMember, {
      name: "Chefe",
      scoutId: "777777",
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    // Banned, but still pointing at the grupo — only bannedAt keeps it out.
    await t.run((ctx) => ctx.db.patch(chefe.userId, { bannedAt: 1, groupId }));
    await expect(
      as(t, adminId).action(api.managedAccounts.resetManagedPassword, {
        userId: chefe.userId,
      }),
    ).rejects.toThrow("Usuário não pertence ao seu grupo");
  });

  test("signs the member out of every session", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    await t.run(async (ctx) => {
      await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
      await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
    });
    await as(t, adminId).action(api.managedAccounts.resetManagedPassword, { userId });
    const sessions = await t.run((ctx) =>
      ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(sessions).toEqual([]);
  });
});

describe("changeOwnPassword: refusals and sessions", () => {
  test("unauthenticated and banned callers are refused", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    await expect(
      t.action(api.managedAccounts.changeOwnPassword, { newPassword: "fogueira-77" }),
    ).rejects.toThrow("Não autenticado");
    await t.run((ctx) => ctx.db.patch(userId, { bannedAt: 1 }));
    await expect(
      as(t, userId).action(api.managedAccounts.changeOwnPassword, {
        newPassword: "fogueira-77",
      }),
    ).rejects.toThrow("banido");
  });

  test("a rate-limited account gets 'Muitas tentativas', not 'incorreta'", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const mine = await chooseOwnPassword(t, userId);
    await t.run(async (ctx) => {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", userId).eq("provider", "managed"),
        )
        .unique();
      await ctx.db.insert("authRateLimits", {
        identifier: account!._id,
        attemptsLeft: 0,
        lastAttemptTime: Date.now(),
      });
    });
    // Even the right password is refused while the limit holds.
    await expect(
      as(t, userId).action(api.managedAccounts.changeOwnPassword, {
        currentPassword: mine,
        newPassword: "outraSenha1",
      }),
    ).rejects.toThrow("Muitas tentativas");
  });

  test("keeps the current session and signs out the others", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId } = await createKid(t, adminId);
    const [current, other] = await t.run(async (ctx) => {
      const expirationTime = Date.now() + 60_000;
      return [
        await ctx.db.insert("authSessions", { userId, expirationTime }),
        await ctx.db.insert("authSessions", { userId, expirationTime }),
      ];
    });
    await t
      .withIdentity({ subject: `${userId}|${current}` })
      .action(api.managedAccounts.changeOwnPassword, { newPassword: "fogueira-77" });
    const left = await t.run((ctx) =>
      ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(left.map((s) => s._id)).toEqual([current]);
    expect(left.map((s) => s._id)).not.toContain(other);
  });
});

describe("managed sign-in provider", () => {
  // Tokens are only minted on a successful sign-in; give @convex-dev/auth the
  // signing key and issuer it reads from the deployment env.
  const saved = {
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  };
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.CONVEX_SITE_URL = "https://test.convex.site";
  });
  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function signIn(t: TestConvex, params: Record<string, string>) {
    return t.action(api.auth.signIn, { provider: "managed", params });
  }

  test("signs in with registro + password", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId, password } = await createKid(t, adminId);
    const res = await signIn(t, { flow: "signIn", email: "123.456", password });
    expect(res.tokens?.token).toBeString();
    const sessions = await t.run((ctx) =>
      ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(sessions).toHaveLength(1);
  });

  test("a wrong password is refused", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await createKid(t, adminId);
    await expect(
      signIn(t, { flow: "signIn", email: "123456", password: "chute-errado" }),
    ).rejects.toThrow("InvalidSecret");
    const [sessions, limits] = await t.run(async (ctx) => [
      await ctx.db.query("authSessions").collect(),
      await ctx.db.query("authRateLimits").collect(),
    ]);
    expect(sessions).toEqual([]);
    // The failed attempt counts towards the per-account limit.
    expect(limits).toHaveLength(1);
  });

  test("a malformed registro is refused before any lookup", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    const { userId, password } = await createKid(t, adminId);
    // Plant an account under a seven-digit id with a valid password hash: only
    // profile()'s registro check stands between the caller and a session.
    await t.run(async (ctx) => {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", userId).eq("provider", "managed"),
        )
        .unique();
      await ctx.db.patch(account!._id, { providerAccountId: "1234567" });
    });
    await expect(
      signIn(t, { flow: "signIn", email: "1234567", password }),
    ).rejects.toThrow("InvalidAccountId");
    expect(await t.run((ctx) => ctx.db.query("authSessions").collect())).toEqual([]);
  });

  test("signUp cannot mint an account", async () => {
    const t = newTest();
    // A strong password, so the refusal comes from profile(), not Password's
    // own length check.
    await expect(
      signIn(t, { flow: "signUp", email: "123456", password: "senha-forte-123" }),
    ).rejects.toThrow("só permite entrar");
    const [users, accounts] = await t.run(async (ctx) => [
      await ctx.db.query("users").collect(),
      await ctx.db.query("authAccounts").collect(),
    ]);
    expect(users).toEqual([]);
    expect(accounts).toEqual([]);
  });

  test("reset flows cannot take over an existing account", async () => {
    const t = newTest();
    const { adminId } = await seedGrupo(t);
    await createKid(t, adminId);
    await expect(signIn(t, { flow: "reset", email: "123456" })).rejects.toThrow(
      "só permite entrar",
    );
    await expect(
      signIn(t, {
        flow: "reset-verification",
        email: "123456",
        code: "000000",
        newPassword: "senha-forte-123",
      }),
    ).rejects.toThrow("só permite entrar");
  });
});
