import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  getEixosForRamo,
  parseActionId,
  type Ramo,
} from "../../src/data/progression-data";
import { getRamoRules } from "../../src/data/progression-rules";
import { YOUNGER_SPECIALTY_BY_ID } from "../../src/data/specialty-data/younger";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEP_LABELS,
  type ProjectStep,
} from "../../src/data/specialty-data/older";
import { SPECIAL_INTEREST_BADGE_BY_ID } from "../../src/data/badge-data";

/**
 * The thing an approval/rejection audit line is about — every kind of
 * conclusão an escotista reviews.
 */
export type ConclusaoLabel =
  | { kind: "action"; actionId: string }
  | { kind: "custom"; text: string }
  | { kind: "irr"; itemId: string }
  | { kind: "specialtyItem"; specialtyId: string; itemIndex: number }
  | { kind: "specialtyStep"; specialtyId: string; step: ProjectStep }
  | { kind: "badgeRequirement"; badgeId: string; requirementIndex: number };

// Short audit labels for escoteiro's IRR items, kept byte-identical to preserve
// existing escoteiro timeline lines. Non-escoteiro ramos fall back to their
// ramo-correct item text from getRamoRules (see describeCompletion).
const IRR_ITEM_LABELS: Record<string, string> = {
  irr_promessa: "Promessa Escoteira",
  irr_blocos: "Todos os Blocos",
  irr_jornada: "Jornada de Travessia",
  irr_autoavaliacao: "Autoavaliação",
  irr_corte_honra: "Corte de Honra",
};

function specialtyName(specialtyId: string): string {
  return (
    YOUNGER_SPECIALTY_BY_ID.get(specialtyId)?.name ??
    OLDER_SPECIALTY_BY_ID.get(specialtyId)?.name ??
    specialtyId
  );
}

/** Resolve a human label for the thing approved/rejected (audit-accurate). */
export function describeCompletion(
  ramo: Ramo | null | undefined,
  label: ConclusaoLabel,
): string {
  switch (label.kind) {
    case "action": {
      const id = label.actionId;
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
    case "custom":
      return label.text || "Ação personalizada";
    case "irr": {
      const itemId = label.itemId;
      // Audit-fidelity special case (NOT a display path): escoteiro keeps its
      // established concise audit labels so existing timelines stay consistent;
      // other ramos resolve their own IRR item text from getRamoRules. The
      // display surfaces (banner, recognition section, toast, pending view) are
      // all ramo-driven with no such branch.
      if (!ramo || ramo === "escoteiro") {
        return IRR_ITEM_LABELS[itemId] ?? itemId ?? "Lis de Ouro";
      }
      const rules = getRamoRules(ramo);
      return rules.irr.items.find((i) => i.id === itemId)?.text ?? rules.irr.name;
    }
    case "specialtyItem":
      return `${specialtyName(label.specialtyId)} — item ${label.itemIndex + 1}`;
    case "specialtyStep":
      return `${specialtyName(label.specialtyId)} — etapa ${PROJECT_STEP_LABELS[label.step]}`;
    case "badgeRequirement": {
      const name = SPECIAL_INTEREST_BADGE_BY_ID.get(label.badgeId)?.name ?? label.badgeId;
      return `${name} — requisito ${label.requirementIndex + 1}`;
    }
  }
}

/**
 * Insert a ramo-scoped progression event (approval/rejection/levelUp/lisDeOuro).
 * `actor` is the escotista who acted; `subject` is the escoteiro. groupId/ramo
 * are taken from the subject so visibility follows the escoteiro's ramo. Skips
 * silently if the subject has no group (cannot be scoped/shown). Returns the
 * inserted event's id, or null when skipped.
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
): Promise<Id<"events"> | null> {
  const groupId = args.subject.groupId ?? args.actor.groupId;
  if (!groupId) return null;
  return await ctx.db.insert("events", {
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
