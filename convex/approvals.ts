import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { assertCanActOnEscoteiro } from "./lib/ramoVisibility";
import {
  snapshotProgression,
  detectLevelUps,
  type LevelUpToast,
  type ProgressionSnapshot,
} from "./lib/progression";
import {
  logRamoEvent,
  describeCompletion,
  completionRef,
  type CompletionDoc,
  type CompletionKind,
} from "./lib/events";

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
  kind: CompletionKind,
): Promise<LevelUpToast[]> {
  const user = await getAuthenticatedUser(ctx);
  const doc = await ctx.db.get(completionId);
  if (!doc) throw new Error("Não encontrado");
  if (doc.status !== "pending") throw new Error("Item não está pendente");

  const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);

  const before = await snapshotProgression(ctx, doc.userId);
  await ctx.db.patch(completionId, {
    status: "approved",
    approvedBy: user._id,
    approvedAt: Date.now(),
  });
  await logRamoEvent(ctx, {
    type: "approval",
    actor: user,
    subject: target,
    summary: `Aprovou: ${describeCompletion(target.ramo, kind, completionRef(doc, kind))}`,
  });
  return detectLevelUps(ctx, user, target, before);
}

/**
 * Reject (delete) a single pending completion. Fetches the doc and checks
 * existence/status BEFORE auth (auth happens inside assertCanActOnEscoteiro)
 * — so an unauthenticated caller with a dangling id gets "Não encontrado".
 * Preserve this ordering.
 */
async function rejectPendingCompletion(
  ctx: MutationCtx,
  completionId: CompletionId,
  kind: CompletionKind,
) {
  const doc = await ctx.db.get(completionId);
  if (!doc) throw new Error("Não encontrado");
  if (doc.status !== "pending") throw new Error("Item não está pendente");

  const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
  await logRamoEvent(ctx, {
    type: "rejection",
    actor: caller,
    subject: target,
    summary: `Rejeitou: ${describeCompletion(target.ramo, kind, completionRef(doc, kind))}`,
  });
  await ctx.db.delete(completionId);
}

type PendingHit = { kind: CompletionKind; doc: CompletionDoc };

/**
 * Fetch the still-pending rows for a set of completion ids, authorizing each
 * against the caller. Non-pending rows (and not-yet-completed custom actions)
 * are skipped silently — matching the prior bulk semantics. Returns the rows so
 * the caller can snapshot progression BEFORE applying any writes (level-up
 * detection needs the pre-approval state).
 */
async function collectPending(
  ctx: MutationCtx,
  ids: CompletionId[] | Id<"customActions">[],
  kind: CompletionKind,
  requireCompleted: boolean,
): Promise<PendingHit[]> {
  const hits: PendingHit[] = [];
  for (const id of ids) {
    const doc = await ctx.db.get(id);
    if (!doc || doc.status !== "pending") continue;
    if (requireCompleted && !(doc as Doc<"customActions">).completed) continue;
    await assertCanActOnEscoteiro(ctx, doc.userId);
    hits.push({ kind, doc: doc as CompletionDoc });
  }
  return hits;
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
  handler: async (ctx, args) =>
    approvePendingCompletion(ctx, args.completionId, "action"),
});

export const approveSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) =>
    approvePendingCompletion(ctx, args.completionId, "specialty"),
});

export const approveLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) =>
    approvePendingCompletion(ctx, args.completionId, "lis"),
});

export const approveCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (!doc.completed || doc.status !== "pending")
      throw new Error("Item não está pendente");

    const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);

    const before = await snapshotProgression(ctx, doc.userId);
    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
    await logRamoEvent(ctx, {
      type: "approval",
      actor: user,
      subject: target,
      summary: `Aprovou: ${describeCompletion(target.ramo, "custom", { text: doc.text })}`,
    });
    return detectLevelUps(ctx, user, target, before);
  },
});

