import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getAuthenticatedUser,
  assertEscotistaInSameGroup,
} from "./lib/authHelpers";

export const getPendingForGroup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "escotista") return [];
    if (!user.groupId) return [];

    const escoteiros = await ctx.db
      .query("users")
      .withIndex("by_groupId_and_role", (q) =>
        q.eq("groupId", user.groupId).eq("role", "escoteiro"),
      )
      .take(200);

    const result = [];

    for (const escoteiro of escoteiros) {
      const pendingActions = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(100);

      const pendingSpecialties = await ctx.db
        .query("specialtyCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(100);

      const pendingLisItems = await ctx.db
        .query("lisDeOuroCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(10);

      const totalPending =
        pendingActions.length +
        pendingSpecialties.length +
        pendingLisItems.length;

      if (totalPending > 0) {
        result.push({
          escoteiro: {
            _id: escoteiro._id,
            name: escoteiro.name,
            image: escoteiro.image,
          },
          pendingActions,
          pendingSpecialties,
          pendingLisItems,
          totalPending,
        });
      }
    }

    return result;
  },
});

export const getGroupStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "escotista") return null;
    if (!user.groupId) return null;

    const group = await ctx.db.get(user.groupId);
    if (!group) return null;

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
      .take(200);

    const escoteiros = members.filter((m) => m.role === "escoteiro");
    const escotistas = members.filter((m) => m.role === "escotista");

    let totalPending = 0;
    const escoteiroStats = [];

    for (const esc of escoteiros) {
      const actions = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId", (q) => q.eq("userId", esc._id))
        .take(500);

      const approvedActions = actions.filter(
        (a) => a.status === "approved" || !a.status,
      ).length;
      const pendingActions = actions.filter(
        (a) => a.status === "pending",
      ).length;
      totalPending += pendingActions;

      escoteiroStats.push({
        _id: esc._id,
        name: esc.name,
        image: esc.image,
        approvedActions,
        pendingActions,
        totalActions: actions.length,
      });
    }

    return {
      group: { _id: group._id, name: group.name, password: group.password },
      totalMembers: members.length,
      escoteiroCount: escoteiros.length,
      escotistaCount: escotistas.length,
      totalPending,
      escoteiroStats,
    };
  },
});

export const approveAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);

    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
  },
});

export const approveSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);

    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
  },
});

export const approveLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);

    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
  },
});

export const rejectAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);
    await ctx.db.delete(args.completionId);
  },
});

export const rejectSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);
    await ctx.db.delete(args.completionId);
  },
});

export const rejectLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);
    await ctx.db.delete(args.completionId);
  },
});

export const bulkAction = mutation({
  args: {
    action: v.union(v.literal("approve"), v.literal("reject")),
    actionIds: v.array(v.id("actionCompletions")),
    specialtyIds: v.array(v.id("specialtyCompletions")),
    lisIds: v.array(v.id("lisDeOuroCompletions")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const now = Date.now();

    for (const id of args.actionIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      await assertEscotistaInSameGroup(ctx, doc.userId);
      if (args.action === "approve") {
        await ctx.db.patch(id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
      } else {
        await ctx.db.delete(id);
      }
    }

    for (const id of args.specialtyIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      await assertEscotistaInSameGroup(ctx, doc.userId);
      if (args.action === "approve") {
        await ctx.db.patch(id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
      } else {
        await ctx.db.delete(id);
      }
    }

    for (const id of args.lisIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      await assertEscotistaInSameGroup(ctx, doc.userId);
      if (args.action === "approve") {
        await ctx.db.patch(id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
      } else {
        await ctx.db.delete(id);
      }
    }
  },
});

export const approveAllForEscoteiro = mutation({
  args: { escoteiroId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await assertEscotistaInSameGroup(ctx, args.escoteiroId);

    const now = Date.now();

    const pendingActions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);

    for (const doc of pendingActions) {
      await ctx.db.patch(doc._id, {
        status: "approved",
        approvedBy: user._id,
        approvedAt: now,
      });
    }

    const pendingSpecialties = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);

    for (const doc of pendingSpecialties) {
      await ctx.db.patch(doc._id, {
        status: "approved",
        approvedBy: user._id,
        approvedAt: now,
      });
    }

    const pendingLis = await ctx.db
      .query("lisDeOuroCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(10);

    for (const doc of pendingLis) {
      await ctx.db.patch(doc._id, {
        status: "approved",
        approvedBy: user._id,
        approvedAt: now,
      });
    }
  },
});
