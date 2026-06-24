import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  getEixosForRamo,
  parseActionId,
  type Ramo,
} from "../../src/data/progression-data";

/** Completion kinds that produce an approval/rejection audit line. */
export type CompletionKind = "action" | "specialty" | "custom" | "lis";

export type CompletionDoc =
  | Doc<"actionCompletions">
  | Doc<"specialtyCompletions">
  | Doc<"lisDeOuroCompletions">
  | Doc<"customActions">;

/** Pull the label-relevant field off a completion row by its kind. */
export function completionRef(
  doc: CompletionDoc,
  kind: CompletionKind,
): { actionId?: string; specialtyName?: string; itemId?: string; text?: string } {
  switch (kind) {
    case "action":
      return { actionId: (doc as Doc<"actionCompletions">).actionId };
    case "specialty":
      return { specialtyName: (doc as Doc<"specialtyCompletions">).specialtyName };
    case "custom":
      return { text: (doc as Doc<"customActions">).text };
    case "lis":
      return { itemId: (doc as Doc<"lisDeOuroCompletions">).itemId };
  }
}

const LIS_ITEM_LABELS: Record<string, string> = {
  lis_promessa: "Promessa Escoteira",
  lis_blocos: "Todos os Blocos",
  lis_jornada: "Jornada de Travessia",
  lis_autoavaliacao: "Autoavaliação",
  lis_corte_honra: "Corte de Honra",
};

/** Resolve a human label for the thing approved/rejected (audit-accurate). */
export function describeCompletion(
  ramo: Ramo | null | undefined,
  kind: CompletionKind,
  ref: { actionId?: string; specialtyName?: string; itemId?: string; text?: string },
): string {
  switch (kind) {
    case "action": {
      const id = ref.actionId ?? "";
      const parsed = parseActionId(id);
      if (!parsed) return id;
      const eixos = getEixosForRamo(ramo ?? parsed.ramo);
      for (const eixo of eixos) {
        for (const bloco of eixo.blocos) {
          if (bloco.id !== parsed.blocoId) continue;
          const actions =
            parsed.type === "fixed" ? bloco.fixedActions : bloco.variableActions;
          return actions[parsed.index]?.text ?? id;
        }
      }
      return id;
    }
    case "specialty":
      return ref.specialtyName ?? "Especialidade";
    case "custom":
      return ref.text ?? "Ação personalizada";
    case "lis":
      return LIS_ITEM_LABELS[ref.itemId ?? ""] ?? ref.itemId ?? "Lis de Ouro";
  }
}

/**
 * Insert a ramo-scoped progression event (approval/rejection/levelUp/lisDeOuro).
 * `actor` is the escotista who acted; `subject` is the escoteiro. groupId/ramo
 * are taken from the subject so visibility follows the escoteiro's ramo. Skips
 * silently if the subject has no group (cannot be scoped/shown).
 */
export async function logRamoEvent(
  ctx: MutationCtx,
  args: {
    type: "approval" | "rejection" | "levelUp" | "lisDeOuro";
    actor: Doc<"users">;
    subject: Doc<"users">;
    summary?: string;
    stageId?: string;
    stageName?: string;
  },
): Promise<void> {
  const groupId = args.subject.groupId ?? args.actor.groupId;
  if (!groupId) return;
  await ctx.db.insert("events", {
    type: args.type,
    scope: "ramo",
    groupId,
    subjectRamo: args.subject.ramo,
    actorUserId: args.actor._id,
    actorName: args.actor.name,
    subjectUserId: args.subject._id,
    subjectName: args.subject.name,
    summary: args.summary,
    stageId: args.stageId,
    stageName: args.stageName,
  });
}

/**
 * Insert a group-level membership/admin event (admin-only visibility). `subject`
 * is the member affected. `groupId` is passed explicitly because the subject's
 * own groupId may already have been cleared by the mutation (e.g. a ban).
 */
export async function logGroupEvent(
  ctx: MutationCtx,
  args: {
    type: "memberJoin" | "memberBan" | "ramoChange" | "accessChange";
    actor: Doc<"users">;
    subject: Doc<"users">;
    groupId: Id<"groups">;
    summary?: string;
  },
): Promise<void> {
  await ctx.db.insert("events", {
    type: args.type,
    scope: "group",
    groupId: args.groupId,
    actorUserId: args.actor._id,
    actorName: args.actor.name,
    subjectUserId: args.subject._id,
    subjectName: args.subject.name,
    summary: args.summary,
  });
}
