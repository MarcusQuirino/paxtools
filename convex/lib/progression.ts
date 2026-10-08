import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Ramo } from "../../src/data/progression-data";
import { getRamoRules } from "../../src/data/progression-rules";
import {
  earnedSpecialtyIds,
  ramoGroupForRamo,
} from "../../src/lib/especialidade-standing";
import {
  deriveProgression,
  type ProgressionRows,
  type ProgressionState,
} from "../../src/lib/progression-state";
import { readStandings } from "./especialidades";
import { logRamoEvent } from "./events";

// The ramo → ramo group rule lives in src/lib/especialidade-standing.
export { ramoGroupForRamo };

/**
 * The codebase-wide default ramo — and prod's only ramo. A user with no ramo
 * yet (mid-onboarding) and every unstamped legacy row belong here. The single
 * place this default is spelled, so reads and writes can't drift apart.
 */
export const DEFAULT_RAMO: Ramo = "escoteiro";

/** The ramo whose progression `user` is currently working through. */
export function currentRamo(
  user: { ramo?: Ramo | null } | null | undefined,
): Ramo {
  return user?.ramo ?? DEFAULT_RAMO;
}

/** Upper bound on one escoteiro's ação conclusões (all ramos). */
const MAX_ACTION_ROWS = 500;

/** The stored rows an escoteiro's progression derives from. */
export type StoredProgressionRows = ProgressionRows<Doc<"customActions">> & {
  actions: Doc<"actionCompletions">[];
  irrItems: Doc<"irrCompletions">[];
};

/**
 * Read everything an escoteiro's progression derives from — the one place the
 * "which rows count for this ramo" reads live:
 * - ações stay by userId: their ids carry the ramo, so the derivation matches
 *   only the current ramo's catalog;
 * - ações personalizadas and IRR conclusões are keyed by shared blocoIds /
 *   item ids, so they are read for the current ramo only (ADR 0001) — a past
 *   ramo's rows never bleed in;
 * - earned especialidades come from the current ramo group's standing.
 */
export async function readProgressionRows(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<StoredProgressionRows> {
  const ramo = currentRamo(user);
  const [actions, customActions, irrItems, standings] = await Promise.all([
    ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_ACTION_ROWS),
    ctx.db
      .query("customActions")
      .withIndex("by_userId_and_ramo_and_blocoId", (q) =>
        q.eq("userId", user._id).eq("ramo", ramo),
      )
      .take(1000),
    ctx.db
      .query("irrCompletions")
      .withIndex("by_userId_and_ramo_and_itemId", (q) =>
        q.eq("userId", user._id).eq("ramo", ramo),
      )
      .take(10),
    readStandings(ctx, user._id, ramoGroupForRamo(user.ramo)),
  ]);
  return {
    ramo: user.ramo ?? null,
    actions,
    customActions,
    irrItems,
    earnedSpecialtyIds: earnedSpecialtyIds(standings),
  };
}

/** Read and derive an escoteiro's progression state. */
export async function readProgression(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<{
  rows: StoredProgressionRows;
  state: ProgressionState<Doc<"customActions">>;
}> {
  const rows = await readProgressionRows(ctx, user);
  return { rows, state: deriveProgression(rows) };
}

export type ProgressionSnapshot = {
  ramo: Ramo | null;
  stageIndex: number;
  stageId: string;
  stageName: string;
  lisDeOuro: boolean;
  completedBlockCount: number;
};

/** The level-up-relevant slice of a progression state. */
export function toSnapshot(state: ProgressionState<unknown>): ProgressionSnapshot {
  return {
    ramo: state.ramo,
    stageIndex: state.stageIndex,
    stageId: state.stage.id,
    stageName: state.stage.name,
    lisDeOuro: state.irrComplete,
    completedBlockCount: state.completedBlockCount,
  };
}

const EMPTY_SNAPSHOT_STATE = deriveProgression({
  ramo: null,
  actions: [],
  customActions: [],
  irrItems: [],
  earnedSpecialtyIds: [],
});

/**
 * An escoteiro's approved progression, for level-up detection. Only
 * *approved* conclusões count toward blocos/etapa (pending never does), which
 * is why a rejection — touching only pending rows — can never move the etapa.
 */
export async function snapshotProgression(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<ProgressionSnapshot> {
  const user = await ctx.db.get(userId);
  if (!user) return toSnapshot(EMPTY_SNAPSHOT_STATE);
  return toSnapshot((await readProgression(ctx, user)).state);
}

export type LevelUp =
  | { kind: "levelUp"; stageId: string; stageName: string }
  | { kind: "lisDeOuro"; irrName: string };

/**
 * Diff two snapshots into the level-ups crossed. "Literal" rule (the user's
 * choice): one event per etapa boundary crossed upward, plus a distinct IRR on a
 * false→true transition. No high-water-mark — a reject→re-approve that re-crosses
 * a boundary fires again, by design. Both snapshots share the subject's ramo, so
 * etapa names and the IRR name resolve from `after.ramo`.
 */
export function diffProgression(
  before: ProgressionSnapshot,
  after: ProgressionSnapshot,
): LevelUp[] {
  const ups: LevelUp[] = [];
  const rules = getRamoRules(after.ramo);
  if (after.stageIndex > before.stageIndex) {
    for (let i = before.stageIndex + 1; i <= after.stageIndex; i++) {
      const s = rules.etapas[i];
      if (s) ups.push({ kind: "levelUp", stageId: s.id, stageName: s.name });
    }
  }
  if (!before.lisDeOuro && after.lisDeOuro) {
    ups.push({ kind: "lisDeOuro", irrName: rules.irr.name });
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
    // For a levelUp this is the etapa name; for an IRR it's the ramo's IRR name
    // (e.g. "Lis de Ouro" for an escoteiro, "Cruzeiro do Sul" for a lobinho) so
    // the toast congratulates the right recognition.
    stageName: u.kind === "levelUp" ? u.stageName : u.irrName,
  }));
}

/**
 * Emit a levelUp/lisDeOuro audit event for each crossed boundary; returns the
 * ids of the events inserted.
 */
async function logLevelUps(
  ctx: MutationCtx,
  actor: Doc<"users">,
  subject: Doc<"users">,
  ups: LevelUp[],
): Promise<Id<"events">[]> {
  const ids: Id<"events">[] = [];
  for (const u of ups) {
    const id =
      u.kind === "levelUp"
        ? await logRamoEvent(ctx, {
            type: "levelUp",
            actor,
            subject,
            summary: `Subiu para ${u.stageName}`,
            stageId: u.stageId,
            stageName: u.stageName,
          })
        : await logRamoEvent(ctx, {
            type: "lisDeOuro",
            actor,
            subject,
            summary: `Conquistou a ${u.irrName}`,
          });
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Compare `subject`'s progression against a pre-approval snapshot, emit the
 * level-up events, and return toast payloads for the approving escotista plus
 * the ids of the events logged (so an undo can remove them). Call AFTER the
 * approving writes land. Empty when the subject is not an escoteiro
 * (escotistas have no progression timeline).
 */
export async function detectLevelUps(
  ctx: MutationCtx,
  actor: Doc<"users">,
  subject: Doc<"users">,
  before: ProgressionSnapshot,
): Promise<{ toasts: LevelUpToast[]; eventIds: Id<"events">[] }> {
  if (subject.role !== "escoteiro") return { toasts: [], eventIds: [] };
  const after = await snapshotProgression(ctx, subject._id);
  const ups = diffProgression(before, after);
  const eventIds = await logLevelUps(ctx, actor, subject, ups);
  return { toasts: toToasts(subject, ups), eventIds };
}
