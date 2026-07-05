/**
 * Specialty system backend — younger ramoGroup (lobinho + escoteiro).
 * Issue #42: item-level toggle, approval, rejection, and query for the
 * /especialidades route and the escotista pending queue.
 */

import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import {
  assertCanActOnEscoteiro,
  filterVisibleEscoteiros,
  tryResolveRamoViewer,
} from "./lib/ramoVisibility";
import {
  snapshotProgression,
  detectLevelUps,
  type LevelUpToast,
} from "./lib/progression";
import { logRamoEvent } from "./lib/events";

// ---------------------------------------------------------------------------
// ramoGroup derivation
// ---------------------------------------------------------------------------

/** The ramoGroup for a given ramo (or fallback). Lobinho and escoteiro share "younger". */
function ramoToGroup(ramo: string | undefined | null): "younger" | "older" {
  if (ramo === "lobinho" || ramo === "escoteiro") return "younger";
  if (ramo === "senior" || ramo === "pioneiro") return "older";
  return "younger"; // default for unset ramo (mid-onboarding)
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all specialtyItemCompletions for the current user (any ramoGroup).
 * The UI uses this to render checked/pending/approved state for each item.
 */
export const getMySpecialtyItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.bannedAt) return [];

    return ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

/**
 * Return all specialtyItemCompletions for a specific escoteiro.
 * Used by the escotista to view an escoteiro's specialty progress.
 */
export const getSpecialtyItemsForEscoteiro = query({
  args: { escoteiroId: v.id("users") },
  handler: async (ctx, args) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return [];

    // Verify the escoteiro is visible to this viewer
    const escoteiro = await ctx.db.get(args.escoteiroId);
    if (!escoteiro) return [];
    const visible = filterVisibleEscoteiros(viewer, [escoteiro]);
    if (visible.length === 0) return [];

    return ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", args.escoteiroId))
      .take(1000);
  },
});

/**
 * Return pending specialtyItemCompletions for all visible escoteiros.
 * Grouped by (escoteiroId, specialtyId) so the escotista sees one card per specialty.
 *
 * Returns: Array of { escoteiro, specialtyId, ramoGroup, pendingItems }
 */
export const getPendingSpecialtyItemsForGroup = query({
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

    const result: {
      escoteiroId: Id<"users">;
      escoteiroName: string | undefined;
      escoteiroImage: string | undefined;
      escoteiroRamo: string | null;
      specialtyId: string;
      ramoGroup: "younger" | "older";
      pendingItems: Doc<"specialtyItemCompletions">[];
    }[] = [];

    for (const escoteiro of escoteiros) {
      const pendingItems = await ctx.db
        .query("specialtyItemCompletions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", escoteiro._id).eq("status", "pending"),
        )
        .take(200);

      if (pendingItems.length === 0) continue;

      // Group by (ramoGroup, specialtyId)
      const bySpecialty = new Map<
        string,
        { ramoGroup: "younger" | "older"; items: Doc<"specialtyItemCompletions">[] }
      >();
      for (const item of pendingItems) {
        const key = `${item.ramoGroup}:${item.specialtyId}`;
        if (!bySpecialty.has(key)) {
          bySpecialty.set(key, { ramoGroup: item.ramoGroup, items: [] });
        }
        bySpecialty.get(key)!.items.push(item);
      }

      for (const [key, { ramoGroup, items }] of bySpecialty) {
        const specialtyId = key.slice(ramoGroup.length + 1);
        result.push({
          escoteiroId: escoteiro._id,
          escoteiroName: escoteiro.name,
          escoteiroImage: escoteiro.image,
          escoteiroRamo: escoteiro.ramo ?? null,
          specialtyId,
          ramoGroup,
          pendingItems: items,
        });
      }
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Toggle a specialty item for the current user.
 *
 * - If no row exists → insert with status "pending" (or "approved" if caller is escotista)
 * - If row exists with status "pending" → delete (uncheck)
 * - If row exists with status "approved" → throw (only escotista can undo approvals)
 *
 * The ramoGroup is derived from the caller's ramo; an escotista toggling on
 * behalf of a target uses the target's ramo.
 */
export const toggleSpecialtyItem = mutation({
  args: {
    specialtyId: v.string(),
    itemIndex: v.number(),
    /** Optional: escotista marking an item for a specific escoteiro. */
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const caller = await getAuthenticatedUser(ctx);
    let effectiveUserId: Id<"users"> = caller._id;
    let status: "pending" | "approved" = "pending";
    let approvedBy: Id<"users"> | undefined = undefined;

    if (args.targetUserId) {
      await assertCanActOnEscoteiro(ctx, args.targetUserId);
      effectiveUserId = args.targetUserId;
      status = "approved";
      approvedBy = caller._id;
    } else if (caller.role === "escotista") {
      // Escotista marking their own item — treat as approved
      status = "approved";
      approvedBy = caller._id;
    }

    const effectiveUser =
      args.targetUserId ? await ctx.db.get(args.targetUserId) : caller;
    const ramoGroup = ramoToGroup(effectiveUser?.ramo);

    // Look for existing row
    const existing = await ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
        q
          .eq("userId", effectiveUserId)
          .eq("ramoGroup", ramoGroup)
          .eq("specialtyId", args.specialtyId),
      )
      .filter((q) => q.eq(q.field("itemIndex"), args.itemIndex))
      .first();

    if (existing) {
      if (existing.status === "approved" && caller.role !== "escotista") {
        throw new Error(
          "Item já aprovado pelo escotista. Apenas um escotista pode desfazer.",
        );
      }
      // Uncheck: delete the row
      const before = args.targetUserId
        ? await snapshotProgression(ctx, effectiveUserId)
        : null;
      await ctx.db.delete(existing._id);
      // Undoing an approval via escotista — may affect progression
      if (args.targetUserId && before && effectiveUser) {
        return detectLevelUps(ctx, caller, effectiveUser as Doc<"users">, before);
      }
      return [];
    }

    // Check: insert new row
    const before =
      status === "approved" && args.targetUserId
        ? await snapshotProgression(ctx, effectiveUserId)
        : null;

    await ctx.db.insert("specialtyItemCompletions", {
      userId: effectiveUserId,
      ramoGroup,
      specialtyId: args.specialtyId,
      itemIndex: args.itemIndex,
      completedAt: Date.now(),
      status,
      ...(approvedBy ? { approvedBy, approvedAt: Date.now() } : {}),
    });

    if (status === "approved" && args.targetUserId && before && effectiveUser) {
      const target = effectiveUser as Doc<"users">;
      await logRamoEvent(ctx, {
        type: "approval",
        actor: caller,
        subject: target,
        summary: `Aprovou item de especialidade: ${args.specialtyId}[${args.itemIndex}]`,
      });
      return detectLevelUps(ctx, caller, target, before);
    }

    return [];
  },
});

/**
 * Approve a pending specialtyItemCompletion.
 * Only an escotista who can act on the target escoteiro may call this.
 */
export const approveSpecialtyItem = mutation({
  args: { completionId: v.id("specialtyItemCompletions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

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
      summary: `Aprovou item de especialidade: ${doc.specialtyId}[${doc.itemIndex}]`,
    });
    return detectLevelUps(ctx, user, target, before);
  },
});

