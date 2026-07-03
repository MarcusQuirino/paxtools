/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Bun has no import.meta.glob — enumerate modules explicitly. NOTE: ai.ts is a
// "use node" file and is intentionally NOT listed; these tests only exercise
// the V8-runtime helpers.
const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./aiHelpers.ts": () => import("./aiHelpers"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./featureFlags.ts": () => import("./featureFlags"),
  "./http.ts": () => import("./http"),
};

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function enableAiFlag(t: ReturnType<typeof convexTest>) {
  await t.mutation(internal.featureFlags.setFlag, {
    key: "ai_suggestions",
    enabled: true,
  });
}

async function seedGroupWithAdmin(t: ReturnType<typeof convexTest>) {
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "Admin", role: "escotista", escotistaRamos: ["escoteiro"], onboardingComplete: true }),
  );
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", { name: "G", number: "1", password: "AAAAAA", createdBy: adminId, createdAt: 1 }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(adminId, { groupId, isAdmin: true, membershipStatus: "approved" }),
  );
  return { adminId, groupId };
}

async function seedEscotista(
  t: ReturnType<typeof convexTest>,
  groupId: Id<"groups">,
  ramos: Ramo[],
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "E",
      role: "escotista",
      escotistaRamos: ramos,
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    }),
  );
}

describe("ai_suggestions feature flag", () => {
  test("prepareSuggestion throws while the flag is off (default)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    await expect(
      as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "escoteiro" }),
    ).rejects.toThrow();
  });

  test("getCachedSuggestion returns null while the flag is off, even with a cached row", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    await t.mutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo: "escoteiro",
      perEixoIdeas: [{ eixoId: "a", eixoName: "A", idea: "x", groundedOn: [] }],
      overview: "hidden",
    });
    const cached = await as(t, escId).query(api.aiHelpers.getCachedSuggestion, { ramo: "escoteiro" });
    expect(cached).toBeNull();
  });

  test("isEnabled reflects setFlag on/off", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.featureFlags.isEnabled, { key: "ai_suggestions" })).toBe(false);
    await enableAiFlag(t);
    expect(await t.query(api.featureFlags.isEnabled, { key: "ai_suggestions" })).toBe(true);
    await t.mutation(internal.featureFlags.setFlag, { key: "ai_suggestions", enabled: false });
    expect(await t.query(api.featureFlags.isEnabled, { key: "ai_suggestions" })).toBe(false);
  });
});

describe("prepareSuggestion authz", () => {
  test("escotista in ramo gets coverage for that ramo", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    const out = await as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, {
      ramo: "escoteiro",
    });
    expect(out.ramo).toBe("escoteiro");
    expect(out.groupId).toBe(groupId);
    expect(Array.isArray(out.coverage.eixos)).toBe(true);
    expect(out.cachedAt).toBeNull();
  });

  test("non-admin asking for a ramo outside escotistaRamos is rejected on both AI surfaces", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    // Same caller shape and same module-owned message as the stats surface —
    // identical outcome everywhere resolveRamoAccess guards a ramo view.
    await expect(
      as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
    await expect(
      as(t, escId).query(api.aiHelpers.getCachedSuggestion, { ramo: "senior" }),
    ).rejects.toThrow("Você não acompanha esse ramo");
  });

  test("escotista with no ramos and omitted ramo gets 'Selecione um ramo'", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, []);
    await expect(
      as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, {}),
    ).rejects.toThrow("Selecione um ramo");
    await expect(
      as(t, escId).query(api.aiHelpers.getCachedSuggestion, {}),
    ).rejects.toThrow("Selecione um ramo");
  });

  test("legacy grupo-creator (isAdmin unset) gets admin scope on AI", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    // Creator predating the isAdmin flag: createdBy points at them, flag unset.
    const creatorId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Legacy",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
        membershipStatus: "approved",
        onboardingComplete: true,
      }),
    );
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "GL", number: "9", password: "ZZZZZZ",
        createdBy: creatorId, createdAt: 1,
      }),
    );
    await t.run(async (ctx) => ctx.db.patch(creatorId, { groupId }));
    await t.mutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo: "pioneiro",
      perEixoIdeas: [{ eixoId: "a", eixoName: "A", idea: "x", groundedOn: [] }],
      overview: "for-admins",
    });
    // Query first: the read path must resolve the createdBy fallback itself
    // (queries cannot backfill isAdmin). "pioneiro" is not in their ramos.
    const cached = await as(t, creatorId).query(api.aiHelpers.getCachedSuggestion, {
      ramo: "pioneiro",
    });
    expect(cached).not.toBeNull();
    expect(cached!.overview).toBe("for-admins");
    const out = await as(t, creatorId).mutation(internal.aiHelpers.prepareSuggestion, {
      ramo: "lobinho",
    });
    expect(out.ramo).toBe("lobinho");
  });

  test("admin may request any ramo", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { adminId } = await seedGroupWithAdmin(t);
    const out = await as(t, adminId).mutation(internal.aiHelpers.prepareSuggestion, {
      ramo: "pioneiro",
    });
    expect(out.ramo).toBe("pioneiro");
  });

  test("omitted ramo defaults to caller's first escotistaRamos entry", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["senior", "pioneiro"]);
    const out = await as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, {});
    expect(out.ramo).toBe("senior");
  });
});

