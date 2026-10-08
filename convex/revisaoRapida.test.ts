/// <reference types="bun" />
/**
 * The idempotent mutations behind Revisão rápida (#141): a reactive deck can
 * fire a stale or doubled swipe, so marking and adding to the Plano never
 * toggle, and each undo only reverts what its own swipe did.
 */
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";
import {
  addEscoteiro,
  addEscotista,
  as,
  seedGrupo,
  newTest,
  type TestConvex,
} from "./fixtures.testkit";

const ACTION_ID = "escoteiro:aprendizagem-continua:fixed:0";

async function completionsOf(t: TestConvex, userId: Id<"users">) {
  return t.run((ctx) =>
    ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
  );
}

async function allEvents(t: TestConvex) {
  return t.run((ctx) => ctx.db.query("events").collect());
}

/**
 * Approve 3 full blocos plus all of a 4th bloco but its first fixed ação, so
 * that marking the returned ação approved completes bloco #4 → etapa Trilha.
 */
async function seedOneShyOfTrilha(
  t: TestConvex,
  esc: Id<"users">,
  approver: Id<"users">,
): Promise<string> {
  const blocos = getEixosForRamo("escoteiro")
    .flatMap((e) => e.blocos)
    .filter((b) => b.fixedActions.length > 0);
  const ids = (b: (typeof blocos)[number]) => [
    ...b.fixedActions.map((a) => a.id),
    ...b.variableActions.map((a) => a.id),
  ];
  const boundary = blocos[3]!;
  const lastAction = boundary.fixedActions[0]!.id;
  const approved = [...blocos.slice(0, 3).flatMap(ids), ...ids(boundary)].filter(
    (id) => id !== lastAction,
  );
  await t.run(async (ctx) => {
    for (const actionId of approved) {
      await ctx.db.insert("actionCompletions", {
        userId: esc,
        actionId,
        completedAt: 1,
        status: "approved",
        approvedBy: approver,
        approvedAt: 1,
      });
    }
  });
  return lastAction;
}

describe("markAction", () => {
  test("escoteiro marking an unmarked ação creates one pending conclusão; marking again does nothing", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);

    const first = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });
    expect(first).toMatchObject({ created: true, status: "pending", eventIds: [], toasts: [] });

    const second = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });
    expect(second).toMatchObject({ created: false, completionId: null, eventIds: [] });

    const rows = await completionsOf(t, esc);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actionId: ACTION_ID, status: "pending" });
    expect(first.completionId).toBe(rows[0]!._id);
  });

  test("escotista marking for an escoteiro approves it directly and the receipt carries the approval event", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);

    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
      targetUserId: esc,
    });

    const rows = await completionsOf(t, esc);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "approved", approvedBy: chefe });
    expect(receipt).toMatchObject({
      created: true,
      completionId: rows[0]!._id,
      status: "approved",
      toasts: [],
    });

    const events = await allEvents(t);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "approval", actorUserId: chefe, subjectUserId: esc });
    expect(receipt.eventIds).toEqual([events[0]!._id]);
  });

  test("a mark that levels the escoteiro up carries the approval and levelUp event ids, plus the toast", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const lastAction = await seedOneShyOfTrilha(t, esc, chefe);

    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: lastAction,
      targetUserId: esc,
    });

    expect(receipt.toasts).toEqual([
      expect.objectContaining({ kind: "levelUp", stageName: "Trilha" }),
    ]);
    const events = await allEvents(t);
    expect(events.map((e) => e.type).sort()).toEqual(["approval", "levelUp"]);
    expect([...receipt.eventIds].sort()).toEqual(events.map((e) => e._id).sort());
  });

  test("escotista marking an ação the escoteiro already has (even pending) does nothing", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    await as(t, esc).mutation(api.progression.markAction, { actionId: ACTION_ID });

    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
      targetUserId: esc,
    });

    expect(receipt).toMatchObject({ created: false, eventIds: [] });
    const rows = await completionsOf(t, esc);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");
    expect(await allEvents(t)).toEqual([]);
  });
});

