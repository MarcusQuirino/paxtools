/**
 * Especialidades backend. Reads return the especialidade *standing* (see
 * src/lib/especialidade-standing) — never raw rows — so every surface agrees
 * on what is approved, waiting, earned and missing. Writes cover the younger
 * item checklist (lobinho + escoteiro) and the older three-etapa project
 * (sênior + pioneiro).
 */

import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";
import {
  assertCanActOnEscoteiro,
  filterVisibleEscoteiros,
  tryResolveRamoViewer,
  type RamoViewer,
} from "./lib/ramoVisibility";
import { ramoGroupForRamo, type LevelUpToast } from "./lib/progression";
import {
  approveConclusao,
  approveConclusoes,
  recordDirectApproval,
  rejectConclusao,
  rejectConclusoes,
  type ConclusaoDoc,
} from "./lib/review";
import { readObservedEscoteiros } from "./lib/sections";
import { readStandings } from "./lib/especialidades";
import {
  compareByProximity,
  emptyStanding,
  type OlderStanding,
  type RamoGroup,
  type Standing,
  type YoungerStanding,
} from "../src/lib/especialidade-standing";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";
import {
  PROJECT_STEPS,
  type ProjectStep as RosterStep,
} from "../src/data/specialty-data/older";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** An escoteiro's especialidades in their current ramo group. */
export type EspecialidadesRecord = {
  ramoGroup: RamoGroup;
  standings: Standing[];
};

async function recordFor(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<EspecialidadesRecord> {
  const ramoGroup = ramoGroupForRamo(user.ramo);
  return { ramoGroup, standings: await readStandings(ctx, user._id, ramoGroup) };
}

/**
 * The caller's own especialidades: one standing per especialidade they have
 * touched in their current ramo group (the group's catalog lists the rest).
 * Especialidades of a past ramo group are retained but never shown here.
 */
export const getMyEspecialidades = query({
  args: {},
  handler: async (ctx): Promise<EspecialidadesRecord> => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    if (!user || user.bannedAt) return { ramoGroup: "younger", standings: [] };
    return recordFor(ctx, user);
  },
});

/**
 * One escoteiro's especialidades, for an escotista who can see them
 * (visibilidade de ramo) — the per-escoteiro ficha. Null when not visible.
 */
export const getEscoteiroEspecialidades = query({
  args: { escoteiroId: v.id("users") },
  handler: async (ctx, args): Promise<EspecialidadesRecord | null> => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return null;
    const escoteiro = await ctx.db.get(args.escoteiroId);
    if (!escoteiro) return null;
    if (filterVisibleEscoteiros(viewer, [escoteiro]).length === 0) return null;
    return recordFor(ctx, escoteiro);
  },
});

// ---------------------------------------------------------------------------
// Mutations — the escoteiro's own submissions, and the escotista's reviews.
// Every review goes through lib/review (access, snapshot → write → audit →
// level-up cascade); these mutations only validate their arguments.
// ---------------------------------------------------------------------------

/**
 * The especialidade an escoteiro may mark in their current ramo group:
 * throws for a non-escoteiro, the wrong group, or an id the catalog lacks.
 */
function assertEspecialidadeOf(
  escoteiro: Doc<"users">,
  group: RamoGroup,
  specialtyId: string,
): void {
  if (escoteiro.role !== "escoteiro") {
    throw new Error("Apenas escoteiros têm especialidades");
  }
  if (ramoGroupForRamo(escoteiro.ramo) !== group) {
    throw new Error(
      group === "younger"
        ? "Especialidades de sênior e pioneiro são registradas por etapas"
        : "Especialidades de lobinho e escoteiro são registradas por itens",
    );
  }
  if (!emptyStanding(group, specialtyId)) {
    throw new Error("Especialidade não encontrada");
  }
}

function assertItemIndex(specialtyId: string, itemIndex: number): void {
  const total = YOUNGER_SPECIALTY_BY_ID.get(specialtyId)?.items.length ?? 0;
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= total) {
    throw new Error("Item inválido");
  }
}

