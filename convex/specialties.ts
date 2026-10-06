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
import {
  snapshotProgression,
  detectLevelUps,
  ramoGroupForRamo,
  type LevelUpToast,
} from "./lib/progression";
import { logRamoEvent } from "./lib/events";
import {
  filterToObservedSection,
  resolveObservedSection,
} from "./lib/sections";
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
// Mutations
// ---------------------------------------------------------------------------

/**
 * Toggle a specialty item for the current user.
 *
 * - If no row exists → insert with status "pending" (or "approved" if caller is escotista)
 * - If row exists with status "pending" → delete (uncheck)
 * - If row exists with status "approved" → throw (only escotista can undo approvals)
 *
 * The ramoGroup is derived from the caller's ramo; an escotista toggling on
 * behalf of a target uses the target's ramo.
 */
export const toggleSpecialtyItem = mutation({
  args: {
    specialtyId: v.string(),
    itemIndex: v.number(),
    /** Optional: escotista marking an item for a specific escoteiro. */
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const caller = await getAuthenticatedUser(ctx);
    let effectiveUserId: Id<"users"> = caller._id;
    let status: "pending" | "approved" = "pending";
    let approvedBy: Id<"users"> | undefined = undefined;

    if (args.targetUserId) {
      await assertCanActOnEscoteiro(ctx, args.targetUserId);
      effectiveUserId = args.targetUserId;
      status = "approved";
      approvedBy = caller._id;
    } else if (caller.role === "escotista") {
      // Escotista marking their own item — treat as approved
      status = "approved";
      approvedBy = caller._id;
    }

    const effectiveUser = args.targetUserId
      ? await ctx.db.get(args.targetUserId)
      : caller;
    const ramoGroup = ramoGroupForRamo(effectiveUser?.ramo);

    // Look for existing row
    const existing = await ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
        q
          .eq("userId", effectiveUserId)
          .eq("ramoGroup", ramoGroup)
          .eq("specialtyId", args.specialtyId),
      )
      .filter((q) => q.eq(q.field("itemIndex"), args.itemIndex))
      .first();

    if (existing) {
      if (existing.status === "approved" && caller.role !== "escotista") {
        throw new Error(
          "Item já aprovado pelo escotista. Apenas um escotista pode desfazer.",
        );
      }
      // Uncheck: delete the row
      const before = args.targetUserId
        ? await snapshotProgression(ctx, effectiveUserId)
        : null;
      await ctx.db.delete(existing._id);
      // Undoing an approval via escotista — may affect progression
      if (args.targetUserId && before && effectiveUser) {
        return detectLevelUps(
          ctx,
          caller,
          effectiveUser as Doc<"users">,
          before,
        );
      }
      return [];
    }

    // Check: insert new row
    const before =
      status === "approved" && args.targetUserId
        ? await snapshotProgression(ctx, effectiveUserId)
        : null;

    await ctx.db.insert("specialtyItemCompletions", {
      userId: effectiveUserId,
      ramoGroup,
      specialtyId: args.specialtyId,
      itemIndex: args.itemIndex,
      completedAt: Date.now(),
      status,
      ...(approvedBy ? { approvedBy, approvedAt: Date.now() } : {}),
    });

    if (status === "approved" && args.targetUserId && before && effectiveUser) {
      const target = effectiveUser as Doc<"users">;
      await logRamoEvent(ctx, {
        type: "approval",
        actor: caller,
        subject: target,
        summary: `Aprovou item de especialidade: ${args.specialtyId}[${args.itemIndex}]`,
      });
      return detectLevelUps(ctx, caller, target, before);
    }

    return [];
  },
});

/**
 * Approve a pending specialtyItemCompletion.
 * Only an escotista who can act on the target escoteiro may call this.
 */
export const approveSpecialtyItem = mutation({
  args: { completionId: v.id("specialtyItemCompletions") },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);

    const before = await snapshotProgression(ctx, doc.userId);
    await ctx.db.patch(args.completionId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
    await logRamoEvent(ctx, {
      type: "approval",
      actor: user,
      subject: target,
      summary: `Aprovou item de especialidade: ${doc.specialtyId}[${doc.itemIndex}]`,
    });
    return detectLevelUps(ctx, user, target, before);
  },
});

/**
 * Reject (delete) a pending specialtyItemCompletion.
 * Only an escotista who can act on the target escoteiro may call this.
 */
