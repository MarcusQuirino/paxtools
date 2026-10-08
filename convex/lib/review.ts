/**
 * Conclusão review — the one module behind every escotista approval and
 * rejection, of every kind of conclusão (ação, ação personalizada, IRR item,
 * especialidade item, etapa de especialidade).
 *
 * It owns what each approve/reject mutation used to hand-write:
 * - access: every reviewed row is checked with assertCanActOnEscoteiro
 *   (visibilidade de ramo);
 * - ordering: snapshot the escoteiro's progression BEFORE any write, then
 *   write, then audit, then detect level-ups against the snapshot — skipping
 *   the snapshot silently loses the level-up toast;
 * - per-kind rules: a pending ação personalizada is one marked `completed`;
 *   rejecting it resets it (the escoteiro keeps the text) while every other
 *   kind is deleted (ADR 0002 keeps rejection delete-based);
 * - the audit line, labelled the same way for every kind.
 *
 * Mutations stay thin: validate their arguments, call in here.
 */
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "./authHelpers";
import { assertCanActOnEscoteiro } from "./ramoVisibility";
import {
  detectLevelUps,
  detectLevelUpsLogged,
  snapshotProgression,
  type LevelUpToast,
  type ProgressionSnapshot,
} from "./progression";
import { describeCompletion, logRamoEvent, type ConclusaoLabel } from "./events";

type Tables = {
  action: "actionCompletions";
  irr: "irrCompletions";
  custom: "customActions";
  specialtyItem: "specialtyItemCompletions";
  specialtyStep: "specialtyProjectReports";
};
export type ConclusaoKind = keyof Tables;

/** A reference to one stored conclusão. */
export type ConclusaoRef = {
  [K in ConclusaoKind]: { kind: K; id: Id<Tables[K]> };
}[ConclusaoKind];

/** Any stored conclusão row. */
export type ConclusaoDoc = Doc<Tables[ConclusaoKind]>;

/** A conclusão as loaded for review. */
type Loaded = { ref: ConclusaoRef; doc: ConclusaoDoc };

function isPending(ref: ConclusaoRef, doc: ConclusaoDoc): boolean {
  if (doc.status !== "pending") return false;
  // An ação personalizada only waits on the escotista once it is marked done.
  return ref.kind !== "custom" || (doc as Doc<"customActions">).completed;
}

function notPendingMessage(ref: ConclusaoRef): string {
  return ref.kind === "specialtyStep"
    ? "Etapa não está pendente"
    : "Item não está pendente";
}

/** The audit label of a stored conclusão. */
export function labelOf(ref: ConclusaoRef, doc: ConclusaoDoc): ConclusaoLabel {
  switch (ref.kind) {
    case "action":
      return { kind: "action", actionId: (doc as Doc<"actionCompletions">).actionId };
    case "irr":
      return { kind: "irr", itemId: (doc as Doc<"irrCompletions">).itemId };
    case "custom":
      return { kind: "custom", text: (doc as Doc<"customActions">).text };
    case "specialtyItem": {
      const d = doc as Doc<"specialtyItemCompletions">;
      return { kind: "specialtyItem", specialtyId: d.specialtyId, itemIndex: d.itemIndex };
    }
    case "specialtyStep": {
      const d = doc as Doc<"specialtyProjectReports">;
      return { kind: "specialtyStep", specialtyId: d.specialtyId, step: d.step };
    }
  }
}

/** Audit one approval/rejection of a conclusão. */
async function audit(
  ctx: MutationCtx,
  type: "approval" | "rejection",
  actor: Doc<"users">,
  subject: Doc<"users">,
  label: ConclusaoLabel,
): Promise<void> {
  const verb = type === "approval" ? "Aprovou" : "Rejeitou";
  await logRamoEvent(ctx, {
    type,
    actor,
    subject,
    summary: `${verb}: ${describeCompletion(subject.ramo, label)}`,
  });
}

async function markApproved(
  ctx: MutationCtx,
  ref: ConclusaoRef,
  approver: Id<"users">,
  now: number,
): Promise<void> {
  await ctx.db.patch(ref.id, { status: "approved", approvedBy: approver, approvedAt: now });
}

async function removeRejected(ctx: MutationCtx, ref: ConclusaoRef): Promise<void> {
  if (ref.kind === "custom") {
    await ctx.db.patch(ref.id, {
      completed: false,
      status: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
    });
  } else {
    await ctx.db.delete(ref.id);
  }
}

/** Approve every loaded conclusão, with one snapshot/cascade per escoteiro. */
async function approveLoaded(
  ctx: MutationCtx,
  actor: Doc<"users">,
  loaded: Loaded[],
  subjects: Map<Id<"users">, Doc<"users">>,
): Promise<LevelUpToast[]> {
  const before = new Map<Id<"users">, ProgressionSnapshot>();
  for (const id of subjects.keys()) {
    before.set(id, await snapshotProgression(ctx, id));
  }
  const now = Date.now();
  for (const { ref, doc } of loaded) {
    await markApproved(ctx, ref, actor._id, now);
    await audit(ctx, "approval", actor, subjects.get(doc.userId)!, labelOf(ref, doc));
  }
  const toasts: LevelUpToast[] = [];
  for (const [id, subject] of subjects) {
    toasts.push(...(await detectLevelUps(ctx, actor, subject, before.get(id)!)));
  }
  return toasts;
}