export const rejectCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (!doc.completed || doc.status !== "pending")
      throw new Error("Item não está pendente");

    const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou: ${describeCompletion(target.ramo, "custom", { text: doc.text })}`,
    });

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
    await rejectPendingCompletion(ctx, args.completionId, "action");
  },
});

export const rejectSpecialty = mutation({
  args: { completionId: v.id("specialtyCompletions") },
  handler: async (ctx, args) => {
    await rejectPendingCompletion(ctx, args.completionId, "specialty");
  },
});

export const rejectLisDeOuroItem = mutation({
  args: { completionId: v.id("lisDeOuroCompletions") },
  handler: async (ctx, args) => {
    await rejectPendingCompletion(ctx, args.completionId, "lis");
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
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const now = Date.now();

    const hits = [
      ...(await collectPending(ctx, args.actionIds, "action", false)),
      ...(await collectPending(ctx, args.specialtyIds, "specialty", false)),
      ...(await collectPending(ctx, args.lisIds, "lis", false)),
      ...(await collectPending(ctx, args.customActionIds ?? [], "custom", true)),
    ];

    // Distinct affected escoteiros — a bulk action can span several of them.
    const subjectIds = [...new Set(hits.map((h) => h.doc.userId))];
    const subjects = new Map<Id<"users">, Doc<"users">>();
    for (const sid of subjectIds) {
      const s = await ctx.db.get(sid);
      if (s) subjects.set(sid, s);
    }

    if (args.action === "approve") {
      // Snapshot each escoteiro BEFORE any write, then apply all approvals.
      const before = new Map<Id<"users">, ProgressionSnapshot>();
      for (const sid of subjectIds) {
        before.set(sid, await snapshotProgression(ctx, sid));
      }
      for (const h of hits) {
        await ctx.db.patch(h.doc._id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
        const subject = subjects.get(h.doc.userId);
        if (subject) {
          await logRamoEvent(ctx, {
            type: "approval",
            actor: user,
            subject,
            summary: `Aprovou: ${describeCompletion(subject.ramo, h.kind, completionRef(h.doc, h.kind))}`,
          });
        }
      }
      const toasts: LevelUpToast[] = [];
      for (const sid of subjectIds) {
        const subject = subjects.get(sid);
        const snap = before.get(sid);
        if (subject && snap) {
          toasts.push(...(await detectLevelUps(ctx, user, subject, snap)));
        }
      }
      return toasts;
    }

    // Reject: log then remove. Simple tables are deleted; custom actions are
    // reset (matching the prior behavior). Rejections never move the stage.
    for (const h of hits) {
      const subject = subjects.get(h.doc.userId);
      if (subject) {
        await logRamoEvent(ctx, {
          type: "rejection",
          actor: user,
          subject,
          summary: `Rejeitou: ${describeCompletion(subject.ramo, h.kind, completionRef(h.doc, h.kind))}`,
        });
      }
      if (h.kind === "custom") {
        await ctx.db.patch(h.doc._id, {
          completed: false,
          status: undefined,
          approvedBy: undefined,
          approvedAt: undefined,
        });
      } else {
        await ctx.db.delete(h.doc._id);
      }
    }
    return [];
  },
});

export const approveAllForEscoteiro = mutation({
  args: { escoteiroId: v.id("users") },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const { target } = await assertCanActOnEscoteiro(ctx, args.escoteiroId);

    const now = Date.now();
    const before = await snapshotProgression(ctx, args.escoteiroId);

    // The per-table .take() limits differ (100/100/10/100) and custom filters
    // on `completed`, so the queries stay inline.
    const pendingActions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);
    const pendingSpecialties = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(100);
    const pendingLis = await ctx.db
      .query("lisDeOuroCompletions")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.escoteiroId).eq("status", "pending"),
      )
      .take(10);
    const pendingCustomActions = (
      await ctx.db
        .query("customActions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", args.escoteiroId).eq("status", "pending"),
        )
        .take(100)
    ).filter((c) => c.completed);

    const approveAndLog = async (rows: CompletionDoc[], kind: CompletionKind) => {
      for (const r of rows) {
        await ctx.db.patch(r._id, {
          status: "approved",
          approvedBy: user._id,
          approvedAt: now,
        });
        await logRamoEvent(ctx, {
          type: "approval",
          actor: user,
          subject: target,
          summary: `Aprovou: ${describeCompletion(target.ramo, kind, completionRef(r, kind))}`,
        });
      }
    };
    await approveAndLog(pendingActions, "action");
    await approveAndLog(pendingSpecialties, "specialty");
    await approveAndLog(pendingLis, "lis");
    await approveAndLog(pendingCustomActions, "custom");

    return detectLevelUps(ctx, user, target, before);
  },
});
