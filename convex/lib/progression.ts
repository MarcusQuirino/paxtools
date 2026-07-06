import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  getCompletedBlockIds,
  getCurrentStage,
  getEarnedSpecialtyIds,
  getEarnedSpecialtyBlocoIds,
  isIrrComplete,
} from "../../src/lib/completion-logic";
import { getEixosForRamo, type Ramo } from "../../src/data/progression-data";
import { getRamoRules } from "../../src/data/progression-rules";
import { YOUNGER_SPECIALTY_BY_ID } from "../../src/data/specialty-data/younger";
import { logRamoEvent } from "./events";

/**
 * The ramoGroup a ramo belongs to. Lobinho + escoteiro share "younger" (one
 * item-based specialty catalog); sênior + pioneiro share "older" (project-based).
 * An unset ramo (mid-onboarding) defaults to "younger". The single place this
 * mapping lives, so specialties/progression reads can't drift.
 */
export function ramoGroupForRamo(
  ramo: string | undefined | null,
): "younger" | "older" {
  if (ramo === "senior" || ramo === "pioneiro") return "older";
  return "younger";
}

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

/**
 * Read the recognition (IRR) rows for a user's CURRENT ramo. The one place the
 * "(userId, ramo) → irrCompletions" read lives, so the consumers (self read,
 * escotista-view read, progression snapshot) can't drift. Not used by the
 * escotista pending/approve-all path, which reads by (userId, status) on
 * purpose — see the note there.
 */
export async function readCurrentRamoIrrItems(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ramo: Ramo | null | undefined,
): Promise<Doc<"irrCompletions">[]> {
  return ctx.db
    .query("irrCompletions")
    .withIndex("by_userId_and_ramo_and_itemId", (q) =>
      q.eq("userId", userId).eq("ramo", ramo ?? DEFAULT_RAMO),
    )
    .take(10);
}

/**
 * @deprecated Use specialtyItemCompletions / specialtyProjectReports instead.
 * Still called by `getMyCompletions` / `getCompletionsForUser` to serve the
 * legacy specialty display until #42–44 replace it. Also used by
 * `migrations:migrateSpecialtyCompletions` to read rows for conversion.
 * Will be removed once the new specialty UI (#42–44) ships and migration
 * is confirmed on prod.
 */
export async function readCurrentRamoSpecialties(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ramo: Ramo | null | undefined,
): Promise<Doc<"specialtyCompletions">[]> {
  return ctx.db
    .query("specialtyCompletions")
    .withIndex("by_userId_and_ramo_and_blocoId_and_specialtyName", (q) =>
      q.eq("userId", userId).eq("ramo", ramo ?? DEFAULT_RAMO),
    )
    .take(500);
}

/** Read a user's ações personalizadas for their CURRENT ramo (#37). */
export async function readCurrentRamoCustomActions(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ramo: Ramo | null | undefined,
): Promise<Doc<"customActions">[]> {
  return ctx.db
    .query("customActions")
    .withIndex("by_userId_and_ramo_and_blocoId", (q) =>
      q.eq("userId", userId).eq("ramo", ramo ?? DEFAULT_RAMO),
    )
    .take(1000);
}

/**
 * Compute what a user has earned *via especialidade* (#44): for each
 * younger-catalog specialty earned at level ≥ 1 (from approved
 * `specialtyItemCompletions` counts), returns both the earned specialty ids and
 * the bloco(s) whose `alternativeCompletions` name them. `blocoIds` drives bloco
 * completion; `specialtyIds` lets the UI mark the exact specialty checkbox
 * (blocos list many alternatives, so the blocoId alone can't pick which).
 * Purely derived — no extra storage. Older ramoGroups have no item completions,
 * so both are naturally empty for them (project auto-completion is out of #44).
 */
export async function readEarnedSpecialtyBlocoIds(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ramo: Ramo | null | undefined,
): Promise<{ blocoIds: Set<string>; specialtyIds: Set<string> }> {
  if (ramoGroupForRamo(ramo) !== "younger") {
    return { blocoIds: new Set(), specialtyIds: new Set() };
  }

  // Approved = anything not explicitly pending (matches the /especialidades read
  // and migration, which write status "approved" but treat a missing status as
  // approved too).
  const items = await ctx.db
    .query("specialtyItemCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(2000);
  const approvedItems = items.filter(
    (i) => i.ramoGroup === "younger" && i.status !== "pending",
  );

  const specialtyIds = getEarnedSpecialtyIds(
    approvedItems,
    (specialtyId) => YOUNGER_SPECIALTY_BY_ID.get(specialtyId)?.items.length ?? 0,
  );

  return {
    blocoIds: getEarnedSpecialtyBlocoIds(getEixosForRamo(ramo), specialtyIds),
    specialtyIds,
  };
}

export type ProgressionSnapshot = {
  ramo: Ramo | null;
  stageIndex: number;
  stageId: string;
  stageName: string;
  lisDeOuro: boolean;
  completedBlockCount: number;
};

/**
 * Recompute an escoteiro's approved progression from their completion rows.
 * Only *approved* completions count toward blocks/stage (pending never does),
 * which is why a rejection — touching only pending rows — can never move the
 * stage and needs no detection.
 */
export async function snapshotProgression(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<ProgressionSnapshot> {
  const user = await ctx.db.get(userId);
  const ramo = user?.ramo ?? null;

  // actionCompletions stay by_userId: their ids are ramo-prefixed, so
  // getCompletedBlockIds (below) matches only the current ramo's catalog. The
  // other three are keyed by shared blocoIds, so they must be ramo-scoped at the
  // read or a past ramo's completions bleed into this ramo's block count.
  const actions = await ctx.db
    .query("actionCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(500);
  const customActions = await readCurrentRamoCustomActions(ctx, userId, ramo);
  // IRR items are ramo-scoped: only the current ramo's recognition rows feed
  // the IRR-complete check.
  const irrItems = await readCurrentRamoIrrItems(ctx, userId, ramo);

  const approvedActionIds = new Set(
    actions.filter((a) => a.status !== "pending").map((a) => a.actionId),
  );
  const pendingActionIds = new Set(
    actions.filter((a) => a.status === "pending").map((a) => a.actionId),
  );

  const eixos = getEixosForRamo(ramo);
  // Blocos satisfied via an earned especialidade (level ≥ 1), computed on read
  // from approved specialtyItemCompletions counts + the catalog (#44).
  const { blocoIds: earnedSpecialtyBlocoIds } =
    await readEarnedSpecialtyBlocoIds(ctx, userId, ramo);
  const { approved } = getCompletedBlockIds(
    eixos,
    approvedActionIds,
    pendingActionIds,
    customActions.map((c) => ({
      blocoId: c.blocoId,
      completed: c.completed,
      status: c.status,
    })),
    earnedSpecialtyBlocoIds,
  );

  const completedBlockCount = approved.size;
  const stage = getCurrentStage(completedBlockCount, ramo);
  const stageIndex = getRamoRules(ramo).etapas.findIndex(
    (s) => s.id === stage.id,
  );

  const approvedIrrItemIds = new Set(
    irrItems.filter((i) => i.status !== "pending").map((i) => i.itemId),
  );
  const lisDeOuro = isIrrComplete(
    completedBlockCount,
    approvedIrrItemIds,
    ramo,
  );

  return {
    ramo,
    stageIndex,
    stageId: stage.id,
    stageName: stage.name,
    lisDeOuro,
    completedBlockCount,
  };
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
        summary: `Conquistou a ${u.irrName}`,
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