async function findItem(
  ctx: QueryCtx,
  userId: Id<"users">,
  specialtyId: string,
  itemIndex: number,
): Promise<Doc<"specialtyItemCompletions"> | null> {
  const rows = await ctx.db
    .query("specialtyItemCompletions")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q.eq("userId", userId).eq("ramoGroup", "younger").eq("specialtyId", specialtyId),
    )
    .take(200);
  // Approved first, so a stray duplicate never hides an approval.
  const matches = rows.filter((r) => r.itemIndex === itemIndex);
  return matches.find((r) => r.status !== "pending") ?? matches[0] ?? null;
}

/**
 * The escoteiro checks or unchecks one item of a younger especialidade.
 *
 * - No row → insert it pending (an escotista approves it).
 * - Pending row → delete it (uncheck).
 * - Approved row → throws: only an escotista can undo an approval.
 */
export const toggleSpecialtyItem = mutation({
  args: { specialtyId: v.string(), itemIndex: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const caller = await getAuthenticatedUser(ctx);
    assertEspecialidadeOf(caller, "younger", args.specialtyId);
    assertItemIndex(args.specialtyId, args.itemIndex);

    const existing = await findItem(ctx, caller._id, args.specialtyId, args.itemIndex);
    if (existing) {
      if (existing.status !== "pending") {
        throw new Error(
          "Item já aprovado pelo escotista. Apenas um escotista pode desfazer.",
        );
      }
      await ctx.db.delete(existing._id);
      return null;
    }
    await ctx.db.insert("specialtyItemCompletions", {
      userId: caller._id,
      ramoGroup: "younger",
      specialtyId: args.specialtyId,
      itemIndex: args.itemIndex,
      completedAt: Date.now(),
      status: "pending",
    });
    return null;
  },
});

/** Reject (delete) one pending especialidade item. */
export const rejectSpecialtyItem = mutation({
  args: { completionId: v.id("specialtyItemCompletions") },
  handler: async (ctx, args) =>
    rejectConclusao(ctx, { kind: "specialtyItem", id: args.completionId }),
});

const itemBatchArgs = {
  escoteiroId: v.id("users"),
  specialtyId: v.string(),
  ramoGroup: v.union(v.literal("younger"), v.literal("older")),
  itemIds: v.array(v.id("specialtyItemCompletions")),
};

/** Only the passed items that belong to this (escoteiro, especialidade). */
function itemBatch(args: {
  escoteiroId: Id<"users">;
  specialtyId: string;
  ramoGroup: RamoGroup;
  itemIds: Id<"specialtyItemCompletions">[];
}) {
  return {
    refs: args.itemIds.map((id) => ({ kind: "specialtyItem" as const, id })),
    only: (doc: ConclusaoDoc) => {
      const item = doc as Doc<"specialtyItemCompletions">;
      return (
        item.userId === args.escoteiroId &&
        item.specialtyId === args.specialtyId &&
        item.ramoGroup === args.ramoGroup
      );
    },
  };
}

/** Approve an escoteiro's pending items of one especialidade at once. */
export const approveSpecialtyItems = mutation({
  args: itemBatchArgs,
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    await assertCanActOnEscoteiro(ctx, args.escoteiroId);
    const { refs, only } = itemBatch(args);
    return approveConclusoes(ctx, refs, only);
  },
});

