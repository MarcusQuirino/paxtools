/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { diffProgression } from "./lib/progression";
import { getEixosForRamo } from "../src/data/progression-data";
import { getCompletedBlockIds } from "../src/lib/completion-logic";

const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./approvals.ts": () => import("./approvals"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./events.ts": () => import("./events"),
  "./groups.ts": () => import("./groups"),
  "./http.ts": () => import("./http"),
  "./onboarding.ts": () => import("./onboarding"),
  "./plan.ts": () => import("./plan"),
  "./progression.ts": () => import("./progression"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function seedGroup(t: ReturnType<typeof convexTest>) {
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
  t: ReturnType<typeof convexTest>,
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

async function listEvents(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.query("events").collect());
}

// ---------------------------------------------------------------------------
// diffProgression — pure unit (the "literal" rule)
// ---------------------------------------------------------------------------
describe("diffProgression", () => {
  const snap = (stageIndex: number, lisDeOuro = false) => ({
    stageIndex,
    stageId: "x",
    stageName: "x",
    lisDeOuro,
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
    expect(ups).toEqual([{ kind: "lisDeOuro" }]);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");

    const eixos = getEixosForRamo("escoteiro");
    const blocos = eixos.flatMap((e) => e.blocos);

    const approved = new Set<string>();
    const countWith = (ids: Set<string>) =>
      getCompletedBlockIds(eixos, ids, new Set(), [], []).approved.size;

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
      stageName: "Trilha",
    });
  });

  test("approving a single unrelated action fires no level-up", async () => {
    const t = convexTest(schema, modules);
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
// Membership / group events
// ---------------------------------------------------------------------------
describe("group-level events", () => {
  test("banMember logs a group-scoped memberBan event", async () => {
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");

    await as(t, adminId).mutation(api.groups.banMember, { userId: escId });

    const events = await listEvents(t);
    const ban = events.find((e) => e.type === "memberBan");
    expect(ban).toMatchObject({ scope: "group", groupId });
    expect(ban?.subjectRamo).toBeUndefined();
  });

  test("approveMembership logs a memberJoin event", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    t: ReturnType<typeof convexTest>,
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
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    const res = await as(t, adminId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(res.page).toHaveLength(3);
  });

  test("non-admin sees only their-ramo events, not other ramos or group events", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    const { adminId, groupId } = await seedGroup(t);
    const escId = await seedEscoteiro(t, groupId, "escoteiro");
    await seedEvents(t, groupId, adminId, escId);

    const res = await as(t, escId).query(api.events.listTimeline, {
      paginationOpts: PAGE,
    });
    expect(res.page).toEqual([]);
  });

  // With a mix of matching, other-ramo, and group-level events, a non-admin
  // sees ONLY their-ramo events. (Real Convex can under-fill filtered pages
  // mid-stream — the UI auto-advances through empty pages; convex-test reads
  // ahead and fills, so that path is covered by reasoning + the e2e, not here.)
  test("non-admin scoping holds amid a mix of other-ramo and group events", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