/**
 * Approve one pending conclusão. Throws "Não encontrado" / "… não está
 * pendente", or the visibilidade de ramo denial. Authenticates before reading
 * the row, so an anonymous caller always gets "Não autenticado".
 */
export async function approveConclusao(
  ctx: MutationCtx,
  ref: ConclusaoRef,
): Promise<LevelUpToast[]> {
  const actor = await getAuthenticatedUser(ctx);
  const doc = await ctx.db.get(ref.id);
  if (!doc) throw new Error("Não encontrado");
  if (!isPending(ref, doc)) throw new Error(notPendingMessage(ref));
  const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);
  return approveLoaded(ctx, actor, [{ ref, doc }], new Map([[target._id, target]]));
}

/**
 * Reject one pending conclusão. Throws like approveConclusao, but reads the
 * row first: a dangling id is "Não encontrado" even for an anonymous caller.
 */
export async function rejectConclusao(
  ctx: MutationCtx,
  ref: ConclusaoRef,
): Promise<void> {
  const doc = await ctx.db.get(ref.id);
  if (!doc) throw new Error("Não encontrado");
  if (!isPending(ref, doc)) throw new Error(notPendingMessage(ref));
  const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
  await audit(ctx, "rejection", caller, target, labelOf(ref, doc));
  await removeRejected(ctx, ref);
}

/**
 * Load the still-pending conclusões among `refs`, checking access to each.
 * Rows that are gone or no longer pending are skipped silently (a bulk review
 * races the escoteiro), and so are rows `only` rejects.
 */
async function loadPending(
  ctx: MutationCtx,
  refs: ConclusaoRef[],
  only?: (doc: ConclusaoDoc) => boolean,
): Promise<{ loaded: Loaded[]; subjects: Map<Id<"users">, Doc<"users">> }> {
  const loaded: Loaded[] = [];
  const subjects = new Map<Id<"users">, Doc<"users">>();
  for (const ref of refs) {
    const doc = await ctx.db.get(ref.id);
    if (!doc || !isPending(ref, doc)) continue;
    if (only && !only(doc)) continue;
    const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);
    subjects.set(target._id, target);
    loaded.push({ ref, doc });
  }
  return { loaded, subjects };
}

/** Approve many conclusões, possibly of several escoteiros, at once. */
export async function approveConclusoes(
  ctx: MutationCtx,
  refs: ConclusaoRef[],
  only?: (doc: ConclusaoDoc) => boolean,
): Promise<LevelUpToast[]> {
  const actor = await getAuthenticatedUser(ctx);
  const { loaded, subjects } = await loadPending(ctx, refs, only);
  return approveLoaded(ctx, actor, loaded, subjects);
}

/** Reject many conclusões at once. Rejections never move an etapa. */
export async function rejectConclusoes(
  ctx: MutationCtx,
  refs: ConclusaoRef[],
  only?: (doc: ConclusaoDoc) => boolean,
): Promise<void> {
  const actor = await getAuthenticatedUser(ctx);
  const { loaded, subjects } = await loadPending(ctx, refs, only);
  for (const { ref, doc } of loaded) {
    await audit(ctx, "rejection", actor, subjects.get(doc.userId)!, labelOf(ref, doc));
    await removeRejected(ctx, ref);
  }
}

/**
 * An escotista marking a conclusão for an escoteiro directly (tapping an ação,
 * an especialidade item, registering an etapa on their behalf). `write`
 * performs the change and returns whether an approval landed; only then is it
 * audited (as `verb`, default "Aprovou") and the level-up cascade run against
 * the progression from before the write. Access must already be checked.
 */
export async function recordDirectApproval(
  ctx: MutationCtx,
  args: {
    actor: Doc<"users">;
    subject: Doc<"users">;
    label: ConclusaoLabel;
    verb?: string;
  },
  write: () => Promise<boolean>,
): Promise<LevelUpToast[]> {
  return (await recordDirectApprovalLogged(ctx, args, write)).toasts;
}

/**
 * recordDirectApproval, also returning the ids of every event it logged (the
 * approval plus any levelUp/lisDeOuro) so an undo can remove them.
 */
export async function recordDirectApprovalLogged(
  ctx: MutationCtx,
  args: {
    actor: Doc<"users">;
    subject: Doc<"users">;
    label: ConclusaoLabel;
    verb?: string;
  },
  write: () => Promise<boolean>,
): Promise<{ toasts: LevelUpToast[]; eventIds: Id<"events">[] }> {
  const before = await snapshotProgression(ctx, args.subject._id);
  if (!(await write())) return { toasts: [], eventIds: [] };
  const approvalId = await logRamoEvent(ctx, {
    type: "approval",
    actor: args.actor,
    subject: args.subject,
    summary: `${args.verb ?? "Aprovou"}: ${describeCompletion(args.subject.ramo, args.label)}`,
  });
  const { toasts, eventIds } = await detectLevelUpsLogged(
    ctx,
    args.actor,
    args.subject,
    before,
  );
  return { toasts, eventIds: approvalId ? [approvalId, ...eventIds] : eventIds };
}