/** Reject (delete) an escoteiro's pending items of one especialidade at once. */
export const rejectSpecialtyItems = mutation({
  args: itemBatchArgs,
  handler: async (ctx, args): Promise<null> => {
    await assertCanActOnEscoteiro(ctx, args.escoteiroId);
    const { refs, only } = itemBatch(args);
    await rejectConclusoes(ctx, refs, only);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Older ramoGroup (sênior + pioneiro) — project-report etapas (#43)
//
// Each especialidade is a three-etapa project: conhecer → fazer → compartilhar.
// The etapas are independent — an escoteiro may write and submit them in any
// order, and an escotista approves each on its own. The especialidade is
// earned (binarily — no levels) once all three are approved (ADR 0002).
// ---------------------------------------------------------------------------

const projectStep = v.union(
  v.literal("conhecer"),
  v.literal("fazer"),
  v.literal("compartilhar"),
);

/** A user's relato for one (especialidade, etapa), if any. */
async function findReport(
  ctx: QueryCtx,
  userId: Id<"users">,
  specialtyId: string,
  step: RosterStep,
): Promise<Doc<"specialtyProjectReports"> | null> {
  const rows = await ctx.db
    .query("specialtyProjectReports")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q.eq("userId", userId).eq("ramoGroup", "older").eq("specialtyId", specialtyId),
    )
    .take(10);
  return rows.find((r) => r.step === step) ?? null;
}

/**
 * Submit (create or replace) the relato of one etapa.
 *
 * - The escoteiro's own relato is pending; resubmitting a pending one replaces
 *   its text. An approved etapa is locked to the escoteiro.
 * - An escotista registering on a scout's behalf (`targetUserId`) writes it
 *   approved — audited and cascaded like any approval — but never over the
 *   scout's own pending relato: that is resolved with Aprovar / Rejeitar.
 */
export const submitSpecialtyStep = mutation({
  args: {
    specialtyId: v.string(),
    step: projectStep,
    text: v.string(),
    /** Optional: escotista submitting on behalf of a specific escoteiro. */
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const caller = await getAuthenticatedUser(ctx);
    const onBehalf = args.targetUserId
      ? (await assertCanActOnEscoteiro(ctx, args.targetUserId)).target
      : null;
    const escoteiro = onBehalf ?? caller;
    assertEspecialidadeOf(escoteiro, "older", args.specialtyId);

    const text = args.text.trim();
    if (!text) throw new Error("O relato não pode estar vazio.");

    const existing = await findReport(ctx, escoteiro._id, args.specialtyId, args.step);
    const write = async (status: "pending" | "approved") => {
      const now = Date.now();
      const approval =
        status === "approved"
          ? { approvedBy: caller._id, approvedAt: now }
          : { approvedBy: undefined, approvedAt: undefined };
      if (existing) {
        await ctx.db.patch(existing._id, { text, completedAt: now, status, ...approval });
      } else {
        await ctx.db.insert("specialtyProjectReports", {
          userId: escoteiro._id,
          ramoGroup: "older",
          specialtyId: args.specialtyId,
          step: args.step,
          text,
          completedAt: now,
          status,
          ...(status === "approved" ? approval : {}),
        });
      }
    };

    if (!onBehalf) {
      if (existing?.status === "approved") {
        throw new Error("Esta etapa já foi aprovada e não pode ser reenviada.");
      }
      await write("pending");
      return [];
    }

    if (existing?.status === "pending") {
      throw new Error("Etapa enviada pelo escoteiro — use Aprovar ou Rejeitar");
    }
    const { toasts } = await recordDirectApproval(
      ctx,
      {
        actor: caller,
        subject: onBehalf,
        verb: "Registrou",
        label: { kind: "specialtyStep", specialtyId: args.specialtyId, step: args.step },
      },
      async () => {
        await write("approved");
        return true;
      },
    );
    return toasts;
  },
});

/**
 * Approve one pending etapa. The approval that leaves all three approved
 * earns the especialidade, in whatever order they came (ADR 0002).
 */
export const approveSpecialtyStep = mutation({
  args: { reportId: v.id("specialtyProjectReports") },
  handler: async (ctx, args): Promise<LevelUpToast[]> =>
    approveConclusao(ctx, { kind: "specialtyStep", id: args.reportId }),
});

/** Reject (delete) one pending etapa; the escoteiro rewrites and resubmits. */
export const rejectSpecialtyStep = mutation({
  args: { reportId: v.id("specialtyProjectReports") },
  handler: async (ctx, args) =>
    rejectConclusao(ctx, { kind: "specialtyStep", id: args.reportId }),
});

// ---------------------------------------------------------------------------
// Escotista especialidades tab — catalog signals, per-specialty roster, and an
// explicit per-escoteiro item mark.
//
// Scope: every read here is limited to the escoteiros the caller sees —
// visibilidade de ramo first, then the seção observada narrows it (never
// widens) — and to those whose CURRENT ramo is in the requested ramoGroup
// (especialidades carry over only within a ramoGroup; CONTEXT.md). Counts are
// always of that visible set, never of the whole grupo.
// ---------------------------------------------------------------------------

const ramoGroupArg = v.union(v.literal("younger"), v.literal("older"));

/**
 * The escoteiros an aggregate especialidade view may count: the ones the
 * viewer is observing (visibilidade de ramo, then seção observada) whose
 * current ramo is in `ramoGroup`.
 */
async function observedEscoteirosInRamoGroup(
  ctx: QueryCtx,
  viewer: RamoViewer,
  ramoGroup: RamoGroup,
) {
  const { escoteiros, observedSection } = await readObservedEscoteiros(ctx, viewer);
  return {
    escoteiros: escoteiros.filter((e) => ramoGroupForRamo(e.ramo) === ramoGroup),
    observedSection,
  };
}

/** The ramoGroups a viewer accompanies (an admin, both). */
function viewerRamoGroups(viewer: RamoViewer): RamoGroup[] {
  if (viewer.isAdmin) return ["younger", "older"];
  const groups = new Set(viewer.ramos.map((r) => ramoGroupForRamo(r)));
  return (["younger", "older"] as const).filter((g) => groups.has(g));
}

type PersonRef = {
  _id: Id<"users">;
  name: string | null;
  image: string | null;
};

function personRef(u: Doc<"users">): PersonRef {
  return { _id: u._id, name: u.name ?? null, image: u.image ?? null };
}

type PersonStanding = { person: PersonRef; approvedCount: number; pendingCount: number };

function byProximity(a: PersonStanding, b: PersonStanding): number {
  return compareByProximity(
    { ...a, name: a.person.name },
    { ...b, name: b.person.name },
  );
}

/** Avatars shown per specialty row in the catalog. */
const MAX_AVATARS = 4;

/**
 * Catalog signals for the escotista Especialidades tab: per especialidade with
 * any activity in the visible set, how many conquistaram / are em andamento,
 * plus an avatar stack (closest to conquering first) and the tab's KPIs.
 * Especialidades nobody has touched are absent — the client lists them from
 * the static catalog.
 *
 * Younger: conquistou = level ≥ 1; em andamento = any item row (approved or
 * pending) short of level 1. Older: conquistou = all three etapas approved;
 * em andamento = any etapa row short of that.
 *
 * Silent-empty (null) for a caller who is not a valid escotista viewer.
 */
export const getGroupSpecialtySummary = query({
  args: { ramoGroup: ramoGroupArg },
  handler: async (ctx, args) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return null;

    const { escoteiros, observedSection } = await observedEscoteirosInRamoGroup(
      ctx,
      viewer,
      args.ramoGroup,
    );

    type Entry = {
      earned: PersonStanding[];
      inProgress: PersonStanding[];
      pendingCount: number;
    };
    const bySpecialty = new Map<string, Entry>();
    const record = (specialtyId: string, s: PersonStanding, earned: boolean) => {
      let e = bySpecialty.get(specialtyId);
      if (!e) {
        e = { earned: [], inProgress: [], pendingCount: 0 };
        bySpecialty.set(specialtyId, e);
      }
      (earned ? e.earned : e.inProgress).push(s);
      e.pendingCount += s.pendingCount;
    };

    for (const escoteiro of escoteiros) {
      const person = personRef(escoteiro);
      for (const st of await readStandings(ctx, escoteiro._id, args.ramoGroup)) {
        if (st.approvedCount === 0 && st.pendingCount === 0) continue;
        record(
          st.specialtyId,
          { person, approvedCount: st.approvedCount, pendingCount: st.pendingCount },
          st.earned,
        );
      }
    }

    let totalEarned = 0;
    let totalInProgress = 0;
    const specialties = [...bySpecialty].map(([specialtyId, e]) => {
      totalEarned += e.earned.length;
      totalInProgress += e.inProgress.length;
      const ordered = [
        ...[...e.earned].sort(byProximity),
        ...[...e.inProgress].sort(byProximity),
      ];
      return {
        specialtyId,
        earnedCount: e.earned.length,
        inProgressCount: e.inProgress.length,
        pendingCount: e.pendingCount,
        avatars: ordered.slice(0, MAX_AVATARS).map((s) => s.person),
      };
    });
    // Most activity first; ties by conquered count, then id (stable).
    specialties.sort(
      (a, b) =>
        b.earnedCount + b.inProgressCount - (a.earnedCount + a.inProgressCount) ||
        b.earnedCount - a.earnedCount ||
        a.specialtyId.localeCompare(b.specialtyId),
    );

    return {
      ramoGroup: args.ramoGroup,
      ramoGroups: viewerRamoGroups(viewer),
      escoteiroCount: escoteiros.length,
      observedSectionName: observedSection?.name ?? null,
      totals: { earned: totalEarned, inProgress: totalInProgress },
      specialties,
    };
  },
});

/**
 * Detail (consulta) for one especialidade across the visible set.
 *
 * Younger: per item "N têm" (approved) and pending counts; "Quem tem" = every
 * visible escoteiro with any row, closest to conquering first.
 * Older: per etapa approved/pending counts; "Quem tem" with each etapa's
 * status; and the pending relatos, so the escotista can approve/reject inline
 * (approveSpecialtyStep / rejectSpecialtyStep, which re-check access).
 *
 * Read-only. Silent-empty (null) for a non-viewer or an id outside the
 * ramoGroup's catalog.
 */
export const getSpecialtyRoster = query({
  args: { specialtyId: v.string(), ramoGroup: ramoGroupArg },
  handler: async (ctx, args) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return null;

    const { escoteiros, observedSection } = await observedEscoteirosInRamoGroup(
      ctx,
      viewer,
      args.ramoGroup,
    );
    const base = {
      specialtyId: args.specialtyId,
      escoteiroCount: escoteiros.length,
      observedSectionName: observedSection?.name ?? null,
    };

    // The not-started standing doubles as the catalog check: null = unknown id.
    if (!emptyStanding(args.ramoGroup, args.specialtyId)) return null;
    const standings: { escoteiro: Doc<"users">; standing: Standing }[] = [];
    for (const escoteiro of escoteiros) {
      const [standing] = await readStandings(
        ctx,
        escoteiro._id,
        args.ramoGroup,
        args.specialtyId,
      );
      if (!standing) continue;
      if (standing.approvedCount === 0 && standing.pendingCount === 0) continue;
      standings.push({ escoteiro, standing });
    }

    if (args.ramoGroup === "younger") {
      const total = YOUNGER_SPECIALTY_BY_ID.get(args.specialtyId)!.items.length;
      const items = Array.from({ length: total }, () => ({
        approvedCount: 0,
        pendingCount: 0,
      }));
      const people = standings.map(({ escoteiro, standing }) => {
        const st = standing as YoungerStanding;
        st.items.forEach((state, i) => {
          if (state?.status === "approved") items[i]!.approvedCount++;
          if (state?.status === "pending") items[i]!.pendingCount++;
        });
        return {
          ...personRef(escoteiro),
          approvedCount: st.approvedCount,
          pendingCount: st.pendingCount,
          level: st.level,
          missingForNextLevel: st.missingForNextLevel,
        };
      });
      people.sort(compareByProximity);
      return {
        ...base,
        kind: "younger" as const,
        earnedCount: people.filter((p) => p.level >= 1).length,
        inProgressCount: people.filter((p) => p.level === 0).length,
        items,
        people,
      };
    }

    const steps: Record<
      RosterStep,
      { approvedCount: number; pendingCount: number }
    > = {
      conhecer: { approvedCount: 0, pendingCount: 0 },
      fazer: { approvedCount: 0, pendingCount: 0 },
      compartilhar: { approvedCount: 0, pendingCount: 0 },
    };
    const pendingReports: {
      reportId: Id<"specialtyProjectReports">;
      escoteiroId: Id<"users">;
      escoteiroName: string | null;
      escoteiroImage: string | null;
      step: RosterStep;
      text: string;
      completedAt: number;
    }[] = [];
    const people = standings.map(({ escoteiro, standing }) => {
      const st = standing as OlderStanding;
      const stepStatus = {} as Record<RosterStep, "approved" | "pending" | null>;
      for (const s of PROJECT_STEPS) {
        const etapa = st.etapas[s];
        stepStatus[s] = etapa?.status ?? null;
        if (etapa?.status === "approved") steps[s].approvedCount++;
        if (etapa?.status === "pending") {
          steps[s].pendingCount++;
          pendingReports.push({
            reportId: etapa.rowId,
            escoteiroId: escoteiro._id,
            escoteiroName: escoteiro.name ?? null,
            escoteiroImage: escoteiro.image ?? null,
            step: s,
            text: etapa.text,
            completedAt: etapa.completedAt,
          });
        }
      }
      return {
        ...personRef(escoteiro),
        approvedCount: st.approvedCount,
        pendingCount: st.pendingCount,
        steps: stepStatus,
        earned: st.earned,
      };
    });
    people.sort(compareByProximity);
    // Oldest submission first — it has waited longest.
    pendingReports.sort((a, b) => a.completedAt - b.completedAt);
    return {
      ...base,
      kind: "older" as const,
      earnedCount: people.filter((p) => p.earned).length,
      inProgressCount: people.filter((p) => !p.earned).length,
      steps,
      people,
      pendingReports,
    };
  },
});

/**
 * Explicit escotista mark on one younger especialidade item of one escoteiro
 * (the actionable ficha). Unlike the escoteiro's toggle, it states the
 * outcome:
 *
 * - approved: true  → no row: insert approved; pending row: promote it to
 *   approved (keeps the escoteiro's completedAt); approved row: no-op.
 * - approved: false → approved row: delete it (unmark — may drop a level or
 *   un-complete a bloco, same as unmarking an ação); no row: no-op; pending
 *   row: throws — a submission is resolved with Aprovar / Rejeitar, never
 *   silently deleted by an unmark.
 *
 * An approval is audited and cascaded through lib/review.
 */
export const setSpecialtyItemApproved = mutation({
  args: {
    escoteiroId: v.id("users"),
    specialtyId: v.string(),
    itemIndex: v.number(),
    approved: v.boolean(),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const { caller, target } = await assertCanActOnEscoteiro(
      ctx,
      args.escoteiroId,
    );
    assertEspecialidadeOf(target, "younger", args.specialtyId);
    assertItemIndex(args.specialtyId, args.itemIndex);

    const existing = await findItem(ctx, target._id, args.specialtyId, args.itemIndex);
    const existingApproved = !!existing && existing.status !== "pending";

    if (!args.approved) {
      if (!existing) return [];
      if (!existingApproved) {
        throw new Error("Item enviado pelo escoteiro — use Aprovar ou Rejeitar");
      }
      // Unmark: same as unmarking an ação — no audit line, no warning; a
      // dropped level or bloco simply drops.
      await ctx.db.delete(existing._id);
      return [];
    }
    if (existingApproved) return [];

    const { toasts } = await recordDirectApproval(
      ctx,
      {
        actor: caller,
        subject: target,
        label: {
          kind: "specialtyItem",
          specialtyId: args.specialtyId,
          itemIndex: args.itemIndex,
        },
      },
      async () => {
        const now = Date.now();
        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "approved",
            approvedBy: caller._id,
            approvedAt: now,
          });
        } else {
          await ctx.db.insert("specialtyItemCompletions", {
            userId: target._id,
            ramoGroup: "younger",
            specialtyId: args.specialtyId,
            itemIndex: args.itemIndex,
            completedAt: now,
            status: "approved",
            approvedBy: caller._id,
            approvedAt: now,
          });
        }
        return true;
      },
    );
    return toasts;
  },
});
