/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { drainLegacySpecialtyRow } from "./lib/legacySpecialty";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";

// Per-file modules map (Bun has no import.meta.glob). At least one
// "_generated/" path is required so convex-test finds the project root.
const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./progression.ts": () => import("./progression"),
  "./specialties.ts": () => import("./specialties"),
};

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

const YOUNGER_NAME = "Administração";
const YOUNGER_ID = "administracao";
const YOUNGER_ITEM_COUNT = YOUNGER_SPECIALTY_BY_ID.get(YOUNGER_ID)!.items.length;
const OLDER_NAME = "Comunicações";
const OLDER_ID = "comunicacoes";

async function insertUser(t: ReturnType<typeof convexTest>, ramo: Ramo) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", { name: "E", role: "escoteiro", ramo }),
  );
}

async function insertLegacy(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  fields: {
    ramo: Ramo;
    specialtyName: string;
    status?: "pending" | "approved";
  },
) {
  return t.run(async (ctx) =>
    ctx.db.insert("specialtyCompletions", {
      userId,
      ramo: fields.ramo,
      blocoId: "aprendizagem-continua",
      specialtyName: fields.specialtyName,
      completedAt: 111,
      status: fields.status ?? "approved",
      approvedBy: userId,
      approvedAt: 222,
    }),
  );
}

function drain(t: ReturnType<typeof convexTest>, rowId: Id<"specialtyCompletions">) {
  return t.run(async (ctx) => {
    const row = (await ctx.db.get(rowId))!;
    return drainLegacySpecialtyRow(ctx, row);
  });
}

describe("drainLegacySpecialtyRow (#47)", () => {
  test("converts an approved younger row into one approved item row per catalog item", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "escoteiro");
    const rowId = await insertLegacy(t, userId, {
      ramo: "escoteiro",
      specialtyName: YOUNGER_NAME,
    });

    expect(await drain(t, rowId)).toBe("converted");

    const { items, legacy } = await t.run(async (ctx) => ({
      items: await ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
      legacy: await ctx.db.get(rowId),
    }));
    expect(legacy).toBeNull();
    expect(items).toHaveLength(YOUNGER_ITEM_COUNT);
    expect(new Set(items.map((i) => i.itemIndex)).size).toBe(YOUNGER_ITEM_COUNT);
    expect(items.every((i) => i.status === "approved")).toBe(true);
    expect(items.every((i) => i.ramoGroup === "younger")).toBe(true);
    expect(items[0]!.specialtyId).toBe(YOUNGER_ID);
    // The escotista's approval metadata carries over.
    expect(items[0]!.approvedBy).toBe(userId);
    expect(items[0]!.approvedAt).toBe(222);
    expect(items[0]!.completedAt).toBe(111);
  });

  test("converts an approved older row into all three approved project steps", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "senior");
    const rowId = await insertLegacy(t, userId, {
      ramo: "senior",
      specialtyName: OLDER_NAME,
    });

    expect(await drain(t, rowId)).toBe("converted");

    const { reports, legacy } = await t.run(async (ctx) => ({
      reports: await ctx.db
        .query("specialtyProjectReports")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
      legacy: await ctx.db.get(rowId),
    }));
    expect(legacy).toBeNull();
    expect(new Set(reports.map((r) => r.step))).toEqual(
      new Set(["conhecer", "fazer", "compartilhar"]),
    );
    expect(reports.every((r) => r.status === "approved")).toBe(true);
    expect(reports.every((r) => r.specialtyId === OLDER_ID)).toBe(true);
    expect(reports.every((r) => r.ramoGroup === "older")).toBe(true);
  });

  test("is idempotent: an already-converted specialty is not duplicated", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "escoteiro");
    await t.run(async (ctx) =>
      ctx.db.insert("specialtyItemCompletions", {
        userId,
        ramoGroup: "younger",
        specialtyId: YOUNGER_ID,
        itemIndex: 0,
        completedAt: 1,
        status: "approved",
      }),
    );
    const rowId = await insertLegacy(t, userId, {
      ramo: "escoteiro",
      specialtyName: YOUNGER_NAME,
    });

    expect(await drain(t, rowId)).toBe("converted");

    const items = await t.run(async (ctx) =>
      ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(items).toHaveLength(YOUNGER_ITEM_COUNT);
    // The pre-existing row is left untouched, not rewritten.
    expect(items.filter((i) => i.itemIndex === 0)).toHaveLength(1);
    expect(items.find((i) => i.itemIndex === 0)!.completedAt).toBe(1);
  });

  test("drops a pending row without converting it", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "escoteiro");
    const rowId = await insertLegacy(t, userId, {
      ramo: "escoteiro",
      specialtyName: YOUNGER_NAME,
      status: "pending",
    });

    expect(await drain(t, rowId)).toBe("droppedPending");

    const { items, legacy } = await t.run(async (ctx) => ({
      items: await ctx.db.query("specialtyItemCompletions").collect(),
      legacy: await ctx.db.get(rowId),
    }));
    expect(legacy).toBeNull();
    expect(items).toHaveLength(0);
  });

  test("drops an insígnia row: no catalog entry, nothing to convert into", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "escoteiro");
    const rowId = await insertLegacy(t, userId, {
      ramo: "escoteiro",
      specialtyName: "Insígnia do Aprender",
    });

    expect(await drain(t, rowId)).toBe("droppedUnresolvable");

    const { items, reports, legacy } = await t.run(async (ctx) => ({
      items: await ctx.db.query("specialtyItemCompletions").collect(),
      reports: await ctx.db.query("specialtyProjectReports").collect(),
      legacy: await ctx.db.get(rowId),
    }));
    expect(legacy).toBeNull();
    expect(items).toHaveLength(0);
    expect(reports).toHaveLength(0);
  });

  test("a row with no ramo is drained as the default ramo (younger)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "escoteiro");
    const rowId = await t.run(async (ctx) =>
      ctx.db.insert("specialtyCompletions", {
        userId,
        blocoId: "aprendizagem-continua",
        specialtyName: YOUNGER_NAME,
        completedAt: 1,
        status: "approved",
      }),
    );

    expect(await drain(t, rowId)).toBe("converted");

    const items = await t.run(async (ctx) =>
      ctx.db.query("specialtyItemCompletions").collect(),
    );
    expect(items).toHaveLength(YOUNGER_ITEM_COUNT);
    expect(items.every((i) => i.ramoGroup === "younger")).toBe(true);
  });
});