export const rejectSpecialtyItem = mutation({
  args: { completionId: v.id("specialtyItemCompletions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.completionId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Item não está pendente");

    const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou item de especialidade: ${doc.specialtyId}[${doc.itemIndex}]`,
    });
    await ctx.db.delete(args.completionId);
  },
});

/**
 * Bulk approve all pending specialty items for a given (escoteiroId, specialtyId) group.
 * Escotistas use this to approve an entire specialty's pending items at once.
 */
export const approveSpecialtyItems = mutation({
  args: {
    escoteiroId: v.id("users"),
    specialtyId: v.string(),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    itemIds: v.array(v.id("specialtyItemCompletions")),
  },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const { target } = await assertCanActOnEscoteiro(ctx, args.escoteiroId);

    const now = Date.now();
    const before = await snapshotProgression(ctx, args.escoteiroId);

    for (const id of args.itemIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      if (
        doc.userId !== args.escoteiroId ||
        doc.specialtyId !== args.specialtyId ||
        doc.ramoGroup !== args.ramoGroup
      ) {
        continue; // safety: only act on the items explicitly passed
      }
      await ctx.db.patch(id, {
        status: "approved",
        approvedBy: user._id,
        approvedAt: now,
      });
    }

    await logRamoEvent(ctx, {
      type: "approval",
      actor: user,
      subject: target,
      summary: `Aprovou itens pendentes de especialidade: ${args.specialtyId}`,
    });

    return detectLevelUps(ctx, user, target, before);
  },
});

/**
 * Reject all pending specialty items for a given (escoteiroId, specialtyId) group.
 */
export const rejectSpecialtyItems = mutation({
  args: {
    escoteiroId: v.id("users"),
    specialtyId: v.string(),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    itemIds: v.array(v.id("specialtyItemCompletions")),
  },
  handler: async (ctx, args) => {
    const { caller, target } = await assertCanActOnEscoteiro(
      ctx,
      args.escoteiroId,
    );

    for (const id of args.itemIds) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.status !== "pending") continue;
      if (
        doc.userId !== args.escoteiroId ||
        doc.specialtyId !== args.specialtyId ||
        doc.ramoGroup !== args.ramoGroup
      ) {
        continue;
      }
      await ctx.db.delete(id);
    }

    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou itens pendentes de especialidade: ${args.specialtyId}`,
    });
  },
});

// ---------------------------------------------------------------------------
// Older ramoGroup (sênior + pioneiro) — project-report steps (#43)
//
// Each especialidade is a three-step project: conhecer → fazer → compartilhar.
// The steps are independent — an escoteiro may write and submit them in any
// order, and an escotista approves each on its own. The specialty is earned
// (binarily — no levels) once all three steps are approved (ADR 0002).
// ---------------------------------------------------------------------------

const STEP_ORDER = ["conhecer", "fazer", "compartilhar"] as const;
type ProjectStep = (typeof STEP_ORDER)[number];

const projectStep = v.union(
  v.literal("conhecer"),
  v.literal("fazer"),
  v.literal("compartilhar"),
);

/** Find a user's report row for a given (ramoGroup, specialtyId, step). */
async function findReport(
  ctx: QueryCtx,
  userId: Id<"users">,
  ramoGroup: "younger" | "older",
  specialtyId: string,
  step: ProjectStep,
): Promise<Doc<"specialtyProjectReports"> | null> {
  return ctx.db
    .query("specialtyProjectReports")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q
        .eq("userId", userId)
        .eq("ramoGroup", ramoGroup)
        .eq("specialtyId", specialtyId),
    )
    .filter((q) => q.eq(q.field("step"), step))
    .first();
}

/**
 * True when every step *other than* `doc.step` is already approved — i.e.
 * approving `doc` would leave all three steps approved and earn the specialty.
 */
async function otherStepsAllApproved(
  ctx: QueryCtx,
  doc: Doc<"specialtyProjectReports">,
): Promise<boolean> {
  const reports = await ctx.db
    .query("specialtyProjectReports")
    .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
      q
        .eq("userId", doc.userId)
        .eq("ramoGroup", doc.ramoGroup)
        .eq("specialtyId", doc.specialtyId),
    )
    .collect();
  const statusByStep = new Map(reports.map((r) => [r.step, r.status]));
  return STEP_ORDER.filter((s) => s !== doc.step).every(
    (s) => statusByStep.get(s) === "approved",
  );
}

