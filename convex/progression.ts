import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { assertCanActOnEscoteiro } from "./lib/ramoVisibility";
import {
  snapshotProgression,
  detectLevelUps,
  readCurrentRamoIrrItems,
  readCurrentRamoSpecialties,
  readCurrentRamoCustomActions,
  currentRamo,
  type LevelUpToast,
  type ProgressionSnapshot,
} from "./lib/progression";
import {
  logRamoEvent,
  describeCompletion,
  type CompletionKind,
} from "./lib/events";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ACTION_ID_PATTERN = /^(lobinho|escoteiro|senior|pioneiro):[a-z0-9-]+:(fixed|variable):\d+$/;
const BLOCO_ID_PATTERN = /^[a-z0-9-]+$/;
const VALID_IRR_ITEM_IDS = new Set([
  "irr_promessa",
  "irr_blocos",
  "irr_jornada",
  "irr_autoavaliacao",
  "irr_corte_honra",
]);
const MAX_CUSTOM_ACTIONS_PER_BLOCO = 20;

type CompletionStatus = "pending" | "approved";

async function resolveTargetAndStatus(
  ctx: MutationCtx,
  targetUserId?: Id<"users">,
): Promise<{
  effectiveUserId: Id<"users">;
  status: CompletionStatus;
  approvedBy?: Id<"users">;
  callerIsEscotista: boolean;
  caller: Doc<"users">;
}> {
  const caller = await getAuthenticatedUser(ctx);

  if (targetUserId) {
    await assertCanActOnEscoteiro(ctx, targetUserId);
    return {
      effectiveUserId: targetUserId,
      status: "approved",
      approvedBy: caller._id,
      callerIsEscotista: true,
      caller,
    };
  }

  if (caller.role === "escotista") {
    return {
      effectiveUserId: caller._id,
      status: "approved",
      callerIsEscotista: true,
      caller,
    };
  }

  return {
    effectiveUserId: caller._id,
    status: "pending",
    callerIsEscotista: false,
    caller,
  };
}

/**
 * Finish an escotista-driven mark that resulted in a new approval: log the
 * approval event and detect level-ups. Only fires when an escotista acted on an
 * escoteiro's items (`targetUserId` set) AND an approval actually landed —
 * self-marks and un-marks return no toasts. `before` is the pre-write snapshot.
 */
async function finishApproval(
  ctx: MutationCtx,
  opts: {
    targetUserId: Id<"users"> | undefined;
    caller: Doc<"users">;
    subjectId: Id<"users">;
    before: ProgressionSnapshot | null;
    approved: boolean;
    kind: CompletionKind;
    ref: { actionId?: string; specialtyName?: string; itemId?: string; text?: string };
  },
): Promise<LevelUpToast[]> {
  if (!opts.targetUserId || !opts.approved || !opts.before) return [];
  const subject = await ctx.db.get(opts.subjectId);
  if (!subject) return [];
  await logRamoEvent(ctx, {
    type: "approval",
    actor: opts.caller,
    subject,
    summary: `Aprovou: ${describeCompletion(subject.ramo, opts.kind, opts.ref)}`,
  });
  return detectLevelUps(ctx, opts.caller, subject, opts.before);
}

function assertCanRemoveApproved(
  existingStatus: CompletionStatus | undefined,
  callerIsEscotista: boolean,
) {
  if (existingStatus === "approved" && !callerIsEscotista) {
    throw new Error(
      "Item já aprovado pelo escotista. Apenas um escotista pode desfazer.",
    );
  }
}

export const getMyCompletions = query({
  args: {},
  handler: async (ctx) => {
    const empty = {
      ramo: null,
      actions: [],
      specialties: [],
      customActions: [],
      irrItems: [],
    };

    const userId = await getAuthUserId(ctx);
    if (!userId) return empty;

    const user = await ctx.db.get(userId);
    // Banned users are locked out of self-reads too (mutations already throw).
    if (!user || user.bannedAt) return empty;

    const actions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);

    // Especialidades, ações personalizadas and IRR items are ramo-scoped:
    // only the current ramo's rows (blocoIds are shared, so isolation is at
    // the read). Actions self-isolate via their ramo-prefixed ids.
    const specialties = await readCurrentRamoSpecialties(ctx, userId, user.ramo);
    const customActions = await readCurrentRamoCustomActions(
      ctx,
      userId,
      user.ramo,
    );
    const irrItems = await readCurrentRamoIrrItems(ctx, userId, user.ramo);

    return {
      ramo: user?.ramo ?? null,
      actions,
      specialties,
      customActions,
      irrItems,
    };
  },
});

