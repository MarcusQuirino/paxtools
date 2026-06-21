import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getAuthenticatedUser,
  assertEscotistaInSameGroup,
} from "./lib/authHelpers";

// The three "simple" completion tables share the userId/status shape, so a
// single union id type lets one helper drive all of them.
type CompletionId =
  | Id<"actionCompletions">
  | Id<"specialtyCompletions">
  | Id<"lisDeOuroCompletions">;

/**
 * Approve a single pending completion. Authenticates FIRST (before fetching the
 * doc) so an unauthenticated caller gets "Não autenticado" even for a dangling
 * id — preserve this ordering.
 */
async function approvePendingCompletion(
  ctx: MutationCtx,
  completionId: CompletionId,
) {
  const user = await getAuthenticatedUser(ctx);
  const doc = await ctx.db.get(completionId);
  if (!doc) throw new Error("Não encontrado");
  if (doc.status !== "pending") throw new Error("Item não está pendente");

  await assertEscotistaInSameGroup(ctx, doc.userId);

  await ctx.db.patch(completionId, {
    status: "approved",
    approvedBy: user._id,
    approvedAt: Date.now(),
  });
}

/**
 * Reject (delete) a single pending completion. Fetches the doc and checks
 * existence/status BEFORE auth (auth happens inside assertEscotistaInSameGroup)
 * — so an unauthenticated caller with a dangling id gets "Não encontrado".
 * Preserve this ordering.
 */
async function rejectPendingCompletion(
  ctx: MutationCtx,
  completionId: CompletionId,
) {
  const doc = await ctx.db.get(completionId);
  if (!doc) throw new Error("Não encontrado");
  if (doc.status !== "pending") throw new Error("Item não está pendente");

  await assertEscotistaInSameGroup(ctx, doc.userId);
  await ctx.db.delete(completionId);
}

/**
 * Bulk approve-or-reject for the three simple completion tables. Approving
 * patches the row; rejecting deletes it. Non-pending rows are skipped silently.
 * `approverId` and `now` are passed in so a single shared timestamp can be
 * stamped across the whole bulk operation.
 */
async function bulkProcessSimple(
  ctx: MutationCtx,
  ids: CompletionId[],
  action: "approve" | "reject",
  approverId: Id<"users">,
  now: number,
) {
  for (const id of ids) {
    const doc = await ctx.db.get(id);
    if (!doc || doc.status !== "pending") continue;
    await assertEscotistaInSameGroup(ctx, doc.userId);
    if (action === "approve") {
      await ctx.db.patch(id, {
        status: "approved",
        approvedBy: approverId,
        approvedAt: now,
      });
    } else {
      await ctx.db.delete(id);
    }
  }
}

/**
 * Patch each already-fetched completion row to approved, stamping a single
 * shared `now` across the batch. Accepts rows from any of the four completion
 * tables (their `_id` types form the union below).
 */
async function approveRows(
  ctx: MutationCtx,
  rows: Array<{
    _id:
      | Id<"actionCompletions">
      | Id<"specialtyCompletions">
      | Id<"lisDeOuroCompletions">
      | Id<"customActions">;
  }>,
  approverId: Id<"users">,
  now: number,
) {
  for (const row of rows) {
    await ctx.db.patch(row._id, {
      status: "approved",
      approvedBy: approverId,
      approvedAt: now,
    });
  }
}

