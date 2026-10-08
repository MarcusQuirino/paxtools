import { query, mutation } from "./_generated/server";
import { v, type Infer } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { assertCanActOnEscoteiro } from "./lib/ramoVisibility";
import { readProgression, currentRamo, type LevelUpToast } from "./lib/progression";
import type { ConclusaoLabel } from "./lib/events";
import { recordDirectApproval } from "./lib/review";
import { completionStatusValidator } from "./schema";
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

type CompletionStatus = Infer<typeof completionStatusValidator>;

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
 * cascade runs (lib/review); self-marks and un-marks log nothing and return
 * no toasts. `write` returns whether an approval landed.
 */
async function applyMark(
  ctx: MutationCtx,
  opts: {
    targetUserId: Id<"users"> | undefined;
    caller: Doc<"users">;
    label: ConclusaoLabel;
  },
  write: () => Promise<boolean>,
): Promise<{ toasts: LevelUpToast[]; eventIds: Id<"events">[] }> {
  const subject = opts.targetUserId ? await ctx.db.get(opts.targetUserId) : null;
  if (!subject) {
    await write();
    return { toasts: [], eventIds: [] };
  }
  return recordDirectApproval(ctx, { actor: opts.caller, subject, label: opts.label }, write);
}

/** A new conclusão for an ação, approved when `approvedBy` is set. */
function insertActionCompletion(
  ctx: MutationCtx,
  row: {
    userId: Id<"users">;
    actionId: string;
    status: CompletionStatus;
    approvedBy: Id<"users"> | undefined;
  },
): Promise<Id<"actionCompletions">> {
  const now = Date.now();
  return ctx.db.insert("actionCompletions", {
    ...row,
    completedAt: now,
    approvedAt: row.approvedBy ? now : undefined,
  });
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

    const { toasts } = await applyMark(
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
        await insertActionCompletion(ctx, {
          userId: effectiveUserId,
          actionId: args.actionId,
          status,
          approvedBy,
        });
        return status === "approved";
      },
    );
    return toasts;
  },
});

/**
 * What a Revisão rápida mark did, handed back to `undoMarkAction`. When
 * `created` is false the ação already had a conclusão and nothing was written.
 */
export type MarkReceipt = {
  created: boolean;
  completionId: Id<"actionCompletions"> | null;
  status: CompletionStatus | null;
  eventIds: Id<"events">[];
  toasts: LevelUpToast[];
};

/**
 * Idempotent mark (Revisão rápida): inserts the conclusão if the ação has
 * none (any status), otherwise does nothing — a stale or doubled swipe never
 * un-marks. Status and audit follow toggleAction.
 */
export const markAction = mutation({
  args: {
    actionId: v.string(),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<MarkReceipt> => {
    const { effectiveUserId, status, approvedBy, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    if (!ACTION_ID_PATTERN.test(args.actionId))
      throw new Error("ID de ação inválido");

    const existing = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_actionId", (q) =>
        q.eq("userId", effectiveUserId).eq("actionId", args.actionId),
      )
      .unique();
    if (existing) {
      return { created: false, completionId: null, status: null, eventIds: [], toasts: [] };
    }

    let completionId: Id<"actionCompletions"> | null = null;
    const { toasts, eventIds } = await applyMark(
      ctx,
      {
        targetUserId: args.targetUserId,
        caller,
        label: { kind: "action", actionId: args.actionId },
      },
      async () => {
        completionId = await insertActionCompletion(ctx, {
          userId: effectiveUserId,
          actionId: args.actionId,
          status,
          approvedBy,
        });
        return status === "approved";
      },
    );

    return { created: true, completionId, status, eventIds, toasts };
  },
});

/**
 * A mark's writes all happen inside one mutation, which can't run longer than
 * this; events logged outside that window belong to some other write.
 */
const MARK_WINDOW_MS = 1000;

/**
 * Whether `event` is one of the audit lines the mark that created
 * `completion` logged: by this caller, about this escoteiro, of a kind a
 * direct approval logs, and written in the same mutation (right after the
 * conclusão). A stale or forged receipt can't take other events down with it.
 */
function loggedByMark(
  event: Doc<"events">,
  completion: Doc<"actionCompletions">,
  callerId: Id<"users">,
): boolean {
  const sinceMark = event._creationTime - completion._creationTime;
  return (
    event.actorUserId === callerId &&
    event.subjectUserId === completion.userId &&
    (event.type === "approval" || event.type === "levelUp" || event.type === "lisDeOuro") &&
    sinceMark >= 0 &&
    sinceMark < MARK_WINDOW_MS
  );
}

/**
 * Undo a Revisão rápida mark, given its receipt. Removes the conclusão only
 * while it is still the one that mark created (same row, same status, same
 * approver); otherwise it removes nothing. Undoing an escotista's mark also
 * deletes the events it logged, so an undone mark leaves no timeline trace.
 * An escoteiro still can't remove an approved conclusão.
 */
export const undoMarkAction = mutation({
  args: {
    completionId: v.id("actionCompletions"),
    status: completionStatusValidator,
    eventIds: v.array(v.id("events")),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<{ removed: boolean }> => {
    const { effectiveUserId, status, approvedBy, callerIsEscotista, caller } =
      await resolveTargetAndStatus(ctx, args.targetUserId);

    const doc = await ctx.db.get(args.completionId);
    if (!doc) return { removed: false };
    if (doc.userId !== effectiveUserId) throw new Error("Não encontrado");

    // Checked before the approved-lock: an escoteiro undoing a mark an
    // escotista has since approved just finds it no longer theirs.
    const stillOurs =
      args.status === status &&
      doc.status === status &&
      doc.approvedBy === approvedBy;
    if (!stillOurs) return { removed: false };
    assertCanRemoveApproved(doc.status, callerIsEscotista);

    await ctx.db.delete(doc._id);
    if (callerIsEscotista) {
      for (const eventId of args.eventIds) {
        const event = await ctx.db.get(eventId);
        if (event && loggedByMark(event, doc, caller._id)) {
          await ctx.db.delete(eventId);
        }
      }
    }
    return { removed: true };
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

    const { toasts } = await applyMark(
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
    return toasts;
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

    const { toasts } = await applyMark(
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
    return toasts;
  },
});