export const getCompletionsForUser = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    await assertCanActOnEscoteiro(ctx, args.targetUserId);

    const target = await ctx.db.get(args.targetUserId);

    const actions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .take(500);

    // Ramo-scoped to the target's current ramo (see getMyCompletions).
    const specialties = await readCurrentRamoSpecialties(
      ctx,
      args.targetUserId,
      target?.ramo,
    );
    const customActions = await readCurrentRamoCustomActions(
      ctx,
      args.targetUserId,
      target?.ramo,
    );
    const irrItems = await readCurrentRamoIrrItems(
      ctx,
      args.targetUserId,
      target?.ramo,
    );

    return {
      ramo: target?.ramo ?? null,
      actions,
      specialties,
      customActions,
      irrItems,
    };
  },
});

export const toggleAction = mutation({
  args: {
    actionId: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const { effectiveUserId, status, approvedBy, callerIsEscotista, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    if (!ACTION_ID_PATTERN.test(args.actionId))
      throw new Error("ID de ação inválido");

    const existing = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_actionId", (q) =>
        q.eq("userId", effectiveUserId).eq("actionId", args.actionId),
      )
      .unique();

    const before = args.targetUserId
      ? await snapshotProgression(ctx, effectiveUserId)
      : null;
    let approved = false;

    if (existing) {
      if (existing.status === "pending" && status === "approved") {
        // Escotista clicking a pending item → approve it
        await ctx.db.patch(existing._id, {
          status: "approved",
          approvedBy,
          approvedAt: Date.now(),
        });
        approved = true;
      } else {
        assertCanRemoveApproved(existing.status, callerIsEscotista);
        await ctx.db.delete(existing._id);
      }
    } else {
      await ctx.db.insert("actionCompletions", {
        userId: effectiveUserId,
        actionId: args.actionId,
        completedAt: Date.now(),
        status,
        approvedBy,
        approvedAt: approvedBy ? Date.now() : undefined,
      });
      if (status === "approved") approved = true;
    }

    return finishApproval(ctx, {
      targetUserId: args.targetUserId,
      caller,
      subjectId: effectiveUserId,
      before,
      approved,
      kind: "action",
      ref: { actionId: args.actionId },
    });
  },
});

export const toggleSpecialty = mutation({
  args: {
    blocoId: v.string(),
    specialtyName: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const { effectiveUserId, status, approvedBy, callerIsEscotista, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    if (!BLOCO_ID_PATTERN.test(args.blocoId))
      throw new Error("ID de bloco inválido");
    if (!args.specialtyName.trim() || args.specialtyName.length > 200)
      throw new Error("Nome de especialidade inválido");

    // Stamp/scope by the acting escoteiro's current ramo.
    const ramo = currentRamo(await ctx.db.get(effectiveUserId));

    const existing = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_ramo_and_blocoId_and_specialtyName", (q) =>
        q
          .eq("userId", effectiveUserId)
          .eq("ramo", ramo)
          .eq("blocoId", args.blocoId)
          .eq("specialtyName", args.specialtyName),
      )
      .unique();

    const before = args.targetUserId
      ? await snapshotProgression(ctx, effectiveUserId)
      : null;
    let approved = false;

    if (existing) {
      if (existing.status === "pending" && status === "approved") {
        await ctx.db.patch(existing._id, {
          status: "approved",
          approvedBy,
          approvedAt: Date.now(),
        });
        approved = true;
      } else {
        assertCanRemoveApproved(existing.status, callerIsEscotista);
        await ctx.db.delete(existing._id);
      }
    } else {
      await ctx.db.insert("specialtyCompletions", {
        userId: effectiveUserId,
        ramo,
        blocoId: args.blocoId,
        specialtyName: args.specialtyName,
        completedAt: Date.now(),
        status,
        approvedBy,
        approvedAt: approvedBy ? Date.now() : undefined,
      });
      if (status === "approved") approved = true;
    }

    return finishApproval(ctx, {
      targetUserId: args.targetUserId,
      caller,
      subjectId: effectiveUserId,
      before,
      approved,
      kind: "specialty",
      ref: { specialtyName: args.specialtyName },
    });
  },
});

