/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";
import { toSpecialtySlug } from "../src/lib/completion-logic";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";

// Enumerate modules explicitly (Bun has no import.meta.glob).
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
  "./specialties.ts": () => import("./specialties"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: Partial<{
    name: string;
    role: "escoteiro" | "escotista";
    ramo: Ramo;
    escotistaRamos: Ramo[];
    groupId: Id<"groups">;
    isAdmin: boolean;
    membershipStatus: "pending" | "approved";
    onboardingComplete: boolean;
  }> = {},
): Promise<Id<"users">> {
  return t.run(async (ctx) => ctx.db.insert("users", { name: "U", ...fields }));
}

async function seedGroup(t: ReturnType<typeof convexTest>) {
  const escotistaId = await insertUser(t, {
    name: "Escotista",
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo",
      number: "1",
      password: "XYZ",
      createdBy: escotistaId,
      createdAt: 1,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(escotistaId, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    }),
  );
  const escoteiroId = await insertUser(t, {
    name: "Escoteiro",
    role: "escoteiro",
    ramo: "escoteiro",
    groupId,
    onboardingComplete: true,
    membershipStatus: "approved",
  });
  return { escotistaId, escoteiroId, groupId };
}

describe("toggleSpecialtyItem", () => {
  test("check → creates pending row", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.specialtyId).toBe("administracao");
    expect(rows[0]!.itemIndex).toBe(0);
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.ramoGroup).toBe("younger");
  });

  test("uncheck pending → deletes row", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    // Check
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });
    // Uncheck
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  test("uncheck approved item as escoteiro → throws", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Escoteiro checks
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    // Escotista approves
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
      completionId: rowId,
    });

    // Escoteiro tries to uncheck approved — should throw
    await expect(
      as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: 0,
      }),
    ).rejects.toThrow();
  });

  test("lobinho gets ramoGroup=younger", async () => {
    const t = convexTest(schema, modules);
    const escotistaId = await insertUser(t, {
      role: "escotista",
      escotistaRamos: ["lobinho"],
      onboardingComplete: true,
    });
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "G",
        password: "A",
        createdBy: escotistaId,
        createdAt: 1,
      }),
    );
    await t.run(async (ctx) =>
      ctx.db.patch(escotistaId, {
        groupId,
        isAdmin: true,
        membershipStatus: "approved",
      }),
    );
    const lobinhoId = await insertUser(t, {
      role: "escoteiro",
      ramo: "lobinho",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    });

    await as(t, lobinhoId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 3,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", lobinhoId))
        .collect(),
    );
    expect(rows[0]!.ramoGroup).toBe("younger");
  });
});

describe("approveSpecialtyItem", () => {
  test("approve pending → status=approved", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 1,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;

    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
      completionId: rowId,
    });

    const updated = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(updated!.status).toBe("approved");
    expect(updated!.approvedBy).toBe(escotistaId);
  });

  test("approve non-pending → throws", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Insert already-approved row directly
    const rowId = await t.run(async (ctx) =>
      ctx.db.insert("specialtyItemCompletions", {
        userId: escoteiroId,
        ramoGroup: "younger",
        specialtyId: "administracao",
        itemIndex: 0,
        completedAt: Date.now(),
        status: "approved",
      }),
    );

    await expect(
      as(t, escotistaId).mutation(api.specialties.approveSpecialtyItem, {
        completionId: rowId,
      }),
    ).rejects.toThrow();
  });
});

describe("rejectSpecialtyItem", () => {
  test("reject pending → row deleted", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 2,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    const rowId = rows[0]!._id;

    await as(t, escotistaId).mutation(api.specialties.rejectSpecialtyItem, {
      completionId: rowId,
    });

    const after = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(after).toBeNull();
  });
});

describe("approveSpecialtyItems (bulk)", () => {
  test("approve multiple pending items → all approved", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    // Check 3 items
    for (const i of [0, 1, 2]) {
      await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: i,
      });
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(rows).toHaveLength(3);

    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItems, {
      escoteiroId,
      specialtyId: "administracao",
      ramoGroup: "younger",
      itemIds: rows.map((r) => r._id),
    });

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(after.every((r) => r.status === "approved")).toBe(true);
  });
});

describe("rejectSpecialtyItems (bulk)", () => {
  test("reject multiple pending items → all deleted", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedGroup(t);

    for (const i of [0, 1]) {
      await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "robotica",
        itemIndex: i,
      });
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );

    await as(t, escotistaId).mutation(api.specialties.rejectSpecialtyItems, {
      escoteiroId,
      specialtyId: "robotica",
      ramoGroup: "younger",
      itemIds: rows.map((r) => r._id),
    });

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    expect(after).toHaveLength(0);
  });
});

