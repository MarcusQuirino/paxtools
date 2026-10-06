/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";
import { toSpecialtySlug } from "../src/lib/completion-logic";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";
import { as, insertUser, newTest, type Ramo, type TestConvex } from "./fixtures.testkit";

async function seedGroup(t: TestConvex) {
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    await as(t, escotistaId).mutation(api.specialties.approveSpecialtyItems, {
      escoteiroId,
      specialtyId: "administracao",
      ramoGroup: "younger",
      itemIds: [rows[0]!._id],
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
    const t = newTest();
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

describe("toggleSpecialtyItem validation", () => {
  test("rejects an unknown especialidade or an item outside its list", async () => {
    const t = newTest();
    const { escoteiroId } = await seedGroup(t);
    await expect(
      as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "nao-existe",
        itemIndex: 0,
      }),
    ).rejects.toThrow("Especialidade não encontrada");
    await expect(
      as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: 99,
      }),
    ).rejects.toThrow("Item inválido");
    const rows = await t.run((ctx) => ctx.db.query("specialtyItemCompletions").collect());
    expect(rows).toHaveLength(0);
  });

  test("a sênior or an escotista cannot write item rows", async () => {
    const t = newTest();
    const { escotistaId, groupId } = await seedGroup(t);
    const seniorId = await insertUser(t, {
      role: "escoteiro",
      ramo: "senior",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    });
    await expect(
      as(t, seniorId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: 0,
      }),
    ).rejects.toThrow("registradas por etapas");
    await expect(
      as(t, escotistaId).mutation(api.specialties.toggleSpecialtyItem, {
        specialtyId: "administracao",
        itemIndex: 0,
      }),
    ).rejects.toThrow("Apenas escoteiros");
  });

  test("a lobinho or escoteiro cannot write etapa relatos", async () => {
    const t = newTest();
    const { escoteiroId } = await seedGroup(t);
    await expect(
      as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "Relato",
      }),
    ).rejects.toThrow("registradas por itens");
  });
});