export const getPendingForGroup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "escotista") return [];
    if (!user.groupId) return [];
    if (user.membershipStatus && user.membershipStatus !== "approved") return [];

    const all = await ctx.db
      .query("users")
      .withIndex("by_groupId_and_role", (q) =>
        q.eq("groupId", user.groupId).eq("role", "escoteiro"),
      )
      .take(500);

    const escoteiros = all.filter((e) => {
      if (e.bannedAt) return false;
      if ((e.membershipStatus ?? "approved") !== "approved") return false;
      if (user.isAdmin) return true;
      if (!e.ramo) return false;
      return (user.escotistaRamos ?? []).includes(e.ramo);
    });

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

      const pendingCustomActions = (
        await ctx.db
          .query("customActions")
          .withIndex("by_userId_and_status", (q) =>
            q.eq("userId", escoteiro._id).eq("status", "pending"),
          )
          .take(100)
      ).filter((c) => c.completed);

      const totalPending =
        pendingActions.length +
        pendingSpecialties.length +
        pendingLisItems.length +
        pendingCustomActions.length;

      if (totalPending > 0) {
        result.push({
          escoteiro: {
            _id: escoteiro._id,
            name: escoteiro.name,
            image: escoteiro.image,
            ramo: escoteiro.ramo ?? null,
          },
          pendingActions,
          pendingSpecialties,
          pendingLisItems,
          pendingCustomActions,
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
    if (user.membershipStatus && user.membershipStatus !== "approved")
      return null;

    const members = (
      await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
        .take(500)
    ).filter(
      (m) =>
        !m.bannedAt && (m.membershipStatus ?? "approved") === "approved",
    );

    const visibleEscoteiros = members
      .filter((m) => m.role === "escoteiro")
      .filter((m) => {
        if (user.isAdmin) return true;
        if (!m.ramo) return false;
        return (user.escotistaRamos ?? []).includes(m.ramo);
      });
    const escoteiros = visibleEscoteiros;
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

    const escotistaStats = escotistas.map((e) => ({
      _id: e._id,
      name: e.name,
      image: e.image,
    }));

    return {
      group: {
        _id: group._id,
        name: group.name,
        number: group.number ?? null,
        password: group.password,
      },
      isAdmin: user.isAdmin === true,
      totalMembers: members.length,
      escoteiroCount: escoteiros.length,
      escotistaCount: escotistas.length,
      totalPending,
      escoteiroStats,
      escotistaStats,
    };
  },
});

export const approveAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args) => {
    await approvePendingCompletion(ctx, args.completionId);
  },
});

export const approveSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) => {
    await approvePendingCompletion(ctx, args.completionId);
  },
});

export const approveLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) => {
    await approvePendingCompletion(ctx, args.completionId);
  },
});

export const approveCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (!doc.completed || doc.status !== "pending")
      throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);

    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
  },
});

export const rejectCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (!doc.completed || doc.status !== "pending")
      throw new Error("Item não está pendente");

    await assertEscotistaInSameGroup(ctx, doc.userId);

    await ctx.db.patch(args.completionId, {
      completed: false,
      status: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
    });
  },
});

export const rejectAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args) => {
    await rejectPendingCompletion(ctx, args.completionId);
  },
});

export const rejectSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) => {
    await rejectPendingCompletion(ctx, args.completionId);
  },
});

export const rejectLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) => {
    await rejectPendingCompletion(ctx, args.completionId);
  },
});

export const bulkAction = mutation({
  args: {
    action: v.union(v.literal("approve"), v.literal("reject")),
    actionIds: v.array(v.id("actionCompletions")),
    specialtyIds: v.array(v.id("specialtyCompletions")),
    lisIds: v.array(v.id("lisDeOuroCompletions")),
    customActionIds: v.optional(v.array(v.id("customActions"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const now = Date.now();

    await bulkProcessSimple(ctx, args.actionIds, args.action, user._id, now);
    await bulkProcessSimple(ctx, args.specialtyIds, args.action, user._id, now);
    await bulkProcessSimple(ctx, args.lisIds, args.action, user._id, now);

    for (const id of args.customActionIds ?? []) {
      const doc = await ctx.db.get(id);
      if (!doc || !doc.completed || doc.status !== "pending") continue;
      await assertEscotistaInSameGroup(ctx, doc.userId);
      if (args.action === "approve") {
        await ctx.db.patch(id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
      } else {
        await ctx.db.patch(id, {
          completed: false,
          status: undefined,
          approvedBy: undefined,
          approvedAt: undefined,
        });
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

    // The per-table .take() limits differ (100/100/10/100) and custom filters
    // on `completed`, so the queries stay inline; only the patch loop is shared.
    const pendingActions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);
    await approveRows(ctx, pendingActions, user._id, now);

    const pendingSpecialties = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);
    await approveRows(ctx, pendingSpecialties, user._id, now);

    const pendingLis = await ctx.db
      .query("lisDeOuroCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(10);
    await approveRows(ctx, pendingLis, user._id, now);

    const pendingCustomActions = (
      await ctx.db
        .query("customActions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", args.escoteiroId).eq("status", "pending"),
        )
        .take(100)
    ).filter((c) => c.completed);
    await approveRows(ctx, pendingCustomActions, user._id, now);
  },
});
