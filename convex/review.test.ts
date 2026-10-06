/// <reference types="bun" />
/**
 * Conclusão review (convex/lib/review), pinned once for every kind of
 * conclusão through the public mutations an escotista calls: approval writes
 * approver + audit line, rejection removes (or resets) + audit line, a
 * non-pending row is refused, and visibilidade de ramo is enforced.
 */
import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";
import {
  addEscotista,
  addEscoteiro,
  as,
  newTest,
  reviewEvents,
  seedGrupo,
  type Ramo,
  type TestConvex,
} from "./fixtures.testkit";

const ACTION = getEixosForRamo("escoteiro")
  .flatMap((e) => e.blocos)
  .find((b) => b.id === "aprendizagem-continua")!.fixedActions[0]!;

type AnyId = Id<
  | "actionCompletions"
  | "irrCompletions"
  | "customActions"
  | "specialtyItemCompletions"
  | "specialtyProjectReports"
>;
type Caller = ReturnType<typeof as>;

type Case = {
  kind: string;
  ramo: Ramo;
  /** A pending conclusão of `userId`. */
  insertPending: (t: TestConvex, userId: Id<"users">) => Promise<AnyId>;
  approve: (c: Caller, id: AnyId, escoteiroId: Id<"users">) => Promise<unknown>;
  reject: (c: Caller, id: AnyId, escoteiroId: Id<"users">) => Promise<unknown>;
  /** The audit label (describeCompletion). */
  label: string;
  /** Approving it twice throws (single-row mutations) vs. skips (batches). */
  strictApprove: boolean;
  notPending: string;
  /** Rejecting resets the row instead of deleting it. */
  resetOnReject: boolean;
};

const CASES: Case[] = [
  {
    kind: "ação",
    ramo: "escoteiro",
    insertPending: (t, userId) =>
      t.run((ctx) =>
        ctx.db.insert("actionCompletions", {
          userId,
          actionId: ACTION.id,
          completedAt: 1,
          status: "pending",
        }),
      ),
    approve: (c, id) =>
      c.mutation(api.approvals.approveAction, { completionId: id as Id<"actionCompletions"> }),
    reject: (c, id) =>
      c.mutation(api.approvals.rejectAction, { completionId: id as Id<"actionCompletions"> }),
    label: ACTION.text,
    strictApprove: true,
    notPending: "Item não está pendente",
    resetOnReject: false,
  },
  {
    kind: "IRR item",
    ramo: "escoteiro",
    insertPending: (t, userId) =>
      t.run((ctx) =>
        ctx.db.insert("irrCompletions", {
          userId,
          ramo: "escoteiro",
          itemId: "irr_promessa",
          completedAt: 1,
          status: "pending",
        }),
      ),
    approve: (c, id) =>
      c.mutation(api.approvals.approveIrrItem, { completionId: id as Id<"irrCompletions"> }),
    reject: (c, id) =>
      c.mutation(api.approvals.rejectIrrItem, { completionId: id as Id<"irrCompletions"> }),
    label: "Promessa Escoteira",
    strictApprove: true,
    notPending: "Item não está pendente",
    resetOnReject: false,
  },
  {
    kind: "ação personalizada",
    ramo: "escoteiro",
    insertPending: (t, userId) =>
      t.run((ctx) =>
        ctx.db.insert("customActions", {
          userId,
          ramo: "escoteiro",
          blocoId: "aprendizagem-continua",
          text: "Fiz uma trilha",
          completed: true,
          status: "pending",
          createdAt: 1,
        }),
      ),
    approve: (c, id) =>
      c.mutation(api.approvals.approveCustomAction, { completionId: id as Id<"customActions"> }),
    reject: (c, id) =>
      c.mutation(api.approvals.rejectCustomAction, { completionId: id as Id<"customActions"> }),
    label: "Fiz uma trilha",
    strictApprove: true,
    notPending: "Item não está pendente",
    resetOnReject: true,
  },
  {
    kind: "item de especialidade",
    ramo: "escoteiro",
    insertPending: (t, userId) =>
      t.run((ctx) =>
        ctx.db.insert("specialtyItemCompletions", {
          userId,
          ramoGroup: "younger",
          specialtyId: "administracao",
          itemIndex: 2,
          completedAt: 1,
          status: "pending",
        }),
      ),
    approve: (c, id, escoteiroId) =>
      c.mutation(api.specialties.approveSpecialtyItems, {
        escoteiroId,
        specialtyId: "administracao",
        ramoGroup: "younger",
        itemIds: [id as Id<"specialtyItemCompletions">],
      }),
    reject: (c, id) =>
      c.mutation(api.specialties.rejectSpecialtyItem, {
        completionId: id as Id<"specialtyItemCompletions">,
      }),
    label: "Administração — item 3",
    strictApprove: false,
    notPending: "Item não está pendente",
    resetOnReject: false,
  },
  {
    kind: "etapa de especialidade",
    ramo: "senior",
    insertPending: (t, userId) =>
      t.run((ctx) =>
        ctx.db.insert("specialtyProjectReports", {
          userId,
          ramoGroup: "older",
          specialtyId: "comunicacoes",
          step: "fazer",
          text: "Gravei um podcast",
          completedAt: 1,
          status: "pending",
        }),
      ),
    approve: (c, id) =>
      c.mutation(api.specialties.approveSpecialtyStep, {
        reportId: id as Id<"specialtyProjectReports">,
      }),
    reject: (c, id) =>
      c.mutation(api.specialties.rejectSpecialtyStep, {
        reportId: id as Id<"specialtyProjectReports">,
      }),
    label: "Comunicações — etapa Fazer",
    strictApprove: true,
    notPending: "Etapa não está pendente",
    resetOnReject: false,
  },
];