describe("rejectSpecialtyItem", () => {
  test("reject pending → row deleted", async () => {
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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

describe("getMyEspecialidades", () => {
  test("returns one standing per touched especialidade, counted by distinct item", async () => {
    const t = newTest();
    const { escoteiroId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 0,
    });
    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "yoga",
      itemIndex: 2,
    });

    const record = await as(t, escoteiroId).query(
      api.specialties.getMyEspecialidades,
      {},
    );
    expect(record.ramoGroup).toBe("younger");
    expect(record.standings).toHaveLength(1);
    const yoga = record.standings[0]!;
    expect(yoga.specialtyId).toBe("yoga");
    expect(yoga.pendingCount).toBe(2);
    expect(yoga.approvedCount).toBe(0);
    expect(yoga.kind === "younger" && yoga.items[2]?.status).toBe("pending");
  });

  test("unauthenticated caller → empty younger record", async () => {
    const t = newTest();
    const record = await t.query(api.specialties.getMyEspecialidades, {});
    expect(record).toEqual({ ramoGroup: "younger", standings: [] });
  });
});

describe("getEscoteiroEspecialidades — younger (#53 access rules)", () => {
  test("escotista with ramo visibility → returns the scout's standings", async () => {
    const t = newTest();
    // seedGroup's escotista is the grupo creator → admin → sees all ramos.
    const { escoteiroId, escotistaId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    const record = await as(t, escotistaId).query(
      api.specialties.getEscoteiroEspecialidades,
      { escoteiroId },
    );
    expect(record?.standings).toHaveLength(1);
    expect(record?.standings[0]!.specialtyId).toBe("administracao");
  });

  test("escotista without ramo visibility → null", async () => {
    const t = newTest();
    const { escoteiroId, groupId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    // A non-admin escotista in the same grupo who accompanies a different ramo
    // than the escoteiro (escoteiro) — outside visibilidade de ramo.
    const outsideEscotistaId = await insertUser(t, {
      name: "Escotista Senior",
      role: "escotista",
      escotistaRamos: ["senior"],
      groupId,
      isAdmin: false,
      membershipStatus: "approved",
      onboardingComplete: true,
    });

    const record = await as(t, outsideEscotistaId).query(
      api.specialties.getEscoteiroEspecialidades,
      { escoteiroId },
    );
    expect(record).toBeNull();
  });

  test("escoteiro passing another scout's id → null", async () => {
    const t = newTest();
    const { escoteiroId, groupId } = await seedGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.toggleSpecialtyItem, {
      specialtyId: "administracao",
      itemIndex: 0,
    });

    // A peer escoteiro cannot read someone else's items — non-escotista callers
    // resolve to no viewer.
    const otherEscoteiroId = await insertUser(t, {
      name: "Outro Escoteiro",
      role: "escoteiro",
      ramo: "escoteiro",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    });

    const record = await as(t, otherEscoteiroId).query(
      api.specialties.getEscoteiroEspecialidades,
      { escoteiroId },
    );
    expect(record).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Older ramoGroup — project-report steps (#43)
// ---------------------------------------------------------------------------

async function seedOlderGroup(t: TestConvex) {
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
  t: TestConvex,
  userId: Id<"users">,
) {
  const all = await t.run(async (ctx) =>
    ctx.db.query("specialtyProjectReports").collect(),
  );
  return all.filter((r) => r.userId === userId);
}

describe("submitSpecialtyStep", () => {
  test("submit conhecer → pending row with ramoGroup=older", async () => {
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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
    const t = newTest();
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

  describe("getEscoteiroEspecialidades — older (#53 access rules)", () => {
    test("escotista with ramo visibility → returns the scout's reports", async () => {
      const t = newTest();
      const { escoteiroId, escotistaId } = await seedOlderGroup(t);

      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "Relato conhecer.",
      });

      const reports = await as(t, escotistaId).query(
        api.specialties.getEscoteiroEspecialidades,
        { escoteiroId },
      );
      expect(reports?.ramoGroup).toBe("older");
      expect(reports?.standings).toHaveLength(1);
      expect(reports?.standings[0]!.specialtyId).toBe("comunicacoes");
    });

    test("escotista without ramo visibility → null", async () => {
      const t = newTest();
      const { escoteiroId, groupId } = await seedOlderGroup(t);

      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "Relato conhecer.",
      });

      // Non-admin escotista accompanying a different ramo (lobinho) than the
      // senior escoteiro — outside visibilidade de ramo.
      const outsideEscotistaId = await insertUser(t, {
        name: "Escotista Lobinho",
        role: "escotista",
        escotistaRamos: ["lobinho"],
        groupId,
        isAdmin: false,
        membershipStatus: "approved",
        onboardingComplete: true,
      });

      const reports = await as(t, outsideEscotistaId).query(
        api.specialties.getEscoteiroEspecialidades,
        { escoteiroId },
      );
      expect(reports).toBeNull();
    });

    test("escoteiro passing another scout's id → null", async () => {
      const t = newTest();
      const { escoteiroId, groupId } = await seedOlderGroup(t);

      await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "conhecer",
        text: "Relato conhecer.",
      });

      const otherEscoteiroId = await insertUser(t, {
        name: "Outro Senior",
        role: "escoteiro",
        ramo: "senior",
        groupId,
        membershipStatus: "approved",
        onboardingComplete: true,
      });

      const reports = await as(t, otherEscoteiroId).query(
        api.specialties.getEscoteiroEspecialidades,
        { escoteiroId },
      );
      expect(reports).toBeNull();
    });
  });

  test("getMyEspecialidades returns the older standing with the relato", async () => {
    const t = newTest();
    const { escoteiroId } = await seedOlderGroup(t);

    await as(t, escoteiroId).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "conhecer",
      text: "Relato.",
    });

    const record = await as(t, escoteiroId).query(
      api.specialties.getMyEspecialidades,
      {},
    );
    expect(record.ramoGroup).toBe("older");
    expect(record.standings).toHaveLength(1);
    const st = record.standings[0]!;
    expect(st.specialtyId).toBe("comunicacoes");
    expect(st.kind === "older" && st.etapas.conhecer?.text).toBe("Relato.");
    expect(st.earned).toBe(false);
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
    t: TestConvex,
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
    const t = newTest();
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

  test("duplicate or out-of-range item rows never earn the especialidade", async () => {
    const t = newTest();
    const { escotistaId, escoteiroId } = await seedGroup(t);
    await seedApprovedActions(
      t,
      escoteiroId,
      targetBloco!.fixedActions.map((a) => a.id),
    );

    // Level 1 needs 3 distinct items of administracao (6 items). Three copies of
    // item 0 plus a row past the end used to count as 4 and complete the bloco
    // while the escotista roster said "em andamento".
    await t.run(async (ctx) => {
      for (const itemIndex of [0, 0, 0, 99]) {
        await ctx.db.insert("specialtyItemCompletions", {
          userId: escoteiroId,
          ramoGroup: "younger",
          specialtyId: "administracao",
          itemIndex,
          completedAt: 1,
          status: "approved",
        });
      }
    });

    const comp = await as(t, escoteiroId).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyIds).not.toContain("administracao");
    expect(comp.earnedSpecialtyBlocoIds).not.toContain(targetBloco!.id);

    // The roster agrees: one distinct approved item, not earned.
    const roster = await as(t, escotistaId).query(api.specialties.getSpecialtyRoster, {
      specialtyId: "administracao",
      ramoGroup: "younger",
    });
    expect(roster?.earnedCount).toBe(0);
    expect(roster?.kind === "younger" && roster.people[0]?.approvedCount).toBe(1);
  });

  test("approving the item that reaches level 1 fires an etapa level-up", async () => {
    const t = newTest();
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
        api.specialties.approveSpecialtyItems,
        {
          escoteiroId,
          specialtyId: "administracao",
          ramoGroup: "younger",
          itemIds: [row._id],
        },
      );
    }

    expect(toasts.some((tt) => tt.kind === "levelUp")).toBe(true);

    const comp = await as(t, escoteiroId).query(
      api.progression.getMyCompletions,
      {},
    );
    expect(comp.earnedSpecialtyBlocoIds).toContain(targetBloco!.id);
  });

  test("setSpecialtyItemApproved crossing level 1 fires an etapa level-up", async () => {
    const t = newTest();
    const { escotistaId, escoteiroId } = await seedGroup(t);
    const fillers = allBlocos
      .filter((b) => b.id !== targetBloco!.id)
      .slice(0, 3);
    for (const b of fillers) {
      await seedApprovedActions(t, escoteiroId, fullActionIds(b));
    }
    await seedApprovedActions(
      t,
      escoteiroId,
      targetBloco!.fixedActions.map((a) => a.id),
    );

    const half = YOUNGER_SPECIALTY_BY_ID.get("administracao")!.items.length / 2;
    let toasts: { kind: string }[] = [];
    for (let i = 0; i < half; i++) {
      toasts = await as(t, escotistaId).mutation(
        api.specialties.setSpecialtyItemApproved,
        {
          escoteiroId,
          specialtyId: "administracao",
          itemIndex: i,
          approved: true,
        },
      );
    }
    expect(toasts.some((tt) => tt.kind === "levelUp")).toBe(true);
  });
});

