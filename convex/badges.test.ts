/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import { as, insertUser, newTest, type TestConvex } from "./fixtures.testkit";
import { badgeRequirementsFor } from "../src/data/badge-data";

const APRENDER = "insignia-do-aprender";
const TOTAL = badgeRequirementsFor(APRENDER, "escoteiro").length;
// aprendizagem-continua names "Insígnia do Aprender" among its alternatives.
const BLOCO = "aprendizagem-continua";

async function seed(t: TestConvex) {
  const escotista = await insertUser(t, {
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo A",
      number: "100",
      password: "AAAAAA",
      createdBy: escotista,
      createdAt: 1,
      ramoNames: {},
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(escotista, { groupId, isAdmin: true, membershipStatus: "approved" }),
  );
  const escoteiro = await insertUser(t, {
    role: "escoteiro",
    ramo: "escoteiro",
    groupId,
    membershipStatus: "approved",
    onboardingComplete: true,
  });
  return { escotista, escoteiro };
}

const rowsOf = (t: TestConvex, userId: Awaited<ReturnType<typeof seed>>["escoteiro"]) =>
  t.run(async (ctx) =>
    ctx.db
      .query("badgeRequirementCompletions")
      .withIndex("by_userId_and_ramo_and_badgeId", (q) =>
        q.eq("userId", userId).eq("ramo", "escoteiro").eq("badgeId", APRENDER),
      )
      .collect(),
  );

describe("toggleBadgeRequirement", () => {
  test("rejects unknown badges and out-of-range requirements", async () => {
    const t = newTest();
    const { escoteiro } = await seed(t);
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleBadgeRequirement, {
        badgeId: "nao-existe",
        requirementIndex: 0,
      }),
    ).rejects.toThrow("Insígnia não encontrada");
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleBadgeRequirement, {
        badgeId: APRENDER,
        requirementIndex: TOTAL,
      }),
    ).rejects.toThrow("Requisito inválido");
  });

  test("escoteiro marks pending (ramo-stamped) and can unmark", async () => {
    const t = newTest();
    const { escoteiro } = await seed(t);
    const toggle = () =>
      as(t, escoteiro).mutation(api.progression.toggleBadgeRequirement, {
        badgeId: APRENDER,
        requirementIndex: 0,
      });
    await toggle();
    const rows = await rowsOf(t, escoteiro);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("pending");
    expect(rows[0]!.ramo).toBe("escoteiro");
    await toggle();
    expect(await rowsOf(t, escoteiro)).toHaveLength(0);
  });

  test("all requirements approved → insígnia earned → bloco's variable section satisfied", async () => {
    const t = newTest();
    const { escotista, escoteiro } = await seed(t);
    for (let i = 0; i < TOTAL; i++) {
      await as(t, escoteiro).mutation(api.progression.toggleBadgeRequirement, {
        badgeId: APRENDER,
        requirementIndex: i,
      });
    }
    let comp = await as(t, escoteiro).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyBlocoIds).not.toContain(BLOCO);

    // The escotista sees them in the queue and approves all but one.
    const pending = await as(t, escotista).query(api.approvals.getPendingForGroup, {});
    const ids = pending[0]!.pendingBadgeRequirements.map((r) => r._id);
    expect(ids).toHaveLength(TOTAL);
    await as(t, escotista).mutation(api.approvals.bulkAction, {
      action: "approve",
      actionIds: [],
      irrIds: [],
      badgeRequirementIds: ids.slice(1),
    });
    comp = await as(t, escoteiro).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyBlocoIds).not.toContain(BLOCO);

    await as(t, escotista).mutation(api.approvals.approveBadgeRequirement, {
      completionId: ids[0]!,
    });
    comp = await as(t, escoteiro).query(api.progression.getMyCompletions, {});
    expect(comp.earnedSpecialtyBlocoIds).toContain(BLOCO);

    // Approved requirements are locked to the escoteiro.
    await expect(
      as(t, escoteiro).mutation(api.progression.toggleBadgeRequirement, {
        badgeId: APRENDER,
        requirementIndex: 0,
      }),
    ).rejects.toThrow("Apenas um escotista pode desfazer");
  });

  test("escotista marking for an escoteiro writes approved", async () => {
    const t = newTest();
    const { escotista, escoteiro } = await seed(t);
    await as(t, escotista).mutation(api.progression.toggleBadgeRequirement, {
      badgeId: APRENDER,
      requirementIndex: 2,
      targetUserId: escoteiro,
    });
    const rows = await rowsOf(t, escoteiro);
    expect(rows[0]!.status).toBe("approved");
    expect(rows[0]!.approvedBy).toBe(escotista);
  });
});