describe("getMySpecialtyItems", () => {
  test("returns all items for current user", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 0,
    });
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 2,
    });

    const items = await as(t, escoteiroId).query(
      api.specialties.getMySpecialtyItems,
      {},
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.specialtyId === "yoga")).toBe(true);
  });

  test("returns [] for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const items = await t.query(api.specialties.getMySpecialtyItems, {});
    expect(items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Older ramoGroup — project-report steps (#43)
// ---------------------------------------------------------------------------

async function seedOlderGroup(t: ReturnType<typeof convexTest>) {
  const escotistaId = await insertUser(t, {
    name: "Escotista",
    role: "escotista",
    escotistaRamos: ["senior"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo",
      number: "1",
      password: "XYZ",
      createdBy: escotistaId,
      createdAt: 1,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(escotistaId, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    }),
  );
  const escoteiroId = await insertUser(t, {
    name: "Senior",
    role: "escoteiro",
    ramo: "senior",
    groupId,
    onboardingComplete: true,
    membershipStatus: "approved",
  });
  return { escotistaId, escoteiroId, groupId };
}

async function reportsFor(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
) {
  const all = await t.run(async (ctx) =>
    ctx.db.query("specialtyProjectReports").collect(),
  );
  return all.filter((r) => r.userId === userId);
}

describe("submitSpecialtyStep", () => {
  test("submit conhecer → pending row with ramoGroup=older", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Meu relato de conhecer.",
    });

    const rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.step).toBe("conhecer");
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.ramoGroup).toBe("older");
    expect(rows[0]!.text).toBe("Meu relato de conhecer.");
  });

  test("steps are independent — submit in any order (compartilhar first)", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);

    // No sequential lock (ADR 0002): submit the last step first, with no
    // predecessor written or approved.
    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "compartilhar",
      text: "Relato compartilhar.",
    });
    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "fazer",
      text: "Relato fazer.",
    });

    const rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "pending")).toBe(true);
    expect(rows.map((r) => r.step).sort((a, b) => a.localeCompare(b))).toEqual([
      "compartilhar",
      "fazer",
    ]);
  });

  test("empty text → throws", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);
    await expect(
      as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "   ",
      }),
    ).rejects.toThrow();
  });

  test("resubmit pending conhecer → replaces text, stays pending (one row)", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Primeira versão.",
    });
    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Versão revisada.",
    });

    const rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.text).toBe("Versão revisada.");
    expect(rows[0]!.status).toBe("pending");
  });

  test("submit fazer while conhecer is only pending → allowed (no lock)", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Relato conhecer.",
    });
    // conhecer still pending — fazer must submit anyway.
    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "fazer",
      text: "Relato fazer.",
    });

    const after = await reportsFor(t, escoteiroId);
    expect(after).toHaveLength(2);
    expect(after.find((r) => r.step === "fazer")?.status).toBe("pending");
  });

  test("escoteiro cannot overwrite an approved step", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Relato conhecer.",
    });
    const rows = await reportsFor(t, escoteiroId);
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
      reportId: rows[0]!._id,
    });

    await expect(
      as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "Tentando reescrever.",
      }),
    ).rejects.toThrow();
  });
});

describe("approveSpecialtyStep + rejectSpecialtyStep", () => {
  test("full cascade: approve all three steps → specialty earned", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedOlderGroup(t);

    const submitAndApprove = async (step: "conhecer" | "fazer" | "compartilhar") => {
      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step,
        text: `Relato ${step}.`,
      });
      const rows = await reportsFor(t, escoteiroId);
      const row = rows.find((r) => r.step === step && r.status === "pending")!;
      return as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
        reportId: row._id,
      });
    };

    await submitAndApprove("conhecer");
    await submitAndApprove("fazer");
    const toasts = await submitAndApprove("compartilhar");

    const rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === "approved")).toBe(true);
    // The final approval returns the level-up toast array (ADR 0002).
    expect(Array.isArray(toasts)).toBe(true);
  });

  test("earned only when all three approved — two approved is not enough", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedOlderGroup(t);
    // "comunicacoes" is named in the senior bloco "criatividade-inovacao".
    const linkedBlocoId = "criatividade-inovacao";

    const approve = async (step: "conhecer" | "fazer" | "compartilhar") => {
      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step,
        text: `Relato ${step}.`,
      });
      const rows = await reportsFor(t, escoteiroId);
      const row = rows.find((r) => r.step === step && r.status === "pending")!;
      await as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
        reportId: row._id,
      });
    };

    await approve("conhecer");
    await approve("fazer");

    let comp = await as(t, escoteiroId).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(comp.earnedSpecialtyBlocoIds).not.toContain(linkedBlocoId);

    // The third approval earns the specialty and completes the linked bloco.
    await approve("compartilhar");

    comp = await as(t, escoteiroId).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyBlocoIds).toContain(linkedBlocoId);
  });

  test("grant is order-independent — approving conhecer last still earns", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedOlderGroup(t);

    // Submit all three up front, then approve in reverse order.
    for (const step of ["conhecer", "fazer", "compartilhar"] as const) {
      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step,
        text: `Relato ${step}.`,
      });
    }
    const rows = await reportsFor(t, escoteiroId);
    const byStep = (s: string) => rows.find((r) => r.step === s)!._id;
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
      reportId: byStep("compartilhar"),
    });
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
      reportId: byStep("fazer"),
    });
    // conhecer approved last is the one that completes the set.
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyStep, {
      reportId: byStep("conhecer"),
    });

    const comp = await as(t, escoteiroId).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(comp.earnedSpecialtyBlocoIds).toContain("criatividade-inovacao");
  });

  test("reject a step → row deleted, escoteiro can resubmit", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId, escotistaId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Relato conhecer.",
    });
    let rows = await reportsFor(t, escoteiroId);
    await as(t, escotistaId).mutation(api.specialties.rejectSpecialtyStep, {
      reportId: rows[0]!._id,
    });

    rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(0);

    // Resubmit works
    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Nova tentativa.",
    });
    rows = await reportsFor(t, escoteiroId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.text).toBe("Nova tentativa.");
  });

  test("getMySpecialtyReports returns only own older reports", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Relato.",
    });

    const reports = await as(t, escoteiroId).query(
      api.specialties.getMySpecialtyReports,
      {},
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.specialtyId).toBe("comunicacoes");
  });
});