// ===========================================================================
// Escotista Especialidades tab — catalog summary, roster, explicit mark
// ===========================================================================

/** A non-admin escotista in `groupId` accompanying `ramos`. */
async function insertEscotista(
  t: TestConvex,
  groupId: Id<"groups">,
  ramos: Ramo[],
  name = "Chefe",
): Promise<Id<"users">> {
  return insertUser(t, {
    name,
    role: "escotista",
    escotistaRamos: ramos,
    groupId,
    isAdmin: false,
    membershipStatus: "approved",
    onboardingComplete: true,
  });
}

async function insertScout(
  t: TestConvex,
  groupId: Id<"groups">,
  ramo: Ramo,
  name: string,
): Promise<Id<"users">> {
  return insertUser(t, {
    name,
    role: "escoteiro",
    ramo,
    groupId,
    membershipStatus: "approved",
    onboardingComplete: true,
  });
}

async function insertItems(
  t: TestConvex,
  userId: Id<"users">,
  specialtyId: string,
  items: { index: number; status: "approved" | "pending" }[],
) {
  await t.run(async (ctx) => {
    for (const { index, status } of items) {
      await ctx.db.insert("specialtyItemCompletions", {
        userId,
        ramoGroup: "younger",
        specialtyId,
        itemIndex: index,
        completedAt: 1,
        status,
      });
    }
  });
}

