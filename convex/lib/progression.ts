import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  getCompletedBlockIds,
  getCurrentStage,
  isLisDeOuroComplete,
} from "../../src/lib/completion-logic";
import { getEixosForRamo } from "../../src/data/progression-data";
import { STAGES } from "../../src/data/progression-rules";
import { logRamoEvent } from "./events";

/**
 * A point-in-time view of an escoteiro's *approved* progression: which stage
 * (Pista/Trilha/Rumo/Travessia) they have reached and whether they hold the Lis
 * de Ouro. Derived exactly the way the client derives it (same shared logic),
 * so backend level-up detection agrees with what the escoteiro sees.
 */
export type ProgressionSnapshot = {
  stageIndex: number;
  stageId: string;
  stageName: string;
  lisDeOuro: boolean;
};

/**
 * Recompute an escoteiro's approved progression from their completion rows.
 * Only *approved* completions count toward blocks/stage (pending never does),
 * which is why a rejection — touching only pending rows — can never move the
 * stage and needs no detection.
 */
export async function snapshotProgression(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<ProgressionSnapshot> {
  const user = await ctx.db.get(userId);
  const ramo = user?.ramo ?? null;

  const actions = await ctx.db
    .query("actionCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(500);
  const specialties = await ctx.db
    .query("specialtyCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(500);
  const customActions = await ctx.db
    .query("customActions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(1000);
  const lisItems = await ctx.db
    .query("lisDeOuroCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(10);

  const approvedActionIds = new Set(
    actions.filter((a) => a.status !== "pending").map((a) => a.actionId),
  );
  const pendingActionIds = new Set(
    actions.filter((a) => a.status === "pending").map((a) => a.actionId),
  );

  const eixos = getEixosForRamo(ramo);
  const { approved } = getCompletedBlockIds(
    eixos,
    approvedActionIds,
    pendingActionIds,
    customActions.map((c) => ({
      blocoId: c.blocoId,
      completed: c.completed,
      status: c.status,
    })),
    specialties.map((s) => ({ blocoId: s.blocoId, status: s.status })),
  );

  const completedBlockCount = approved.size;
  const stage = getCurrentStage(completedBlockCount);
  const stageIndex = STAGES.findIndex((s) => s.id === stage.id);

  const approvedLisItemIds = new Set(
    lisItems.filter((i) => i.status !== "pending").map((i) => i.itemId),
  );
  const lisDeOuro = isLisDeOuroComplete(completedBlockCount, approvedLisItemIds);

  return { stageIndex, stageId: stage.id, stageName: stage.name, lisDeOuro };
}

export type LevelUp =
  | { kind: "levelUp"; stageId: string; stageName: string }
  | { kind: "lisDeOuro" };

/**
 * Diff two snapshots into the level-ups crossed. "Literal" rule (the user's
 * choice): one event per stage boundary crossed upward, plus a distinct Lis de
 * Ouro on a false→true transition. No high-water-mark — a reject→re-approve that
 * re-crosses a boundary fires again, by design.
 */
export function diffProgression(
  before: ProgressionSnapshot,
  after: ProgressionSnapshot,
): LevelUp[] {
  const ups: LevelUp[] = [];
  if (after.stageIndex > before.stageIndex) {
    for (let i = before.stageIndex + 1; i <= after.stageIndex; i++) {
      const s = STAGES[i];
      if (s) ups.push({ kind: "levelUp", stageId: s.id, stageName: s.name });
    }
  }
  if (!before.lisDeOuro && after.lisDeOuro) {
    ups.push({ kind: "lisDeOuro" });
  }
  return ups;
}

/** A level-up surfaced back to the approving escotista as a toast. */
export type LevelUpToast = {
  subjectUserId: Id<"users">;
  subjectName: string | null;
  kind: "levelUp" | "lisDeOuro";
  stageName: string | null;
};

function toToasts(subject: Doc<"users">, ups: LevelUp[]): LevelUpToast[] {
  return ups.map((u) => ({
    subjectUserId: subject._id,
    subjectName: subject.name ?? null,
    kind: u.kind,
    stageName: u.kind === "levelUp" ? u.stageName : null,
  }));
}

/** Emit a levelUp/lisDeOuro audit event for each crossed boundary. */
async function logLevelUps(
  ctx: MutationCtx,
  actor: Doc<"users">,
  subject: Doc<"users">,
  ups: LevelUp[],
): Promise<void> {
  for (const u of ups) {
    if (u.kind === "levelUp") {
      await logRamoEvent(ctx, {
        type: "levelUp",
        actor,
        subject,
        summary: `Subiu para ${u.stageName}`,
        stageId: u.stageId,
        stageName: u.stageName,
      });
    } else {
      await logRamoEvent(ctx, {
        type: "lisDeOuro",
        actor,
        subject,
        summary: "Conquistou a Lis de Ouro",
      });
    }
  }
}

/**
 * Compare `subject`'s progression against a pre-approval snapshot, emit the
 * level-up events, and return toast payloads for the approving escotista. Call
 * AFTER the approving writes land. Returns [] when the subject is not an
 * escoteiro (escotistas have no progression timeline).
 */
export async function detectLevelUps(
  ctx: MutationCtx,
  actor: Doc<"users">,
  subject: Doc<"users">,
  before: ProgressionSnapshot,
): Promise<LevelUpToast[]> {
  if (subject.role !== "escoteiro") return [];
  const after = await snapshotProgression(ctx, subject._id);
  const ups = diffProgression(before, after);
  await logLevelUps(ctx, actor, subject, ups);
  return toToasts(subject, ups);
}