async function setup(ramo: Ramo) {
  const t = newTest();
  const { groupId, adminId } = await seedGrupo(t, { adminRamos: [ramo] });
  const escoteiroId = await addEscoteiro(t, groupId, ramo);
  const otherRamo: Ramo = ramo === "escoteiro" ? "lobinho" : "escoteiro";
  const outsider = await addEscotista(t, groupId, [otherRamo]);
  return { t, adminId, escoteiroId, outsider };
}

for (const c of CASES) {
  describe(`review: ${c.kind}`, () => {
    test("approve records the approver and one audit line", async () => {
      const { t, adminId, escoteiroId } = await setup(c.ramo);
      const id = await c.insertPending(t, escoteiroId);

      await c.approve(as(t, adminId), id, escoteiroId);

      const row = await t.run((ctx) => ctx.db.get(id));
      expect(row?.status).toBe("approved");
      expect(row?.approvedBy).toBe(adminId);
      const events = await reviewEvents(t);
      expect(events.map((e) => e.summary)).toEqual([`Aprovou: ${c.label}`]);
      expect(events[0]?.subjectUserId).toBe(escoteiroId);

      if (c.strictApprove) {
        await expect(c.approve(as(t, adminId), id, escoteiroId)).rejects.toThrow(
          c.notPending,
        );
      } else {
        await c.approve(as(t, adminId), id, escoteiroId);
        expect(await reviewEvents(t)).toHaveLength(1);
      }
    });

    test("reject removes the conclusão and logs it; a second reject is refused", async () => {
      const { t, adminId, escoteiroId } = await setup(c.ramo);
      const id = await c.insertPending(t, escoteiroId);

      await c.reject(as(t, adminId), id, escoteiroId);

      const row = await t.run((ctx) => ctx.db.get(id));
      if (c.resetOnReject) {
        // The escoteiro keeps the text; only the conclusão is undone.
        expect(row && "completed" in row && row.completed).toBe(false);
        expect(row?.status).toBeUndefined();
      } else {
        expect(row).toBeNull();
      }
      expect((await reviewEvents(t)).map((e) => e.summary)).toEqual([
        `Rejeitou: ${c.label}`,
      ]);
      await expect(c.reject(as(t, adminId), id, escoteiroId)).rejects.toThrow();
    });

    test("an escotista outside the escoteiro's ramo can do neither", async () => {
      const { t, escoteiroId, outsider } = await setup(c.ramo);
      const id = await c.insertPending(t, escoteiroId);

      await expect(c.approve(as(t, outsider), id, escoteiroId)).rejects.toThrow();
      await expect(c.reject(as(t, outsider), id, escoteiroId)).rejects.toThrow();

      const row = await t.run((ctx) => ctx.db.get(id));
      expect(row?.status).toBe("pending");
      expect(await reviewEvents(t)).toHaveLength(0);
    });
  });
}

describe("review: ordering of errors", () => {
  test("approve authenticates first; reject reports a dangling id first", async () => {
    const { t, escoteiroId } = await setup("escoteiro");
    const id = await CASES[0]!.insertPending(t, escoteiroId);
    await t.run((ctx) => ctx.db.delete(id));

    await expect(
      t.mutation(api.approvals.approveAction, {
        completionId: id as Id<"actionCompletions">,
      }),
    ).rejects.toThrow("Não autenticado");
    await expect(
      t.mutation(api.approvals.rejectAction, {
        completionId: id as Id<"actionCompletions">,
      }),
    ).rejects.toThrow("Não encontrado");
  });
});