async function insertReports(
  t: TestConvex,
  userId: Id<"users">,
  specialtyId: string,
  steps: {
    step: "conhecer" | "fazer" | "compartilhar";
    status: "approved" | "pending";
  }[],
) {
  await t.run(async (ctx) => {
    for (const { step, status } of steps) {
      await ctx.db.insert("specialtyProjectReports", {
        userId,
        ramoGroup: "older",
        specialtyId,
        step,
        text: `relato ${step}`,
        completedAt: 1,
        status,
      });
    }
  });
}

async function itemRows(t: TestConvex, userId: Id<"users">) {
  const all = await t.run((ctx) =>
    ctx.db.query("specialtyItemCompletions").collect(),
  );
  return all.filter((r) => r.userId === userId);
}

async function approvalEvents(t: TestConvex) {
  const all = await t.run((ctx) => ctx.db.query("events").collect());
  return all.filter((e) => e.type === "approval");
}

/**
 * Troop fixture: admin (grupo creator) plus escoteiro-only, lobinho-only and
 * sênior-only escotistas; escoteiros A (administracao 3/6 → Nível 1), B (1
 * approved + 1 pending), a lobinho L (1 approved) and a sênior S
 * (comunicacoes: conhecer approved, fazer pending).
 */
async function seedTroop(t: TestConvex) {
  const { escotistaId: adminId, groupId } = await seedGroup(t);
  const chefeEscoteiro = await insertEscotista(t, groupId, ["escoteiro"], "Chefe E");
  const chefeLobinho = await insertEscotista(t, groupId, ["lobinho"], "Chefe L");
  const chefeSenior = await insertEscotista(t, groupId, ["senior"], "Chefe S");
  // seedGroup's own escoteiro has no especialidade rows; it only adds to counts.
  const a = await insertScout(t, groupId, "escoteiro", "Ana");
  const b = await insertScout(t, groupId, "escoteiro", "Bruno");
  const l = await insertScout(t, groupId, "lobinho", "Lia");
  const s = await insertScout(t, groupId, "senior", "Sofia");
  await insertItems(t, a, "administracao", [
    { index: 0, status: "approved" },
    { index: 1, status: "approved" },
    { index: 2, status: "approved" },
  ]);
  await insertItems(t, b, "administracao", [
    { index: 0, status: "approved" },
    { index: 3, status: "pending" },
  ]);
  await insertItems(t, l, "administracao", [{ index: 0, status: "approved" }]);
  await insertReports(t, s, "comunicacoes", [
    { step: "conhecer", status: "approved" },
    { step: "fazer", status: "pending" },
  ]);
  return { groupId, adminId, chefeEscoteiro, chefeLobinho, chefeSenior, a, b, l, s };
}

