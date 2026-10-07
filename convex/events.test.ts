/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { diffProgression } from "./lib/progression";
import { describeCompletion } from "./lib/events";
import { getEixosForRamo } from "../src/data/progression-data";
import { deriveProgression } from "../src/lib/progression-state";
import { as, newTest, type Ramo, type TestConvex } from "./fixtures.testkit";

async function seedGroup(t: TestConvex) {
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin",
      role: "escotista",
      escotistaRamos: ["escoteiro", "senior"],
      onboardingComplete: true,
    }),
  );
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "G",
      number: "1",
      password: "AAAAAA",
      createdBy: adminId,
      createdAt: 1,
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

async function seedEscoteiro(
  t: TestConvex,
  groupId: Id<"groups">,
  ramo: Ramo,
  name = "Esc",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name,
      role: "escoteiro",
      ramo,
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    }),
  );
}

async function listEvents(t: TestConvex) {
  return await t.run(async (ctx) => ctx.db.query("events").collect());
}

// ---------------------------------------------------------------------------
// diffProgression — pure unit (the "literal" rule)
// ---------------------------------------------------------------------------
describe("diffProgression", () => {
  const snap = (stageIndex: number, lisDeOuro = false) => ({
    ramo: "escoteiro" as const,
    stageIndex,
    stageId: "x",
    stageName: "x",
    lisDeOuro,
    completedBlockCount: 0,
  });

  test("no crossing → no level-ups", () => {
    expect(diffProgression(snap(1), snap(1))).toEqual([]);
  });

  test("single upward crossing → one levelUp", () => {
    const ups = diffProgression(snap(0), snap(1));
    expect(ups).toHaveLength(1);
    expect(ups[0]).toMatchObject({ kind: "levelUp", stageName: "Trilha" });
  });

  test("multi-stage jump → one levelUp per boundary", () => {
    const ups = diffProgression(snap(0), snap(3));
    expect(ups.map((u) => u.kind)).toEqual(["levelUp", "levelUp", "levelUp"]);
    expect(ups.map((u) => (u.kind === "levelUp" ? u.stageName : null))).toEqual([
      "Trilha",
      "Rumo",
      "Travessia",
    ]);
  });

  test("lis de ouro false→true → distinct lisDeOuro event", () => {
    const ups = diffProgression(snap(3, false), snap(3, true));
    expect(ups).toEqual([{ kind: "lisDeOuro", irrName: "Lis de Ouro" }]);
  });

  test("downward (reject) → nothing", () => {
    expect(diffProgression(snap(2), snap(1))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Approval / rejection events
// ---------------------------------------------------------------------------
describe("approval & rejection events", () => {
  test("approving an action logs a ramo-scoped approval event", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro", "João");

    const completionId = await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escId,
        actionId: "escoteiro:aprendizagem-continua:fixed:0",
        completedAt: 1,
        status: "pending",
      }),
    );

    await as(t, adminId).mutation(api.approvals.approveAction, { completionId });

    const events = await listEvents(t);
    const approval = events.find((e) => e.type === "approval");
    expect(approval).toBeDefined();
    expect(approval).toMatchObject({
      scope: "ramo",
      subjectRamo: "escoteiro",
      subjectName: "João",
      actorName: "Admin",
    });
    expect(approval?.summary?.startsWith("Aprovou:")).toBe(true);
  });

  test("rejecting logs a rejection event before deleting the row", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");

    const completionId = await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escId,
        actionId: "escoteiro:aprendizagem-continua:fixed:0",
        completedAt: 1,
        status: "pending",
      }),
    );

    await as(t, adminId).mutation(api.approvals.rejectAction, { completionId });

    const events = await listEvents(t);
    expect(events.some((e) => e.type === "rejection")).toBe(true);
    const gone = await t.run(async (ctx) => ctx.db.get(completionId));
    expect(gone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Level-up detection (real stage crossing)
// ---------------------------------------------------------------------------
describe("level-up detection", () => {
  test("approving the action that completes the 4th block crosses to Trilha", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");

    const eixos = getEixosForRamo("escoteiro");
    const blocos = eixos.flatMap((e) => e.blocos);

    const approved = new Set<string>();
    const countWith = (ids: Set<string>) =>
      deriveProgression({
        ramo: "escoteiro",
        actions: [...ids].map((actionId) => ({ actionId })),
        customActions: [],
        irrItems: [],
        earnedSpecialtyIds: [],
      }).completedBlockCount;

    // Greedily complete whole blocks (all their actions approved) until exactly
    // 3 blocks count as complete — one short of Trilha (4). Robust to any
    // auto-complete blocks in the data.
    let i = 0;
    while (countWith(approved) < 3 && i < blocos.length) {
      const b = blocos[i]!;
      if (b.fixedActions.length === 0) {
        i++;
        continue;
      }
      const trial = new Set(approved);
      b.fixedActions.forEach((_, idx) =>
        trial.add(`escoteiro:${b.id}:fixed:${idx}`),
      );
      b.variableActions.forEach((_, idx) =>
        trial.add(`escoteiro:${b.id}:variable:${idx}`),
      );
      if (countWith(trial) > countWith(approved)) {
        for (const id of trial) approved.add(id);
      }
      i++;
    }
    expect(countWith(approved)).toBe(3);

    // Boundary block: the first subsequent block with fixed actions. Approve
    // all but its first fixed action; that one stays pending and, once approved,
    // completes the block → Trilha.
    const boundaryBlock = blocos.slice(i).find((b) => b.fixedActions.length > 0);
    expect(boundaryBlock).toBeDefined();
    const b = boundaryBlock!;
    const pendingFixedId = `escoteiro:${b.id}:fixed:0`;
    b.fixedActions.forEach((_, idx) => {
      if (idx === 0) return;
      approved.add(`escoteiro:${b.id}:fixed:${idx}`);
    });
    b.variableActions.forEach((_, idx) =>
      approved.add(`escoteiro:${b.id}:variable:${idx}`),
    );

    // Sanity: with the pending one excluded we are still at 3.
    expect(countWith(approved)).toBe(3);
    // ...and adding it would reach 4.
    expect(countWith(new Set([...approved, pendingFixedId]))).toBe(4);

    // Persist: approved rows + the one pending row to approve.
    await t.run(async (ctx) => {
      for (const actionId of approved) {
        await ctx.db.insert("actionCompletions", {
          userId: escId,
          actionId,
          completedAt: 1,
          status: "approved",
          approvedBy: adminId,
          approvedAt: 1,
        });
      }
    });
    const completionId = await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escId,
        actionId: pendingFixedId,
        completedAt: 1,
        status: "pending",
      }),
    );

    const toasts = await as(t, adminId).mutation(api.approvals.approveAction, {
      completionId,
    });

    expect(toasts).toEqual([
      expect.objectContaining({ kind: "levelUp", stageName: "Trilha" }),
    ]);

    const events = await listEvents(t);
    const levelUp = events.find((e) => e.type === "levelUp");
    expect(levelUp).toMatchObject({
      scope: "ramo",
      subjectRamo: "escoteiro",
      stageId: "trilha",
      stageName: "Trilha",
      summary: "Subiu para Trilha",
    });
  });

  test("approving a single unrelated action fires no level-up", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    const completionId = await t.run(async (ctx) =>
      ctx.db.insert("actionCompletions", {
        userId: escId,
        actionId: "escoteiro:aprendizagem-continua:fixed:0",
        completedAt: 1,
        status: "pending",
      }),
    );
    const toasts = await as(t, adminId).mutation(api.approvals.approveAction, {
      completionId,
    });
    expect(toasts).toEqual([]);
    const events = await listEvents(t);
    expect(events.some((e) => e.type === "levelUp")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IRR conquered (lisDeOuro) — the approval that completes the IRR
// ---------------------------------------------------------------------------
describe("IRR level-up", () => {
  /**
   * Every bloco of `ramo` complete (all its ações approved) and every manual
   * IRR item approved except irr_corte_honra, which is left pending. Approving
   * that one row is what completes the IRR. Returns the pending row's id.
   */
  async function seedOneStepFromIrr(
    t: TestConvex,
    userId: Id<"users">,
    ramo: Ramo,
    adminId: Id<"users">,
  ) {
    const actionIds = getEixosForRamo(ramo)
      .flatMap((e) => e.blocos)
      .flatMap((b) => [...b.fixedActions, ...b.variableActions])
      .map((a) => a.id);
    const approvedIrr = ["irr_promessa", "irr_jornada", "irr_autoavaliacao"];

    // Sanity: the seed sits exactly one approval short of the IRR.
    const state = (irr: string[]) =>
      deriveProgression({
        ramo,
        actions: actionIds.map((actionId) => ({ actionId })),
        customActions: [],
        irrItems: irr.map((itemId) => ({ itemId })),
        earnedSpecialtyIds: [],
      });
    expect(state(approvedIrr).blocksComplete).toBe(true);
    expect(state(approvedIrr).irrComplete).toBe(false);
    expect(state([...approvedIrr, "irr_corte_honra"]).irrComplete).toBe(true);

    return await t.run(async (ctx) => {
      for (const actionId of actionIds) {
        await ctx.db.insert("actionCompletions", {
          userId,
          actionId,
          completedAt: 1,
          status: "approved",
          approvedBy: adminId,
          approvedAt: 1,
        });
      }
      for (const itemId of approvedIrr) {
        await ctx.db.insert("irrCompletions", {
          userId,
          ramo,
          itemId,
          completedAt: 1,
          status: "approved",
          approvedBy: adminId,
          approvedAt: 1,
        });
      }
      return await ctx.db.insert("irrCompletions", {
        userId,
        ramo,
        itemId: "irr_corte_honra",
        completedAt: 1,
        status: "pending",
      });
    });
  }

  test("approving the last IRR item logs a lisDeOuro event and toasts the Lis de Ouro", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro", "João");
    const completionId = await seedOneStepFromIrr(t, escId, "escoteiro", adminId);

    const toasts = await as(t, adminId).mutation(api.approvals.approveIrrItem, {
      completionId,
    });

    expect(toasts).toEqual([
      {
        subjectUserId: escId,
        subjectName: "João",
        kind: "lisDeOuro",
        stageName: "Lis de Ouro",
      },
    ]);
    const events = await listEvents(t);
    const irr = events.filter((e) => e.type === "lisDeOuro");
    expect(irr).toHaveLength(1);
    expect(irr[0]).toMatchObject({
      scope: "ramo",
      groupId,
      subjectRamo: "escoteiro",
      subjectUserId: escId,
      actorUserId: adminId,
      summary: "Conquistou a Lis de Ouro",
    });
    // An IRR is not an etapa: no stage on the row, and no levelUp alongside
    // (every bloco was already complete before the approval).
    expect(irr[0]!.stageId).toBeUndefined();
    expect(irr[0]!.stageName).toBeUndefined();
    expect(events.some((e) => e.type === "levelUp")).toBe(false);
    // The approval itself is audited too, with the item's short label.
    expect(events.find((e) => e.type === "approval")?.summary).toBe(
      "Aprovou: Corte de Honra",
    );
  });

  test("another ramo's IRR is named from its rules (sênior → Escoteiro da Pátria), via a direct mark", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "senior", "Sofia");
    await seedOneStepFromIrr(t, escId, "senior", adminId);

    // The escotista ticks the pending item on the escoteiro's page.
    const toasts = await as(t, adminId).mutation(api.progression.toggleIrrItem, {
      itemId: "irr_corte_honra",
      targetUserId: escId,
    });

    expect(toasts).toEqual([
      expect.objectContaining({ kind: "lisDeOuro", stageName: "Escoteiro da Pátria" }),
    ]);
    const events = await listEvents(t);
    expect(events.find((e) => e.type === "lisDeOuro")).toMatchObject({
      subjectRamo: "senior",
      summary: "Conquistou a Escoteiro da Pátria",
    });
    // Non-escoteiro ramos label the item with their own IRR text.
    expect(events.find((e) => e.type === "approval")?.summary).toBe(
      "Aprovou: Ser avaliado positivamente pela sua Patrulha e pelos Escotistas",
    );
  });

  test("approving a non-final IRR item fires nothing", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    const completionId = await t.run((ctx) =>
      ctx.db.insert("irrCompletions", {
        userId: escId,
        ramo: "escoteiro",
        itemId: "irr_promessa",
        completedAt: 1,
        status: "pending",
      }),
    );
    const toasts = await as(t, adminId).mutation(api.approvals.approveIrrItem, {
      completionId,
    });
    expect(toasts).toEqual([]);
    const events = await listEvents(t);
    expect(events.some((e) => e.type === "lisDeOuro")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// describeCompletion — the audit label fallbacks
// ---------------------------------------------------------------------------
describe("describeCompletion", () => {
  const blocoA = getEixosForRamo("escoteiro")[0]!.blocos[0]!;

  test("an action resolves to its catalog text", () => {
    expect(
      describeCompletion("escoteiro", {
        kind: "action",
        actionId: `escoteiro:${blocoA.id}:fixed:0`,
      }),
    ).toBe(blocoA.fixedActions[0]!.text);
  });

  test("an action falls back to its raw id when unparseable, its bloco is unknown, or its index is out of range", () => {
    for (const actionId of [
      "garbage",
      "escoteiro:bloco-inexistente:fixed:0",
      `escoteiro:${blocoA.id}:fixed:99`,
      `escoteiro:${blocoA.id}:variable:99`,
    ]) {
      expect(describeCompletion("escoteiro", { kind: "action", actionId })).toBe(
        actionId,
      );
    }
  });

  test("an action of a user with no ramo resolves from the id's own ramo", () => {
    const lobinhoBloco = getEixosForRamo("lobinho")[0]!.blocos[0]!;
    expect(
      describeCompletion(null, {
        kind: "action",
        actionId: `lobinho:${lobinhoBloco.id}:fixed:0`,
      }),
    ).toBe(lobinhoBloco.fixedActions[0]!.text);
  });

  // BUG: the label resolves from the subject's *current* ramo, not the ramo the
  // id carries. Bloco ids are shared across ramos, so a past-ramo ação still
  // pending after setMemberRamo (getPendingForGroup lists it, approveAction
  // accepts it) is audited with the new ramo's text for the same slot.
  test.failing("an action approved after a ramo change is labelled with its own ramo's text", () => {
    const lobinhoBloco = getEixosForRamo("lobinho")[0]!.blocos[0]!;
    expect(
      describeCompletion("escoteiro", {
        kind: "action",
        actionId: `lobinho:${lobinhoBloco.id}:fixed:0`,
      }),
    ).toBe(lobinhoBloco.fixedActions[0]!.text);
  });

  test("a custom action uses its text, or a generic label when empty", () => {
    expect(describeCompletion("escoteiro", { kind: "custom", text: "Fiz X" })).toBe(
      "Fiz X",
    );
    expect(describeCompletion("escoteiro", { kind: "custom", text: "" })).toBe(
      "Ação personalizada",
    );
  });

  test("an escoteiro (or ramo-less) IRR item keeps its short audit label; unknown ids pass through", () => {
    expect(describeCompletion("escoteiro", { kind: "irr", itemId: "irr_jornada" })).toBe(
      "Jornada de Travessia",
    );
    expect(describeCompletion(undefined, { kind: "irr", itemId: "irr_promessa" })).toBe(
      "Promessa Escoteira",
    );
    expect(describeCompletion("escoteiro", { kind: "irr", itemId: "irr_x" })).toBe("irr_x");
  });

  test("another ramo's IRR item uses that ramo's item text, falling back to the IRR name", () => {
    expect(describeCompletion("lobinho", { kind: "irr", itemId: "irr_jornada" })).toBe(
      "Vivenciou o Caminho Caçador",
    );
    expect(describeCompletion("pioneiro", { kind: "irr", itemId: "irr_x" })).toBe(
      "Insígnia de BP",
    );
  });
});

// ---------------------------------------------------------------------------
// Membership / group events
// ---------------------------------------------------------------------------
describe("group-level events", () => {
  test("banMember logs a group-scoped memberBan event", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");

    await as(t, adminId).mutation(api.groups.banMember, { userId: escId });

    const events = await listEvents(t);
    const ban = events.find((e) => e.type === "memberBan");
    expect(ban).toMatchObject({ scope: "group", groupId });
    expect(ban?.subjectRamo).toBeUndefined();
  });

  test("approveMembership logs a memberJoin event", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const pendingId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "New",
        role: "escoteiro",
        ramo: "escoteiro",
        groupId,
        membershipStatus: "pending",
      }),
    );
    await as(t, adminId).mutation(api.groups.approveMembership, {
      userId: pendingId,
    });
    const events = await listEvents(t);
    expect(events.some((e) => e.type === "memberJoin")).toBe(true);
  });

  test("setMemberRamo no-op does not log a phantom ramoChange", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    // Same ramo it already has → should be a no-op, no event.
    await as(t, adminId).mutation(api.groups.setMemberRamo, {
      userId: escId,
      ramo: "escoteiro",
    });
    const events = await listEvents(t);
    expect(events.some((e) => e.type === "ramoChange")).toBe(false);
    // A real change does log.
    await as(t, adminId).mutation(api.groups.setMemberRamo, {
      userId: escId,
      ramo: "senior",
    });
    expect((await listEvents(t)).some((e) => e.type === "ramoChange")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Timeline query — visibility & scoping
// ---------------------------------------------------------------------------
describe("listTimeline visibility", () => {
  const PAGE = { numItems: 50, cursor: null };

  async function seedEvents(
    t: TestConvex,
    groupId: Id<"groups">,
    actorId: Id<"users">,
    subjectId: Id<"users">,
  ) {
    await t.run(async (ctx) => {
      await ctx.db.insert("events", {
        type: "approval",
        scope: "ramo",
        groupId,
        subjectRamo: "escoteiro",
        actorUserId: actorId,
        subjectUserId: subjectId,
        summary: "ramo-escoteiro",
      });
      await ctx.db.insert("events", {
        type: "approval",
        scope: "ramo",
        groupId,
        subjectRamo: "pioneiro",
        actorUserId: actorId,
        subjectUserId: subjectId,
        summary: "ramo-pioneiro",
      });
      await ctx.db.insert("events", {
        type: "memberBan",
        scope: "group",
        groupId,
        actorUserId: actorId,
        subjectUserId: subjectId,
        summary: "group-level",
      });
    });
  }

  test("admin sees every event in the group", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    const res = await as(t, adminId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(res.page).toHaveLength(3);
  });

  test("non-admin sees only their-ramo events, not other ramos or group events", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    // A non-admin escotista who only covers the "escoteiro" ramo.
    const leadId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Lead",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
        groupId,
        membershipStatus: "approved",
        isAdmin: false,
      }),
    );

    const res = await as(t, leadId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(res.page).toHaveLength(1);
    expect(res.page[0]?.summary).toBe("ramo-escoteiro");
  });

  test("legacy creator (isAdmin unset) still sees group events via createdBy", async () => {
    const t = newTest();
    // A group creator that predates the isAdmin flag: created the group but has
    // no isAdmin and no escotistaRamos, and hasn't run a backfilling mutation.
    const creatorId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Legacy",
        role: "escotista",
        membershipStatus: "approved",
      }),
    );
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("groups", {
        name: "G",
        number: "9",
        password: "ZZZZZZ",
        createdBy: creatorId,
        createdAt: 1,
      }),
    );
    await t.run(async (ctx) => ctx.db.patch(creatorId, { groupId }));
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, creatorId, escId);

    const res = await as(t, creatorId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    // Sees the group-level event too (not just ramo) — admin visibility.
    expect(res.page.some((e) => e.summary === "group-level")).toBe(true);
  });

  test("escoteiros get nothing", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    const res = await as(t, escId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(res.page).toEqual([]);
  });

  test("unauthenticated, banned, and pending callers get a terminal empty page", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    // Unauthenticated: silent empty, never a throw.
    const anon = await t.query(api.events.listTimeline, { paginationOpts: PAGE });
    expect(anon.page).toEqual([]);
    expect(anon.isDone).toBe(true);

    // Banned escotista.
    const bannedId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Banned",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
        groupId,
        membershipStatus: "approved",
        bannedAt: 1,
      }),
    );
    const banned = await as(t, bannedId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(banned.page).toEqual([]);

    // Pending-membership escotista.
    const pendingId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Pending",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
        groupId,
        membershipStatus: "pending",
      }),
    );
    const pending = await as(t, pendingId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(pending.page).toEqual([]);
  });

  // With a mix of matching, other-ramo, and group-level events, a non-admin
  // sees ONLY their-ramo events. (Real Convex can under-fill filtered pages
  // mid-stream — the UI auto-advances through empty pages; convex-test reads
  // ahead and fills, so that path is covered by reasoning + the e2e, not here.)
  test("non-admin scoping holds amid a mix of other-ramo and group events", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    const leadId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Lead",
        role: "escotista",
        escotistaRamos: ["escoteiro"],
        groupId,
        membershipStatus: "approved",
        isAdmin: false,
      }),
    );

    // Oldest → newest: 2 matching (escoteiro), then 3 non-matching. Newest-first
    // ordering means the first window (numItems 2) is entirely non-matching.
    await t.run(async (ctx) => {
      for (const s of ["match-a", "match-b"]) {
        await ctx.db.insert("events", {
          type: "approval",
          scope: "ramo",
          groupId,
          subjectRamo: "escoteiro",
          actorUserId: adminId,
          subjectUserId: escId,
          summary: s,
        });
      }
      for (const s of ["other-1", "other-2"]) {
        await ctx.db.insert("events", {
          type: "approval",
          scope: "ramo",
          groupId,
          subjectRamo: "pioneiro",
          actorUserId: adminId,
          subjectUserId: escId,
          summary: s,
        });
      }
      await ctx.db.insert("events", {
        type: "memberBan",
        scope: "group",
        groupId,
        actorUserId: adminId,
        subjectUserId: escId,
        summary: "grp",
      });
    });

    const res = await as(t, leadId).query(api.events.listTimeline, {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const seen = res.page
      .map((e) => e.summary)
      .filter((s): s is string => !!s)
      .sort();
    // Only the two escoteiro-ramo events surface — never other-ramo or group.
    expect(seen).toEqual(["match-a", "match-b"]);
  });

  test("paginates", async () => {
    const t = newTest();
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("events", {
          type: "approval",
          scope: "ramo",
          groupId,
          subjectRamo: "escoteiro",
          actorUserId: adminId,
          subjectUserId: escId,
          summary: `e${i}`,
        });
      }
    });
    const first = await as(t, adminId).query(api.events.listTimeline, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);
    const second = await as(t, adminId).query(api.events.listTimeline, {
      paginationOpts: { numItems: 10, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(3);
  });
});