/** The part of a mark's receipt the client hands back to undo it. */
function undoArgs(receipt: {
  completionId: Id<"actionCompletions"> | null;
  status: "pending" | "approved" | null;
  eventIds: Id<"events">[];
}) {
  return {
    completionId: receipt.completionId!,
    status: receipt.status!,
    eventIds: receipt.eventIds,
  };
}

describe("undoMarkAction", () => {
  test("escoteiro undoing their mark removes the pending conclusão", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const receipt = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });

    const res = await as(t, esc).mutation(api.progression.undoMarkAction, undoArgs(receipt));

    expect(res).toEqual({ removed: true });
    expect(await completionsOf(t, esc)).toEqual([]);
  });

  test("undoing twice is harmless: the second undo removes nothing", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const receipt = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });
    await as(t, esc).mutation(api.progression.undoMarkAction, undoArgs(receipt));

    const res = await as(t, esc).mutation(api.progression.undoMarkAction, undoArgs(receipt));
    expect(res).toEqual({ removed: false });
  });

  test("escotista undoing their mark removes the approved conclusão and every event the mark logged", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const lastAction = await seedOneShyOfTrilha(t, esc, chefe);
    // An unrelated earlier approval (a bloco the seed didn't touch) stays on the timeline.
    const untouched = getEixosForRamo("escoteiro")
      .flatMap((e) => e.blocos)
      .filter((b) => b.fixedActions.length > 0)[5]!;
    await as(t, chefe).mutation(api.progression.markAction, {
      actionId: untouched.fixedActions[0]!.id,
      targetUserId: esc,
    });
    const [unrelated] = await allEvents(t);
    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: lastAction,
      targetUserId: esc,
    });

    const res = await as(t, chefe).mutation(api.progression.undoMarkAction, {
      ...undoArgs(receipt),
      targetUserId: esc,
    });

    expect(res).toEqual({ removed: true });
    const rows = await completionsOf(t, esc);
    expect(rows.some((r) => r.actionId === lastAction)).toBe(false);
    expect((await allEvents(t)).map((e) => e._id)).toEqual([unrelated!._id]);
  });

  test("an escotista's undo only deletes events its own mark logged, even if the receipt lists others", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const earlier = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: "escoteiro:aprendizagem-continua:fixed:1",
      targetUserId: esc,
    });
    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
      targetUserId: esc,
    });

    // A stale/forged receipt that also lists the earlier mark's approval event.
    const res = await as(t, chefe).mutation(api.progression.undoMarkAction, {
      ...undoArgs(receipt),
      eventIds: [...earlier.eventIds, ...receipt.eventIds],
      targetUserId: esc,
    });

    expect(res).toEqual({ removed: true });
    expect((await allEvents(t)).map((e) => e._id)).toEqual(earlier.eventIds);
  });

  test("escoteiro's undo removes nothing (no error) once an escotista has approved the conclusão in the meantime", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const receipt = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });
    await as(t, chefe).mutation(api.approvals.approveAction, {
      completionId: receipt.completionId!,
    });

    const res = await as(t, esc).mutation(api.progression.undoMarkAction, undoArgs(receipt));

    expect(res).toEqual({ removed: false });
    const rows = await completionsOf(t, esc);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("approved");
  });

  test("escotista's undo leaves a conclusão that isn't the one their mark created", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    // The escoteiro marked it themselves (pending), then another escotista approved it.
    const own = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });
    await as(t, adminId).mutation(api.approvals.approveAction, {
      completionId: own.completionId!,
    });
    const events = await allEvents(t);

    // A forged/stale receipt claiming chefe's approval of that row.
    const res = await as(t, chefe).mutation(api.progression.undoMarkAction, {
      completionId: own.completionId!,
      status: "approved",
      eventIds: events.map((e) => e._id),
      targetUserId: esc,
    });

    expect(res).toEqual({ removed: false });
    expect(await completionsOf(t, esc)).toHaveLength(1);
    expect(await allEvents(t)).toHaveLength(events.length);
  });
});