describe("getGroupSpecialtySummary", () => {
  test("counts only the viewer's visible escoteiros (visibilidade de ramo)", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    const mine = await as(t, f.chefeEscoteiro).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "younger" },
    );
    // seedGroup's escoteiro + A + B — never the lobinho.
    expect(mine!.escoteiroCount).toBe(3);
    expect(mine!.ramoGroups).toEqual(["younger"]);
    const adm = mine!.specialties.find((s) => s.specialtyId === "administracao")!;
    expect(adm.earnedCount).toBe(1);
    expect(adm.inProgressCount).toBe(1);
    expect(adm.pendingCount).toBe(1);
    // Closest to conquering first; the lobinho never leaks into the stack.
    expect(adm.avatars.map((p) => p._id)).toEqual([f.a, f.b]);
    expect(mine!.totals).toEqual({ earned: 1, inProgress: 1 });

    // The admin sees the lobinho too (same younger ramoGroup).
    const admin = await as(t, f.adminId).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "younger" },
    );
    expect(admin!.escoteiroCount).toBe(4);
    expect(admin!.ramoGroups).toEqual(["younger", "older"]);
    expect(
      admin!.specialties.find((s) => s.specialtyId === "administracao")!
        .inProgressCount,
    ).toBe(2);
  });

  test("older ramoGroup: earned only with all three etapas; other ramos empty", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    const senior = await as(t, f.chefeSenior).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "older" },
    );
    expect(senior!.escoteiroCount).toBe(1);
    expect(senior!.ramoGroups).toEqual(["older"]);
    expect(senior!.specialties).toEqual([
      {
        specialtyId: "comunicacoes",
        earnedCount: 0,
        inProgressCount: 1,
        pendingCount: 1,
        avatars: [{ _id: f.s, name: "Sofia", image: null }],
      },
    ]);

    // An escoteiro-only escotista asking for the older group sees nobody.
    const other = await as(t, f.chefeEscoteiro).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "older" },
    );
    expect(other!.escoteiroCount).toBe(0);
    expect(other!.specialties).toEqual([]);
  });

  test("seção observada narrows the counts; unplaced escoteiros stay", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    const s1 = await t.run((ctx) =>
      ctx.db.insert("sections", {
        groupId: f.groupId,
        name: "Tropa 1",
        ramo: "escoteiro",
      }),
    );
    const s2 = await t.run((ctx) =>
      ctx.db.insert("sections", {
        groupId: f.groupId,
        name: "Tropa 2",
        ramo: "escoteiro",
      }),
    );
    const c = await insertScout(t, f.groupId, "escoteiro", "Caio"); // unplaced
    await insertItems(t, c, "administracao", [{ index: 5, status: "approved" }]);
    await t.run(async (ctx) => {
      await ctx.db.patch(f.a, { sectionId: s1 });
      await ctx.db.patch(f.b, { sectionId: s2 });
      await ctx.db.patch(f.chefeEscoteiro, { observedSectionId: s1 });
    });

    const res = await as(t, f.chefeEscoteiro).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "younger" },
    );
    expect(res!.observedSectionName).toBe("Tropa 1");
    // A (Tropa 1) + unplaced Caio + seedGroup's unplaced escoteiro; B is out.
    expect(res!.escoteiroCount).toBe(3);
    const adm = res!.specialties.find((s) => s.specialtyId === "administracao")!;
    expect(adm.avatars.map((p) => p._id).sort()).toEqual([f.a, c].sort());
    expect(adm.pendingCount).toBe(0);

    const roster = await as(t, f.chefeEscoteiro).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "administracao", ramoGroup: "younger" },
    );
    expect(roster!.people.map((p) => p._id).sort()).toEqual([f.a, c].sort());
  });

  test("non-escotista or unauthenticated caller → null", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    expect(
      await as(t, f.a).query(api.specialties.getGroupSpecialtySummary, {
        ramoGroup: "younger",
      }),
    ).toBeNull();
    expect(
      await t.query(api.specialties.getGroupSpecialtySummary, {
        ramoGroup: "younger",
      }),
    ).toBeNull();
  });
});

describe("getSpecialtyRoster", () => {
  test("younger: per-item 'N têm' and Quem tem from the visible set", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    const r = await as(t, f.chefeEscoteiro).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "administracao", ramoGroup: "younger" },
    );
    if (!r || r.kind !== "younger") throw new Error("expected younger roster");
    expect(r.escoteiroCount).toBe(3);
    expect(r.items).toHaveLength(6);
    // Item 0: A + B approved (the lobinho's approval is outside the ramo).
    expect(r.items[0]).toEqual({ approvedCount: 2, pendingCount: 0 });
    expect(r.items[3]).toEqual({ approvedCount: 0, pendingCount: 1 });
    expect(
      r.people.map((p) => [p._id, p.approvedCount, p.pendingCount, p.level]),
    ).toEqual([
      [f.a, 3, 0, 1],
      [f.b, 1, 1, 0],
    ]);
    expect(r.earnedCount).toBe(1);
    expect(r.inProgressCount).toBe(1);
  });

  test("older: etapa counts, statuses and pending relatos", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    const r = await as(t, f.chefeSenior).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "comunicacoes", ramoGroup: "older" },
    );
    if (!r || r.kind !== "older") throw new Error("expected older roster");
    expect(r.steps.conhecer).toEqual({ approvedCount: 1, pendingCount: 0 });
    expect(r.steps.fazer).toEqual({ approvedCount: 0, pendingCount: 1 });
    expect(r.people).toHaveLength(1);
    expect(r.people[0]!.steps).toEqual({
      conhecer: "approved",
      fazer: "pending",
      compartilhar: null,
    });
    expect(r.pendingReports).toHaveLength(1);
    expect(r.pendingReports[0]!.step).toBe("fazer");
    expect(r.pendingReports[0]!.escoteiroId).toBe(f.s);

    // The same id in the younger catalog is a different especialidade: the
    // sênior's reports never show up there.
    const younger = await as(t, f.adminId).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "comunicacoes", ramoGroup: "younger" },
    );
    expect(younger!.kind).toBe("younger");
    expect(younger!.people).toEqual([]);
  });

  test("outside the viewer's ramo → empty; unknown id or non-viewer → null", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    const lob = await as(t, f.chefeLobinho).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "administracao", ramoGroup: "younger" },
    );
    expect(lob!.people.map((p) => p._id)).toEqual([f.l]);

    const senior = await as(t, f.chefeSenior).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "administracao", ramoGroup: "younger" },
    );
    expect(senior!.escoteiroCount).toBe(0);
    expect(senior!.people).toEqual([]);

    expect(
      await as(t, f.adminId).query(api.specialties.getSpecialtyRoster, {
        specialtyId: "nao-existe",
        ramoGroup: "younger",
      }),
    ).toBeNull();
    expect(
      await as(t, f.a).query(api.specialties.getSpecialtyRoster, {
        specialtyId: "administracao",
        ramoGroup: "younger",
      }),
    ).toBeNull();
  });
});