/**
 * Submit (create or replace) a project-step report for the current user.
 *
 * - Steps are independent: any step may be submitted in any order (ADR 0002).
 * - If a pending row already exists for this step → its text is replaced and it
 *   stays pending (re-submit).
 * - If the row is already approved → throws (escoteiro cannot overwrite an
 *   approved step).
 * - An escotista submitting on behalf of a target (targetUserId) writes the row
 *   as approved (logged + level-up cascade), but never over the target's own
 *   pending relato — that throws; it is resolved with approve/reject.
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

    let effectiveUserId: Id<"users"> = caller._id;
    let status: "pending" | "approved" = "pending";
    let approvedBy: Id<"users"> | undefined = undefined;

    if (args.targetUserId) {
      await assertCanActOnEscoteiro(ctx, args.targetUserId);
      effectiveUserId = args.targetUserId;
      status = "approved";
      approvedBy = caller._id;
    }

    const effectiveUser = args.targetUserId
      ? await ctx.db.get(args.targetUserId)
      : caller;
    const ramoGroup = ramoGroupForRamo(effectiveUser?.ramo);

    const text = args.text.trim();
    if (!text) throw new Error("O relato não pode estar vazio.");

    const now = Date.now();
    const existing = await findReport(
      ctx,
      effectiveUserId,
      ramoGroup,
      args.specialtyId,
      args.step,
    );

    // An escotista registering on a scout's behalf never overwrites the
    // scout's own pending relato — that is resolved with approve/reject.
    if (args.targetUserId && existing && existing.status === "pending") {
      throw new Error("Etapa enviada pelo escoteiro — use Aprovar ou Rejeitar");
    }
    const before =
      args.targetUserId && effectiveUser
        ? await snapshotProgression(ctx, effectiveUserId)
        : null;

    if (existing) {
      // An approved step is locked to the escoteiro; only escotista-on-behalf overwrites.
      if (existing.status === "approved" && !args.targetUserId) {
        throw new Error("Esta etapa já foi aprovada e não pode ser reenviada.");
      }
      await ctx.db.patch(existing._id, {
        text,
        completedAt: now,
        status,
        ...(approvedBy
          ? { approvedBy, approvedAt: now }
          : { approvedBy: undefined, approvedAt: undefined }),
      });
    } else {
      await ctx.db.insert("specialtyProjectReports", {
        userId: effectiveUserId,
        ramoGroup,
        specialtyId: args.specialtyId,
        step: args.step,
        text,
        completedAt: now,
        status,
        ...(approvedBy ? { approvedBy, approvedAt: now } : {}),
      });
    }

    // An escotista-on-behalf write is an approval: audit it and run the earned
    // cascade (a third approved etapa earns the specialty → level-up toasts),
    // like approveSpecialtyStep. An escoteiro's own submission stays pending,
    // so it can never earn anything here.
    if (before && effectiveUser) {
      await logRamoEvent(ctx, {
        type: "approval",
        actor: caller,
        subject: effectiveUser,
        summary: `Registrou etapa "${args.step}" da especialidade: ${args.specialtyId}`,
      });
      return detectLevelUps(ctx, caller, effectiveUser, before);
    }
    return [];
  },
});

/**
 * Approve a pending project-step report.
 * When this approval makes all three steps approved, the specialty is earned and
 * the level-up cascade runs (same mechanism as bloco/action approvals). Which
 * step is approved last does not matter — steps are unordered (ADR 0002).
 */
export const approveSpecialtyStep = mutation({
  args: { reportId: v.id("specialtyProjectReports") },
  handler: async (ctx, args): Promise<LevelUpToast[]> => {
    const user = await getAuthenticatedUser(ctx);
    const doc = await ctx.db.get(args.reportId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Etapa não está pendente");

    const { target } = await assertCanActOnEscoteiro(ctx, doc.userId);

    // This approval earns the specialty iff the other two steps are already
    // approved. Snapshot before the write so the cascade can diff against it.
    const completesSpecialty = await otherStepsAllApproved(ctx, doc);
    const before = completesSpecialty
      ? await snapshotProgression(ctx, doc.userId)
      : null;

    await ctx.db.patch(args.reportId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });

    await logRamoEvent(ctx, {
      type: "approval",
      actor: user,
      subject: target,
      summary: `Aprovou etapa "${doc.step}" da especialidade: ${doc.specialtyId}`,
    });

    if (before) {
      return detectLevelUps(ctx, user, target, before);
    }
    return [];
  },
});