export const addCustomAction = mutation({
  args: {
    blocoId: v.string(),
    text: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { effectiveUserId } = await resolveTargetAndStatus(
      ctx,
      args.targetUserId,
    );

    if (!BLOCO_ID_PATTERN.test(args.blocoId))
      throw new Error("ID de bloco inválido");

    const text = args.text.trim();
    if (!text) throw new Error("Texto vazio");
    if (text.length > 500) throw new Error("Texto muito longo");

    // Stamp/scope by the acting escoteiro's current ramo.
    const ramo = currentRamo(await ctx.db.get(effectiveUserId));

    // Per-bloco cap counts only this ramo's rows.
    const existingCount = await ctx.db
      .query("customActions")
      .withIndex("by_userId_and_ramo_and_blocoId", (q) =>
        q.eq("userId", effectiveUserId).eq("ramo", ramo).eq("blocoId", args.blocoId),
      )
      .take(MAX_CUSTOM_ACTIONS_PER_BLOCO + 1);
    if (existingCount.length >= MAX_CUSTOM_ACTIONS_PER_BLOCO)
      throw new Error("Limite de ações personalizadas atingido");

    return await ctx.db.insert("customActions", {
      userId: effectiveUserId,
      ramo,
      blocoId: args.blocoId,
      text,
      completed: false,
      createdAt: Date.now(),
    });
  },
});

export const toggleCustomAction = mutation({
  args: {
    customActionId: v.id("customActions"),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const { effectiveUserId, status, approvedBy, callerIsEscotista, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    const doc = await ctx.db.get(args.customActionId);
    if (!doc || doc.userId !== effectiveUserId)
      throw new Error("Não encontrado");

    const before = args.targetUserId
      ? await snapshotProgression(ctx, effectiveUserId)
      : null;
    let approved = false;

    if (doc.completed && doc.status === "pending" && status === "approved") {
      // Escotista clicking a pending custom action → approve it
      await ctx.db.patch(args.customActionId, {
        status: "approved",
        approvedBy,
        approvedAt: Date.now(),
      });
      approved = true;
    } else {
      // Unchecking a completed custom action requires approval lock check.
      if (doc.completed) {
        assertCanRemoveApproved(doc.status, callerIsEscotista);
      }
      await ctx.db.patch(args.customActionId, {
        completed: !doc.completed,
        status: !doc.completed ? status : undefined,
        approvedBy: !doc.completed ? approvedBy : undefined,
        approvedAt: !doc.completed && approvedBy ? Date.now() : undefined,
      });
      if (!doc.completed && status === "approved") approved = true;
    }

    return finishApproval(ctx, {
      targetUserId: args.targetUserId,
      caller,
      subjectId: effectiveUserId,
      before,
      approved,
      kind: "custom",
      ref: { text: doc.text },
    });
  },
});

export const deleteCustomAction = mutation({
  args: {
    customActionId: v.id("customActions"),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { effectiveUserId, callerIsEscotista } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    const doc = await ctx.db.get(args.customActionId);
    if (!doc || doc.userId !== effectiveUserId)
      throw new Error("Não encontrado");

    if (doc.completed) {
      assertCanRemoveApproved(doc.status, callerIsEscotista);
    }

    await ctx.db.delete(args.customActionId);
  },
});

export const toggleIrrItem = mutation({
  args: {
    itemId: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const { effectiveUserId, status, approvedBy, callerIsEscotista, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    if (!VALID_IRR_ITEM_IDS.has(args.itemId))
      throw new Error("ID de item inválido");

    // Stamp the acting escoteiro's current ramo so the row lands in the right
    // ramo's record. null ramo → "escoteiro" (codebase-wide default).
    const subject = await ctx.db.get(effectiveUserId);
    const ramo = subject?.ramo ?? "escoteiro";

    const existing = await ctx.db
      .query("irrCompletions")
      .withIndex("by_userId_and_ramo_and_itemId", (q) =>
        q.eq("userId", effectiveUserId).eq("ramo", ramo).eq("itemId", args.itemId),
      )
      .unique();

    const before = args.targetUserId
      ? await snapshotProgression(ctx, effectiveUserId)
      : null;
    let approved = false;

    if (existing) {
      if (existing.status === "pending" && status === "approved") {
        await ctx.db.patch(existing._id, {
          status: "approved",
          approvedBy,
          approvedAt: Date.now(),
        });
        approved = true;
      } else {
        assertCanRemoveApproved(existing.status, callerIsEscotista);
        await ctx.db.delete(existing._id);
      }
    } else {
      await ctx.db.insert("irrCompletions", {
        userId: effectiveUserId,
        ramo,
        itemId: args.itemId,
        completedAt: Date.now(),
        status,
        approvedBy,
        approvedAt: approvedBy ? Date.now() : undefined,
      });
      if (status === "approved") approved = true;
    }

    return finishApproval(ctx, {
      targetUserId: args.targetUserId,
      caller,
      subjectId: effectiveUserId,
      before,
      approved,
      kind: "irr",
      ref: { itemId: args.itemId },
    });
  },
});