describe("saveSuggestion + getCachedSuggestion + rate limit", () => {
  test("save then read back the cached row; re-prepare within 30s throws", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);

    await t.mutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo: "escoteiro",
      perEixoIdeas: [
        { eixoId: "life", eixoName: "Habilidades para a Vida", idea: "Gincana", groundedOn: ["X"] },
      ],
      overview: "pesado em X",
    });

    const cached = await as(t, escId).query(api.aiHelpers.getCachedSuggestion, { ramo: "escoteiro" });
    expect(cached).not.toBeNull();
    expect(cached!.overview).toBe("pesado em X");
    expect(cached!.perEixoIdeas).toHaveLength(1);

    // freshly generated → re-prepare should be rate-limited
    await expect(
      as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "escoteiro" }),
    ).rejects.toThrow();
  });

  test("prepare claims the cooldown atomically: a second prepare right after the first throws", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);

    // No cached content yet — the claim alone must arm the cooldown, otherwise
    // concurrent generate clicks would each pay for an LLM call.
    await as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "escoteiro" });
    await expect(
      as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "escoteiro" }),
    ).rejects.toThrow();
  });

  test("getCachedSuggestion returns null for a claim stub without content", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    await as(t, escId).mutation(internal.aiHelpers.prepareSuggestion, { ramo: "escoteiro" });
    const cached = await as(t, escId).query(api.aiHelpers.getCachedSuggestion, { ramo: "escoteiro" });
    expect(cached).toBeNull();
  });

  test("getCachedSuggestion returns null when nothing cached", async () => {
    const t = convexTest(schema, modules);
    await enableAiFlag(t);
    const { groupId } = await seedGroupWithAdmin(t);
    const escId = await seedEscotista(t, groupId, ["escoteiro"]);
    const cached = await as(t, escId).query(api.aiHelpers.getCachedSuggestion, { ramo: "escoteiro" });
    expect(cached).toBeNull();
  });

  test("second saveSuggestion replaces rather than duplicates (one row)", async () => {
    const t = convexTest(schema, modules);
    const { groupId } = await seedGroupWithAdmin(t);

    await t.mutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo: "escoteiro",
      perEixoIdeas: [{ eixoId: "a", eixoName: "A", idea: "first", groundedOn: [] }],
      overview: "first overview",
    });
    await t.mutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo: "escoteiro",
      perEixoIdeas: [{ eixoId: "b", eixoName: "B", idea: "second", groundedOn: ["Y"] }],
      overview: "second overview",
    });

    // Assert only one row exists for (groupId, ramo)
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("aiSuggestions")
        .withIndex("by_group_and_ramo", (q) => q.eq("groupId", groupId).eq("ramo", "escoteiro"))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.overview).toBe("second overview");
  });
});