describe("setSpecialtyItemApproved", () => {
  test("mark an open item → approved row with approver + time, audit event", async () => {
    const t = newTest();
    const f = await seedTroop(t);

    await as(t, f.chefeEscoteiro).mutation(
      api.specialties.setSpecialtyItemApproved,
      { escoteiroId: f.a, specialtyId: "culinaria", itemIndex: 2, approved: true },
    );
    const rows = (await itemRows(t, f.a)).filter(
      (r) => r.specialtyId === "culinaria",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("approved");
    expect(rows[0]!.approvedBy).toBe(f.chefeEscoteiro);
    expect(typeof rows[0]!.approvedAt).toBe("number");
    expect(rows[0]!.ramoGroup).toBe("younger");
    const events = await approvalEvents(t);
    expect(events).toHaveLength(1);
    expect(events[0]!.subjectUserId).toBe(f.a);
    expect(events[0]!.actorUserId).toBe(f.chefeEscoteiro);
  });

  test("pending → approved promotes the escoteiro's submission (never deletes it)", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    const before = (await itemRows(t, f.b)).find((r) => r.itemIndex === 3)!;
    expect(before.status).toBe("pending");

    await as(t, f.chefeEscoteiro).mutation(
      api.specialties.setSpecialtyItemApproved,
      { escoteiroId: f.b, specialtyId: "administracao", itemIndex: 3, approved: true },
    );
    const after = (await itemRows(t, f.b)).find((r) => r.itemIndex === 3)!;
    expect(after._id).toBe(before._id);
    expect(after.status).toBe("approved");
    expect(after.completedAt).toBe(before.completedAt);
    expect(after.approvedBy).toBe(f.chefeEscoteiro);
    expect(await approvalEvents(t)).toHaveLength(1);
  });

  test("approved:true on an approved item is a no-op (no second event)", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await as(t, f.chefeEscoteiro).mutation(
      api.specialties.setSpecialtyItemApproved,
      { escoteiroId: f.a, specialtyId: "administracao", itemIndex: 0, approved: true },
    );
    expect(
      (await itemRows(t, f.a)).filter((r) => r.itemIndex === 0),
    ).toHaveLength(1);
    expect(await approvalEvents(t)).toHaveLength(0);
  });

  test("unmark an approved item → row deleted, level drops without complaint", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await as(t, f.chefeEscoteiro).mutation(
      api.specialties.setSpecialtyItemApproved,
      { escoteiroId: f.a, specialtyId: "administracao", itemIndex: 1, approved: false },
    );
    const rows = await itemRows(t, f.a);
    expect(rows.map((r) => r.itemIndex).sort((x, y) => x - y)).toEqual([0, 2]);

    // A was Nível 1 at 3/6; now 2/6 → no longer conquistou.
    const r = await as(t, f.chefeEscoteiro).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "administracao", ramoGroup: "younger" },
    );
    expect(r!.people.find((p) => p._id === f.a)).toMatchObject({
      approvedCount: 2,
    });
    expect(r!.earnedCount).toBe(0);
  });

  test("unmark on a pending item throws and keeps the submission; on no row is a no-op", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await expect(
      as(t, f.chefeEscoteiro).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.b,
        specialtyId: "administracao",
        itemIndex: 3,
        approved: false,
      }),
    ).rejects.toThrow("use Aprovar ou Rejeitar");
    expect(
      (await itemRows(t, f.b)).find((r) => r.itemIndex === 3)!.status,
    ).toBe("pending");

    const res = await as(t, f.chefeEscoteiro).mutation(
      api.specialties.setSpecialtyItemApproved,
      { escoteiroId: f.b, specialtyId: "administracao", itemIndex: 5, approved: false },
    );
    expect(res).toEqual([]);
    expect(await itemRows(t, f.b)).toHaveLength(2);
  });

  test("cross-ramo escotista is rejected and nothing is written", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await expect(
      as(t, f.chefeLobinho).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.a,
        specialtyId: "administracao",
        itemIndex: 4,
        approved: true,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu ramo");
    await expect(
      as(t, f.chefeLobinho).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.a,
        specialtyId: "administracao",
        itemIndex: 0,
        approved: false,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu ramo");
    expect(await itemRows(t, f.a)).toHaveLength(3);
  });

  test("escoteiro caller, older target, unknown specialty, bad index → throw", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await expect(
      as(t, f.b).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.a,
        specialtyId: "administracao",
        itemIndex: 4,
        approved: true,
      }),
    ).rejects.toThrow("Apenas escotistas");
    await expect(
      as(t, f.adminId).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.s,
        specialtyId: "administracao",
        itemIndex: 0,
        approved: true,
      }),
    ).rejects.toThrow("etapas");
    await expect(
      as(t, f.adminId).mutation(api.specialties.setSpecialtyItemApproved, {
        escoteiroId: f.a,
        specialtyId: "nao-existe",
        itemIndex: 0,
        approved: true,
      }),
    ).rejects.toThrow("Especialidade não encontrada");
    for (const itemIndex of [-1, 6, 1.5]) {
      await expect(
        as(t, f.adminId).mutation(api.specialties.setSpecialtyItemApproved, {
          escoteiroId: f.a,
          specialtyId: "administracao",
          itemIndex,
          approved: true,
        }),
      ).rejects.toThrow("Item inválido");
    }
  });
});

