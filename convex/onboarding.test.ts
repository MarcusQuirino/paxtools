/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import { as, insertUser, newTest } from "./fixtures.testkit";

describe("setRole", () => {
  test("sets role to escoteiro and clears escotistaRamos", async () => {
    const t = newTest();
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro", "senior"],
    });
    await as(t, userId).mutation(api.onboarding.setRole, { role: "escoteiro" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("escoteiro");
    expect(user?.escotistaRamos).toBeUndefined();
  });

  test("sets role to escotista and clears ramo", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, userId).mutation(api.onboarding.setRole, { role: "escotista" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("escotista");
    expect(user?.ramo).toBeUndefined();
  });

  test("throws once role set AND onboardingComplete is true", async () => {
    const t = newTest();
    const userId = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      onboardingComplete: true,
    });
    await expect(
      as(t, userId).mutation(api.onboarding.setRole, { role: "escotista" }),
    ).rejects.toThrow("Papel já definido");
  });

  // NOTE: possible bug — setRole locks once onboardingComplete is true, but
  // setEscoteiroRamo / setEscotistaRamos have no such guard. A fully-onboarded
  // user can therefore still change their ramo(s) but not their role. Possibly
  // intended; pinned here as current behavior.
  test("can still change role when role set but onboardingComplete false", async () => {
    const t = newTest();
    const userId = await insertUser(t, {
      role: "escoteiro",
      ramo: "escoteiro",
      onboardingComplete: false,
    });
    await as(t, userId).mutation(api.onboarding.setRole, { role: "escotista" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("escotista");
  });
});

describe("setEscoteiroRamo", () => {
  test("sets ramo for an escoteiro", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro" });
    await as(t, userId).mutation(api.onboarding.setEscoteiroRamo, {
      ramo: "senior",
    });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.ramo).toBe("senior");
  });

  test("throws when role is not escoteiro", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escotista" });
    await expect(
      as(t, userId).mutation(api.onboarding.setEscoteiroRamo, { ramo: "senior" }),
    ).rejects.toThrow("Apenas escoteiros têm ramo único");
  });
});

describe("setEscotistaRamos", () => {
  test("sets and dedupes ramos for an escotista", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escotista" });
    await as(t, userId).mutation(api.onboarding.setEscotistaRamos, {
      ramos: ["escoteiro", "escoteiro", "senior"],
    });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.escotistaRamos?.sort()).toEqual(["escoteiro", "senior"]);
  });

  test("throws when role is not escotista", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.onboarding.setEscotistaRamos, {
        ramos: ["escoteiro"],
      }),
    ).rejects.toThrow("Apenas escotistas têm múltiplos ramos");
  });

  test("throws on empty array", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escotista" });
    await expect(
      as(t, userId).mutation(api.onboarding.setEscotistaRamos, { ramos: [] }),
    ).rejects.toThrow("Selecione pelo menos um ramo");
  });
});

describe("completeOnboarding", () => {
  test("throws when no role", async () => {
    const t = newTest();
    const userId = await insertUser(t, {});
    await expect(
      as(t, userId).mutation(api.onboarding.completeOnboarding, {}),
    ).rejects.toThrow("Escolha seu papel");
  });

  test("throws for escoteiro without ramo", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro" });
    await expect(
      as(t, userId).mutation(api.onboarding.completeOnboarding, {}),
    ).rejects.toThrow("Escolha seu ramo");
  });

  test("throws for escotista without escotistaRamos", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escotista" });
    await expect(
      as(t, userId).mutation(api.onboarding.completeOnboarding, {}),
    ).rejects.toThrow("pelo menos um ramo");
  });

  test("succeeds for escoteiro with ramo; sets onboardingComplete", async () => {
    const t = newTest();
    const userId = await insertUser(t, { role: "escoteiro", ramo: "escoteiro" });
    await as(t, userId).mutation(api.onboarding.completeOnboarding, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingComplete).toBe(true);
  });

  test("succeeds for escotista with ramos; sets onboardingComplete", async () => {
    const t = newTest();
    const userId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["escoteiro"],
    });
    await as(t, userId).mutation(api.onboarding.completeOnboarding, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingComplete).toBe(true);
  });
});
