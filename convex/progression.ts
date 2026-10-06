import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { assertCanActOnEscoteiro } from "./lib/ramoVisibility";
import { readProgression, currentRamo, type LevelUpToast } from "./lib/progression";
import type { ConclusaoLabel } from "./lib/events";
import { recordDirectApproval } from "./lib/review";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

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
 * Run a mark's write. When an escotista marks for an escoteiro
 * (`targetUserId`) and an approval lands, it is audited and the level-up
 * cascade runs (lib/review); self-marks and un-marks return no toasts.
 * `write` returns whether an approval landed.
 */
async function applyMark(
  ctx: MutationCtx,
  opts: {
    targetUserId: Id<"users"> | undefined;
    caller: Doc<"users">;
    label: ConclusaoLabel;
  },
  write: () => Promise<boolean>,
): Promise<LevelUpToast[]> {
  const subject = opts.targetUserId ? await ctx.db.get(opts.targetUserId) : null;
  if (!subject) {
    await write();
    return [];
  }
  return recordDirectApproval(ctx, { actor: opts.caller, subject, label: opts.label }, write);
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

const EMPTY_COMPLETIONS = {
  ramo: null,
  actions: [],
  customActions: [],
  irrItems: [],
  earnedSpecialtyBlocoIds: [] as string[],
  earnedSpecialtyIds: [] as string[],
};

/**
 * An escoteiro's progression rows for the client, which derives the same
 * progression state from them (src/lib/progression-state) that the server's
 * snapshot does — one read, one derivation, both sides.
 */
async function completionsOf(ctx: QueryCtx, user: Doc<"users">) {
  const { rows, state } = await readProgression(ctx, user);
  return {
    ramo: rows.ramo,
    actions: rows.actions,
    customActions: rows.customActions,
    irrItems: rows.irrItems,
    earnedSpecialtyBlocoIds: [...state.earnedSpecialtyBlocoIds],
    earnedSpecialtyIds: [...state.earnedSpecialtyIds],
  };
}

export const getMyCompletions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return EMPTY_COMPLETIONS;
    const user = await ctx.db.get(userId);
    // Banned users are locked out of self-reads too (mutations already throw).
    if (!user || user.bannedAt) return EMPTY_COMPLETIONS;
    return completionsOf(ctx, user);
  },
});

export const getCompletionsForUser = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { target } = await assertCanActOnEscoteiro(ctx, args.targetUserId);
    return completionsOf(ctx, target);
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

    return applyMark(
      ctx,
      {
        targetUserId: args.targetUserId,
        caller,
        label: { kind: "action", actionId: args.actionId },
      },
      async () => {
        if (existing) {
          if (existing.status === "pending" && status === "approved") {
            // Escotista clicking a pending item → approve it
            await ctx.db.patch(existing._id, {
              status: "approved",
              approvedBy,
              approvedAt: Date.now(),
            });
            return true;
          }
          assertCanRemoveApproved(existing.status, callerIsEscotista);
          await ctx.db.delete(existing._id);
          return false;
        }
        await ctx.db.insert("actionCompletions", {
          userId: effectiveUserId,
          actionId: args.actionId,
          completedAt: Date.now(),
          status,
          approvedBy,
          approvedAt: approvedBy ? Date.now() : undefined,
        });
        return status === "approved";
      },
    );
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

    return applyMark(
      ctx,
      {
        targetUserId: args.targetUserId,
        caller,
        label: { kind: "custom", text: doc.text },
      },
      async () => {
        if (doc.completed && doc.status === "pending" && status === "approved") {
          // Escotista clicking a pending custom action → approve it
          await ctx.db.patch(args.customActionId, {
            status: "approved",
            approvedBy,
            approvedAt: Date.now(),
          });
          return true;
        }
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
        return !doc.completed && status === "approved";
      },
    );
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
    // ramo's record. null ramo → the codebase-wide default.
    const ramo = currentRamo(await ctx.db.get(effectiveUserId));

    const existing = await ctx.db
      .query("irrCompletions")
      .withIndex("by_userId_and_ramo_and_itemId", (q) =>
        q.eq("userId", effectiveUserId).eq("ramo", ramo).eq("itemId", args.itemId),
      )
      .unique();

    return applyMark(
      ctx,
      {
        targetUserId: args.targetUserId,
        caller,
        label: { kind: "irr", itemId: args.itemId },
      },
      async () => {
        if (existing) {
          if (existing.status === "pending" && status === "approved") {
            await ctx.db.patch(existing._id, {
              status: "approved",
              approvedBy,
              approvedAt: Date.now(),
            });
            return true;
          }
          assertCanRemoveApproved(existing.status, callerIsEscotista);
          await ctx.db.delete(existing._id);
          return false;
        }
        await ctx.db.insert("irrCompletions", {
          userId: effectiveUserId,
          ramo,
          itemId: args.itemId,
          completedAt: Date.now(),
          status,
          approvedBy,
          approvedAt: approvedBy ? Date.now() : undefined,
        });
        return status === "approved";
      },
    );
  },
});