describe("submitSpecialtyStep on behalf (escotista registers an etapa)", () => {
  test("writes approved + logs; the third etapa earns the especialidade", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    const fazer = (await reportsFor(t, f.s)).find((r) => r.step === "fazer")!;
    await as(t, f.chefeSenior).mutation(api.specialties.approveSpecialtyStep, {
      reportId: fazer._id,
    });

    await as(t, f.chefeSenior).mutation(api.specialties.submitSpecialtyStep, {
      specialtyId: "comunicacoes",
      step: "compartilhar",
      text: "Apresentou o projeto à seção",
      targetUserId: f.s,
    });
    const compartilhar = (await reportsFor(t, f.s)).find(
      (r) => r.step === "compartilhar",
    )!;
    expect(compartilhar.status).toBe("approved");
    expect(compartilhar.approvedBy).toBe(f.chefeSenior);
    expect(
      (await approvalEvents(t)).some((e) =>
        e.summary === "Registrou: Comunicações — etapa Compartilhar",
      ),
    ).toBe(true);

    const r = await as(t, f.chefeSenior).query(
      api.specialties.getSpecialtyRoster,
      { specialtyId: "comunicacoes", ramoGroup: "older" },
    );
    expect(r!.earnedCount).toBe(1);
  });

  test("refuses to overwrite the escoteiro's pending relato; cross-ramo rejected", async () => {
    const t = newTest();
    const f = await seedTroop(t);
    await expect(
      as(t, f.chefeSenior).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "fazer",
        text: "texto do chefe",
        targetUserId: f.s,
      }),
    ).rejects.toThrow("use Aprovar ou Rejeitar");
    const fazer = (await reportsFor(t, f.s)).find((r) => r.step === "fazer")!;
    expect(fazer.status).toBe("pending");
    expect(fazer.text).toBe("relato fazer");

    await expect(
      as(t, f.chefeEscoteiro).mutation(api.specialties.submitSpecialtyStep, {
        specialtyId: "comunicacoes",
        step: "compartilhar",
        text: "x",
        targetUserId: f.s,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu ramo");
  });
});