// ── #44: especialidade → bloco auto-completion ─────────────────────────────

describe("especialidade → bloco auto-completion (#44)", () => {
  const eixos = getEixosForRamo("escoteiro");
  const allBlocos = eixos.flatMap((e) => e.blocos);

  // The bloco whose alternativeCompletions name "Administração" (slug
  // "administracao"), an existing younger-catalog specialty.
  const targetBloco = allBlocos.find((b) =>
    b.alternativeCompletions.some(
      (alt) =>
        alt.type === "especialidade" &&
        alt.items.some((n) => toSpecialtySlug(n) === "administracao"),
    ),
  );

  function fullActionIds(bloco: (typeof allBlocos)[number]): string[] {
    return [
      ...bloco.fixedActions.map((a) => a.id),
      ...bloco.variableActions.slice(0, bloco.variableRequired).map((a) => a.id),
    ];
  }

  async function seedApprovedActions(
    t: ReturnType<typeof convexTest>,
    userId: Id<"users">,
    actionIds: string[],
  ) {
    await t.run(async (ctx) => {
      for (const actionId of actionIds) {
        await ctx.db.insert("actionCompletions", {
          userId,
          actionId,
          completedAt: 1,
          status: "approved",
        });
      }
    });
  }

  test("linked bloco is satisfied once the specialty reaches level 1", async () => {
    const t = convexTest(schema, modules);
    const { escoteiroId } = await seedGroup(t);
    expect(targetBloco).toBeDefined();
    expect(targetBloco!.variableRequired).toBeGreaterThan(0);

    // All of the target bloco's fixed actions approved — its variable section is
    // still unsatisfied, so it does NOT count yet.
    await seedApprovedActions(
      t,
      escoteiroId,
      targetBloco!.fixedActions.map((a) => a.id),
    );

    let comp = await as(t, escoteiroId).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(comp.earnedSpecialtyBlocoIds).not.toContain(targetBloco!.id);

    // Approve half the "administracao" items (level-1 threshold) directly.
    const spec = YOUNGER_SPECIALTY_BY_ID.get("administracao")!;
    const half = spec.items.length / 2;
    await t.run(async (ctx) => {
      for (let i = 0; i < half; i++) {
        await ctx.db.insert("specialtyItemCompletions", {
          userId: escoteiroId,
          ramoGroup: "younger",
          specialtyId: "administracao",
          itemIndex: i,
          completedAt: 1,
          status: "approved",
        });
      }
    });

    comp = await as(t, escoteiroId).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyBlocoIds).toContain(targetBloco!.id);
  });

  test("approving the item that reaches level 1 fires an etapa level-up", async () => {
    const t = convexTest(schema, modules);
    const { escotistaId, escoteiroId } = await seedGroup(t);
    expect(targetBloco).toBeDefined();

    // Three fully-complete filler blocos put the escoteiro at 3 blocks — one shy
    // of the escoteiro etapa-1 threshold (4 blocks).
    const fillers = allBlocos
      .filter((b) => b.id !== targetBloco!.id)
      .slice(0, 3);
    for (const b of fillers) {
      await seedApprovedActions(t, escoteiroId, fullActionIds(b));
    }
    // Target bloco: fixed actions only — variable satisfied solely via specialty.
    await seedApprovedActions(
      t,
      escoteiroId,
      targetBloco!.fixedActions.map((a) => a.id),
    );

    // Escoteiro checks half the administracao items → pending rows.
    const spec = YOUNGER_SPECIALTY_BY_ID.get("administracao")!;
    const half = spec.items.length / 2;
    for (let i = 0; i < half; i++) {
      await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: i,
      });
    }

    // Escotista approves each pending item; the last one crosses level 1, which
    // completes the target bloco (block #4) and advances the etapa.
    const pending = await t.run((ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", escoteiroId))
        .collect(),
    );
    let toasts: { kind: string }[] = [];
    for (const row of pending) {
      toasts = await as(t, escotistaId).mutation(
        api.specialties.approveSpecialtyItem,
        { completionId: row._id },
      );
    }

    expect(toasts.some((tt) => tt.kind === "levelUp")).toBe(true);

    const comp = await as(t, escoteiroId).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(comp.earnedSpecialtyBlocoIds).toContain(targetBloco!.id);
  });
});