/**
 * Reject (delete) a pending specialtyItemCompletion.
 * Only an escotista who can act on the target escoteiro may call this.
 */
export const rejectSpecialtyItem = mutation({
  args: { completionId: v.id("specialtyItemCompletions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou item de especialidade: ${doc.specialtyId}[${doc.itemIndex}]`,
    });
    await ctx.db.delete(args.completionId);
  },
});

/**
 * Bulk approve all pending specialty items for a given (escoteiroId, specialtyId) group.
 * Escotistas use this to approve an entire specialty's pending items at once.
 */
export const approveSpecialtyItems = mutation({
  args: {
    escoteiroId: v.id("users"),
    specialtyId: v.string(),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    itemIds: v.array(v.id("specialtyItemCompletions")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const { target } = await assertCanActOnEscoteiro(ctx, args.escoteiroId);

    const now = Date.now();
    const before = await snapshotProgression(ctx, args.escoteiroId);

    for (const id of args.itemIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      if (
        doc.userId !== args.escoteiroId ||
        doc.specialtyId !== args.specialtyId ||
        doc.ramoGroup !== args.ramoGroup
      ) {
        continue; // safety: only act on the items explicitly passed
      }
      await ctx.db.patch(id, {
        status: "approved",
        approvedBy: user._id,
        approvedAt: now,
      });
    }

    await logRamoEvent(ctx, {
      type: "approval",
      actor: user,
      subject: target,
      summary: `Aprovou itens pendentes de especialidade: ${args.specialtyId}`,
    });

    return detectLevelUps(ctx, user, target, before);
  },
});

/**
 * Reject all pending specialty items for a given (escoteiroId, specialtyId) group.
 */
export const rejectSpecialtyItems = mutation({
  args: {
    escoteiroId: v.id("users"),
    specialtyId: v.string(),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    itemIds: v.array(v.id("specialtyItemCompletions")),
  },
  handler: async (ctx, args) => {
    const { caller, target } = await assertCanActOnEscoteiro(
      ctx,
      args.escoteiroId,
    );

    for (const id of args.itemIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      if (
        doc.userId !== args.escoteiroId ||
        doc.specialtyId !== args.specialtyId ||
        doc.ramoGroup !== args.ramoGroup
      ) {
        continue;
      }
      await ctx.db.delete(id);
    }

    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou itens pendentes de especialidade: ${args.specialtyId}`,
    });
  },
});
