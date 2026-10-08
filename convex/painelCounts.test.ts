/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
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

// Catalog ação totals (fixed + variable) per ramo — known-good literals.
const LOBINHO_TOTAL = 169;
const ESCOTEIRO_TOTAL = 177;
const SENIOR_TOTAL = 143;
const PIONEIRO_TOTAL = 76;

describe("getUncheckedActionCounts (painel Revisão rápida counts)", () => {
  test("an escoteiro with no conclusões has the whole ramo catalog unchecked", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["escoteiro"]);
    const kid = await addEscoteiro(t, groupId, "escoteiro");

    const counts = await as(t, escotista).query(
      api.approvals.getUncheckedActionCounts,
      {},
    );
    expect(counts).toEqual({ [kid]: ESCOTEIRO_TOTAL });
  });

  test("pending and approved conclusões of the current ramo both count as checked", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["escoteiro"]);
    const kid = await addEscoteiro(t, groupId, "escoteiro");
    const other = await addEscoteiro(t, groupId, "escoteiro");
    await complete(t, kid, "escoteiro:aprendizagem-continua:fixed:0", "approved");
    await complete(t, kid, "escoteiro:aprendizagem-continua:fixed:1", "pending");
    await complete(t, kid, "escoteiro:aprendizagem-continua:variable:0");
    // A past ramo's ação is not in the current catalog: not subtracted.
    await complete(t, kid, "lobinho:aprendizagem-continua:fixed:0", "approved");

    const counts = await as(t, escotista).query(
      api.approvals.getUncheckedActionCounts,
      {},
    );
    expect(counts).toEqual({
      [kid]: ESCOTEIRO_TOTAL - 3,
      [other]: ESCOTEIRO_TOTAL,
    });
  });

  test("a non-admin escotista sees only their ramos' escoteiros of their own grupo", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["escoteiro", "pioneiro"]);
    const kid = await addEscoteiro(t, groupId, "escoteiro");
    const pio = await addEscoteiro(t, groupId, "pioneiro");
    await addEscoteiro(t, groupId, "lobinho");
    const { groupId: otherGroup } = await seedGrupo(t, { name: "Outro" });
    await addEscoteiro(t, otherGroup, "escoteiro");

    const counts = await as(t, escotista).query(
      api.approvals.getUncheckedActionCounts,
      {},
    );
    expect(counts).toEqual({ [kid]: ESCOTEIRO_TOTAL, [pio]: PIONEIRO_TOTAL });
  });

  test("escoteiros without a ramo are excluded for a non-admin escotista", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const escotista = await addEscotista(t, groupId, ["escoteiro"]);
    const kid = await addEscoteiro(t, groupId, "escoteiro");
    await addRamolessEscoteiro(t, groupId);

    const counts = await as(t, escotista).query(
      api.approvals.getUncheckedActionCounts,
      {},
    );
    expect(counts).toEqual({ [kid]: ESCOTEIRO_TOTAL });
  });

  test("an admin sees every ramo of the grupo, ramo-less escoteiros on the default catalog", async () => {
    const t = newTest();
    const { groupId, adminId } = await seedGrupo(t, { adminRamos: ["senior"] });
    const lob = await addEscoteiro(t, groupId, "lobinho");
    const sen = await addEscoteiro(t, groupId, "senior");
    const ramoless = await addRamolessEscoteiro(t, groupId);
    const { groupId: otherGroup } = await seedGrupo(t, { name: "Outro" });
    await addEscoteiro(t, otherGroup, "senior");

    const counts = await as(t, adminId).query(
      api.approvals.getUncheckedActionCounts,
      {},
    );
    expect(counts).toEqual({
      [lob]: LOBINHO_TOTAL,
      [sen]: SENIOR_TOTAL,
      [ramoless]: ESCOTEIRO_TOTAL,
    });
  });

  test("callers who aren't escotistas of a grupo get no counts", async () => {
    const t = newTest();
    const { groupId } = await seedGrupo(t);
    const kid = await addEscoteiro(t, groupId, "escoteiro");

    expect(
      await as(t, kid).query(api.approvals.getUncheckedActionCounts, {}),
    ).toEqual({});
    expect(await t.query(api.approvals.getUncheckedActionCounts, {})).toEqual({});
  });
});

async function addRamolessEscoteiro(t: TestConvex, groupId: Id<"groups">) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Sem ramo",
      role: "escoteiro",
      groupId,
      membershipStatus: "approved",
      onboardingComplete: true,
    }),
  );
}

async function complete(
  t: TestConvex,
  userId: Id<"users">,
  actionId: string,
  status?: "pending" | "approved",
) {
  await t.run((ctx) =>
    ctx.db.insert("actionCompletions", {
      userId,
      actionId,
      completedAt: 1,
      ...(status ? { status } : {}),
    }),
  );
}
