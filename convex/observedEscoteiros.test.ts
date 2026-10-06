/// <reference types="bun" />
/**
 * readObservedEscoteiros: the lista de jovens, the stats cohort and the
 * especialidades tab count the same escoteiros under a seção observada —
 * visibilidade de ramo first, then the seção narrows, unplaced stay in.
 */
import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api";
import { addEscoteiro, addEscotista, as, newTest, seedGrupo } from "./fixtures.testkit";

async function setup() {
  const t = newTest();
  const { groupId, adminId } = await seedGrupo(t);
  const [norte, sul] = await t.run(async (ctx) => [
    await ctx.db.insert("sections", { groupId, name: "Tropa Norte", ramo: "escoteiro" }),
    await ctx.db.insert("sections", { groupId, name: "Tropa Sul", ramo: "escoteiro" }),
  ]);
  const doNorte = await addEscoteiro(t, groupId, "escoteiro", { name: "Ana", sectionId: norte });
  const doSul = await addEscoteiro(t, groupId, "escoteiro", { name: "Bia", sectionId: sul });
  const unplaced = await addEscoteiro(t, groupId, "escoteiro", { name: "Caio" });
  const senior = await addEscoteiro(t, groupId, "senior", { name: "Duda" });
  const chefe = await addEscotista(t, groupId, ["escoteiro"]);
  return { t, adminId, chefe, norte: norte!, doNorte, doSul, unplaced, senior };
}

describe("readObservedEscoteiros", () => {
  test("every escotista surface counts the same observed escoteiros", async () => {
    const f = await setup();
    for (const viewer of [f.adminId, f.chefe]) {
      await as(f.t, viewer).mutation(api.groups.setObservedSection, {
        sectionId: f.norte,
      });
    }

    // Admin: every ramo, narrowed to Norte (+ unplaced, incl. the sênior).
    const adminList = await as(f.t, f.adminId).query(api.approvals.getGroupStats, {});
    expect(new Set(adminList?.escoteiroStats.map((s) => s._id))).toEqual(
      new Set([f.doNorte, f.unplaced, f.senior]),
    );

    // Escotista of the escoteiro ramo: the sênior is outside visibilidade de
    // ramo, so observing can never bring them in.
    const chefeList = await as(f.t, f.chefe).query(api.approvals.getGroupStats, {});
    const chefeIds = new Set(chefeList?.escoteiroStats.map((s) => s._id));
    expect(chefeIds).toEqual(new Set([f.doNorte, f.unplaced]));

    const cohort = await as(f.t, f.chefe).query(api.stats.getRamoScouts, {
      ramo: "escoteiro",
    });
    expect(new Set(cohort.map((r) => r._id))).toEqual(chefeIds);

    const younger = await as(f.t, f.chefe).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup: "younger" },
    );
    expect(younger?.escoteiroCount).toBe(chefeIds.size);
    expect(younger?.observedSectionName).toBe("Tropa Norte");
  });

  test("with no seção observed, the whole visible grupo is counted", async () => {
    const f = await setup();
    const list = await as(f.t, f.chefe).query(api.approvals.getGroupStats, {});
    expect(new Set(list?.escoteiroStats.map((s) => s._id))).toEqual(
      new Set([f.doNorte, f.doSul, f.unplaced]),
    );
  });
});
