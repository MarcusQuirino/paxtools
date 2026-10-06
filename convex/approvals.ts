import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  filterActiveGrupoMembers,
  filterVisibleEscoteiros,
  tryResolveRamoViewer,
} from "./lib/ramoVisibility";
import { readProgression, type LevelUpToast } from "./lib/progression";
import { catalogActionCounts } from "../src/lib/progression-state";
import {
  filterObservableSections,
  filterToObservedSection,
  listSectionsOfGroup,
  resolveObservedSection,
} from "./lib/sections";
import {
  approveConclusao,
  approveConclusoes,
  rejectConclusao,
  rejectConclusoes,
  type ConclusaoRef,
} from "./lib/review";

export const getPendingForGroup = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return [];

    const all = await ctx.db
      .query("users")
      .withIndex("by_groupId_and_role", (q) =>
        q.eq("groupId", viewer.groupId).eq("role", "escoteiro"),
      )
      .take(500);

    const escoteiros = filterVisibleEscoteiros(viewer, all);

    const result = [];

    for (const escoteiro of escoteiros) {
      const pendingActions = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(100);

      // Pending reads stay by (userId, status), NOT ramo-scoped: pending IRR
      // rows are always the escoteiro's current ramo (writes stamp it), and a
      // stale other-ramo pending row is only reachable post-transition, which
      // prod has none of. The isolation that closes the bleed is on the
      // subject-facing reads (getMyCompletions/getCompletionsForUser) + snapshot.
      const pendingIrrItems = await ctx.db
        .query("irrCompletions")
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

      // New specialty item completions (#42): grouped by (ramoGroup, specialtyId)
      // for the escotista pending queue. The card-per-specialty grouping happens
      // in the UI, not here (raw rows are cheaper to transfer).
      const pendingSpecialtyItems = await ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(200);

      // Older-group etapa relatos (#43). One card per pending etapa; etapas
      // are independent (ADR 0002), so several of one especialidade may wait.
      const pendingSpecialtyReports = await ctx.db
        .query("specialtyProjectReports")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(200);

      const totalPending =
        pendingActions.length +
        pendingIrrItems.length +
        pendingCustomActions.length +
        pendingSpecialtyItems.length +
        pendingSpecialtyReports.length;

      if (totalPending > 0) {
        result.push({
          escoteiro: {
            _id: escoteiro._id,
            name: escoteiro.name,
            image: escoteiro.image,
            ramo: escoteiro.ramo ?? null,
          },
          pendingActions,
          pendingIrrItems,
          pendingCustomActions,
          pendingSpecialtyItems,
          pendingSpecialtyReports,
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
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return null;

    const group = await ctx.db.get(viewer.groupId);
    if (!group) return null;

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", viewer.groupId))
      .take(500);

    // Member counts are grupo-wide on purpose; only escoteiroStats is
    // ramo-scoped to the actual viewer.
    const activeMembers = filterActiveGrupoMembers(viewer.groupId, members);

    // The seção the escotista is observing narrows the lista de jovens (and
    // the counts derived from it) — always applied after the ramo rule, so it
    // can only ever remove escoteiros from what they already see.
    const observedSection = await resolveObservedSection(
      ctx,
      viewer.user,
      viewer.groupId,
    );
    const escoteiros = filterToObservedSection(
      observedSection?._id ?? null,
      filterVisibleEscoteiros(viewer, members).filter(
        (m) => m.role === "escoteiro",
      ),
    );
    const escotistas = activeMembers.filter((m) => m.role === "escotista");

    let totalPending = 0;
    const escoteiroStats = [];

    for (const esc of escoteiros) {
      // Ações of the escoteiro's current ramo only — a past ramo's ações no
      // longer inflate "aprovadas" after a ramo change.
      const { state } = await readProgression(ctx, esc);
      const { approved, pending } = catalogActionCounts(state);
      totalPending += pending;

      escoteiroStats.push({
        _id: esc._id,
        name: esc.name,
        image: esc.image,
        sectionId: esc.sectionId ?? null,
        approvedActions: approved,
        pendingActions: pending,
        totalActions: approved + pending,
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
        regiao: group.regiao ?? null,
        password: group.password,
      },
      observedSection: observedSection
        ? {
            _id: observedSection._id,
            name: observedSection.name,
            ramo: observedSection.ramo,
          }
        : null,
      // Everything the seção picker needs, resolved by the same rule
      // `setObservedSection` enforces — the dashboard never restates it.
      observableSections: filterObservableSections(
        viewer,
        await listSectionsOfGroup(ctx, viewer.groupId),
        observedSection?._id ?? null,
      ).map((s) => ({ _id: s._id, name: s.name, ramo: s.ramo })),
      isAdmin: viewer.isAdmin,
      totalMembers: activeMembers.length,
      escoteiroCount: escoteiros.length,
      escotistaCount: escotistas.length,
      totalPending,
      escoteiroStats,
      escotistaStats,
    };
  },
});

// Every approval/rejection goes through lib/review, which owns access, the
// snapshot → write → audit → level-up ordering, and the per-kind rules.

export const approveAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> =>
    approveConclusao(ctx, { kind: "action", id: args.completionId }),
});

export const approveIrrItem = mutation({
  args: { completionId: v.id("irrCompletions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> =>
    approveConclusao(ctx, { kind: "irr", id: args.completionId }),
});

export const approveCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> =>
    approveConclusao(ctx, { kind: "custom", id: args.completionId }),
});

export const rejectAction = mutation({
  args: { completionId: v.id("actionCompletions") },
  handler: async (ctx, args) =>
    rejectConclusao(ctx, { kind: "action", id: args.completionId }),
});

export const rejectIrrItem = mutation({
  args: { completionId: v.id("irrCompletions") },
  handler: async (ctx, args) =>
    rejectConclusao(ctx, { kind: "irr", id: args.completionId }),
});

export const rejectCustomAction = mutation({
  args: { completionId: v.id("customActions") },
  handler: async (ctx, args) =>
    rejectConclusao(ctx, { kind: "custom", id: args.completionId }),
});

/**
 * Approve or reject a selection of ações, IRR items and ações personalizadas,
 * possibly across several escoteiros. Rows no longer pending are skipped.
 */
export const bulkAction = mutation({
  args: {
    action: v.union(v.literal("approve"), v.literal("reject")),
    actionIds: v.array(v.id("actionCompletions")),
    irrIds: v.array(v.id("irrCompletions")),
    customActionIds: v.optional(v.array(v.id("customActions"))),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const refs: ConclusaoRef[] = [
      ...args.actionIds.map((id) => ({ kind: "action" as const, id })),
      ...args.irrIds.map((id) => ({ kind: "irr" as const, id })),
      ...(args.customActionIds ?? []).map((id) => ({ kind: "custom" as const, id })),
    ];
    if (args.action === "approve") return approveConclusoes(ctx, refs);
    await rejectConclusoes(ctx, refs);
    return [];
  },
});