describe("addToPlan / removeFromPlan", () => {
  const KEY = `action:${ACTION_ID}`;

  test("adding appends the ação to the end of the Plano; adding again keeps it and reports not added", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    await as(t, esc).mutation(api.plan.togglePlanned, { itemKey: "custom:first" });

    expect(await as(t, esc).mutation(api.plan.addToPlan, { itemKey: KEY })).toEqual({
      added: true,
    });
    expect(await as(t, esc).mutation(api.plan.addToPlan, { itemKey: KEY })).toEqual({
      added: false,
    });

    const plan = await as(t, esc).query(api.plan.getMyPlan, {});
    expect(plan.map((p) => p.itemKey)).toEqual(["custom:first", KEY]);
  });

  test("undo removes the item it added, and removing an absent item is a no-op", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    await as(t, esc).mutation(api.plan.addToPlan, { itemKey: KEY });

    expect(await as(t, esc).mutation(api.plan.removeFromPlan, { itemKey: KEY })).toEqual({
      removed: true,
    });
    expect(await as(t, esc).mutation(api.plan.removeFromPlan, { itemKey: KEY })).toEqual({
      removed: false,
    });
    expect(await as(t, esc).query(api.plan.getMyPlan, {})).toEqual([]);
  });

  test("the Plano stays escoteiro-only: a target escoteiro is rejected", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);

    await expect(
      as(t, chefe).mutation(api.plan.addToPlan, {
        itemKey: KEY,
        // @ts-expect-error — the Plano mutations take no target
        targetUserId: esc,
      }),
    ).rejects.toThrow(/targetUserId/);
    await expect(
      as(t, chefe).mutation(api.plan.removeFromPlan, {
        itemKey: KEY,
        // @ts-expect-error — the Plano mutations take no target
        targetUserId: esc,
      }),
    ).rejects.toThrow(/targetUserId/);
    expect(await as(t, esc).query(api.plan.getMyPlan, {})).toEqual([]);
  });

  test("an invalid item key is rejected", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    await expect(
      as(t, esc).mutation(api.plan.addToPlan, { itemKey: "garbage" }),
    ).rejects.toThrow("Chave de item inválida");
  });
});

describe("mark/undo permissions", () => {
  test("an escotista outside the grupo can't mark or undo for an escoteiro", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const other = await seedGrupo(t, { name: "Outro" });
    const esc = await addEscoteiro(t, groupId);
    const outsider = await addEscotista(t, other.groupId, ["escoteiro"]);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
      targetUserId: esc,
    });

    await expect(
      as(t, outsider).mutation(api.progression.markAction, {
        actionId: "escoteiro:aprendizagem-continua:fixed:1",
        targetUserId: esc,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu grupo");
    await expect(
      as(t, outsider).mutation(api.progression.undoMarkAction, {
        ...undoArgs(receipt),
        targetUserId: esc,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu grupo");
    expect(await completionsOf(t, esc)).toHaveLength(1);
  });

  test("an escotista who doesn't accompany the escoteiro's ramo can't mark or undo", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const lobinhoChefe = await addEscotista(t, groupId, ["lobinho"]);
    const chefe = await addEscotista(t, groupId, ["escoteiro"]);
    const receipt = await as(t, chefe).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
      targetUserId: esc,
    });

    await expect(
      as(t, lobinhoChefe).mutation(api.progression.markAction, {
        actionId: "escoteiro:aprendizagem-continua:fixed:1",
        targetUserId: esc,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu ramo");
    await expect(
      as(t, lobinhoChefe).mutation(api.progression.undoMarkAction, {
        ...undoArgs(receipt),
        targetUserId: esc,
      }),
    ).rejects.toThrow("Este escoteiro não pertence ao seu ramo");
    expect(await completionsOf(t, esc)).toHaveLength(1);
  });

  test("an escoteiro can't undo another escoteiro's conclusão", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const esc = await addEscoteiro(t, groupId);
    const intruder = await addEscoteiro(t, groupId);
    const receipt = await as(t, esc).mutation(api.progression.markAction, {
      actionId: ACTION_ID,
    });

    await expect(
      as(t, intruder).mutation(api.progression.undoMarkAction, undoArgs(receipt)),
    ).rejects.toThrow("Não encontrado");
    expect(await completionsOf(t, esc)).toHaveLength(1);
  });
});