/**
 * Reject (delete) a pending project-step report.
 * The escoteiro's text is cleared; they rewrite and resubmit.
 */
export const rejectSpecialtyStep = mutation({
  args: { reportId: v.id("specialtyProjectReports") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.reportId);
    if (!doc) throw new Error("Não encontrado");
    if (doc.status !== "pending") throw new Error("Etapa não está pendente");

    const { caller, target } = await assertCanActOnEscoteiro(ctx, doc.userId);
    await logRamoEvent(ctx, {
      type: "rejection",
      actor: caller,
      subject: target,
      summary: `Rejeitou etapa "${doc.step}" da especialidade: ${doc.specialtyId}`,
    });
    await ctx.db.delete(args.reportId);
  },
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

/** Upper bound on escoteiros per grupo read at once (same as the pending list). */
const MAX_ESCOTEIROS = 500;

/**
 * The escoteiros an aggregate especialidade view may count: visible to the
 * viewer (visibilidade de ramo), narrowed to the observed seção, and currently
 * in `ramoGroup`.
 */
async function visibleEscoteirosInRamoGroup(
  ctx: QueryCtx,
  viewer: RamoViewer,
  ramoGroup: RamoGroup,
): Promise<{
  escoteiros: Doc<"users">[];
  observedSection: Doc<"sections"> | null;
}> {
  const all = await ctx.db
    .query("users")
    .withIndex("by_groupId_and_role", (q) =>
      q.eq("groupId", viewer.groupId).eq("role", "escoteiro"),
    )
    .take(MAX_ESCOTEIROS);
  const observedSection = await resolveObservedSection(
    ctx,
    viewer.user,
    viewer.groupId,
  );
  const escoteiros = filterToObservedSection(
    observedSection?._id ?? null,
    filterVisibleEscoteiros(viewer, all),
  ).filter((e) => ramoGroupForRamo(e.ramo) === ramoGroup);
  return { escoteiros, observedSection };
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

    const { escoteiros, observedSection } = await visibleEscoteirosInRamoGroup(
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

    const { escoteiros, observedSection } = await visibleEscoteirosInRamoGroup(
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
 * (the actionable ficha). Unlike toggleSpecialtyItem — which, called on a
 * PENDING row, deletes the escoteiro's submission — this states the outcome:
 *
 * - approved: true  → no row: insert approved; pending row: promote it to
 *   approved (keeps the escoteiro's completedAt); approved row: no-op.
 * - approved: false → approved row: delete it (unmark — may drop a level or
 *   un-complete a bloco, same as unmarking an ação); no row: no-op; pending
 *   row: throws — a submission is resolved with Aprovar / Rejeitar
 *   (rejectSpecialtyItem), never silently deleted by an unmark.
 *
 * Approver + time are recorded; approvals log a ramo event and run the
 * level-up cascade like approveSpecialtyItem. Access = assertCanActOnEscoteiro
 * (visibilidade de ramo) — the same guard every approval mutation uses.
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
    if (target.role !== "escoteiro") {
      throw new Error("Apenas escoteiros têm especialidades");
    }
    if (ramoGroupForRamo(target.ramo) !== "younger") {
      throw new Error(
        "Especialidades de sênior e pioneiro são registradas por etapas",
      );
    }
    const specialty = YOUNGER_SPECIALTY_BY_ID.get(args.specialtyId);
    if (!specialty) throw new Error("Especialidade não encontrada");
    if (
      !Number.isInteger(args.itemIndex) ||
      args.itemIndex < 0 ||
      args.itemIndex >= specialty.items.length
    ) {
      throw new Error("Item inválido");
    }

    const rows = await ctx.db
      .query("specialtyItemCompletions")
      .withIndex("by_userId_and_ramoGroup_and_specialtyId", (q) =>
        q
          .eq("userId", target._id)
          .eq("ramoGroup", "younger")
          .eq("specialtyId", args.specialtyId),
      )
      .take(200);
    const existing = rows.find((r) => r.itemIndex === args.itemIndex) ?? null;
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

    const now = Date.now();
    const before = await snapshotProgression(ctx, target._id);
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
    await logRamoEvent(ctx, {
      type: "approval",
      actor: caller,
      subject: target,
      summary: `Aprovou item de especialidade: ${args.specialtyId}[${args.itemIndex}]`,
    });
    return detectLevelUps(ctx, caller, target, before);
  },
});
