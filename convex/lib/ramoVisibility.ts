import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { maybeBackfillUser } from "./authHelpers";
import type { Ramo } from "./coverage";

/**
 * Visibilidade de ramo (see CONTEXT.md): the single rule deciding which
 * escoteiros an escotista can see and act on. Both must be approved,
 * non-banned members of the same grupo, and the escoteiro's ramo must be one
 * the escotista accompanies — unless the escotista is an admin, who sees all
 * ramos. A ramo-less escoteiro is visible to admins only. The ramo boundary
 * applies only to escoteiro targets; fellow escotistas are reachable
 * grupo-wide.
 *
 * Every surface that answers "which escoteiros can this escotista see or act
 * on?" must go through this module — never restate any part of the predicate
 * inline.
 */

/** A validated escotista viewer: approved, non-banned, in a grupo. */
export type RamoViewer = {
  user: Doc<"users">;
  groupId: Id<"groups">;
  /** Includes the legacy grupo-creator fallback (creators predate the flag). */
  isAdmin: boolean;
  /** Ramos the escotista accompanies; irrelevant when isAdmin. */
  ramos: Ramo[];
};

/** The viewer fields the pure predicate needs — plain-object testable. */
export type ViewerAccess = Pick<RamoViewer, "groupId" | "isAdmin" | "ramos">;

/** The target fields the pure predicate needs — plain-object testable. */
export type VisibilityTarget = Pick<
  Doc<"users">,
  "role" | "groupId" | "membershipStatus" | "bannedAt" | "ramo"
>;

type ViewerDenial =
  | "unauthenticated"
  | "user-not-found"
  | "banned"
  | "not-escotista"
  | "no-group"
  | "membership-pending";

const VIEWER_DENIAL_MESSAGES: Record<ViewerDenial, string> = {
  unauthenticated: "Não autenticado",
  "user-not-found": "Usuário não encontrado",
  banned: "Você foi banido do grupo",
  "not-escotista": "Apenas escotistas podem realizar esta ação",
  "no-group": "Você não está em nenhum grupo",
  "membership-pending": "Sua entrada no grupo ainda não foi aprovada",
};

async function resolveViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<{ viewer: RamoViewer } | { denial: ViewerDenial }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return { denial: "unauthenticated" };
  let user = await ctx.db.get(userId);
  if (!user) return { denial: "user-not-found" };
  if (user.bannedAt) return { denial: "banned" };
  if ("patch" in ctx.db) {
    user = await maybeBackfillUser(ctx as MutationCtx, user);
  }
  if (user.role !== "escotista") return { denial: "not-escotista" };
  if (!user.groupId) return { denial: "no-group" };
  // An unstamped (undefined) membershipStatus counts as approved: mutations
  // backfill it to "approved", and queries (which cannot write) must agree.
  if ((user.membershipStatus ?? "approved") !== "approved") {
    return { denial: "membership-pending" };
  }
  let isAdmin = user.isAdmin === true;
  if (!isAdmin) {
    // Legacy grupo creators may predate the isAdmin flag; query paths cannot
    // backfill, so the fallback is resolved here on every surface.
    const group = await ctx.db.get(user.groupId);
    if (group && group.createdBy === user._id) isAdmin = true;
  }
  return {
    viewer: {
      user,
      groupId: user.groupId,
      isAdmin,
      ramos: (user.escotistaRamos ?? []) as Ramo[],
    },
  };
}

/** Resolve the calling escotista or throw (write paths and throwing reads). */
export async function resolveRamoViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<RamoViewer> {
  const res = await resolveViewer(ctx);
  if ("denial" in res) throw new Error(VIEWER_DENIAL_MESSAGES[res.denial]);
  return res.viewer;
}

/** Resolve the calling escotista or return null (silent-empty read paths). */
export async function tryResolveRamoViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<RamoViewer | null> {
  const res = await resolveViewer(ctx);
  return "denial" in res ? null : res.viewer;
}

type TargetDenial = "not-in-group" | "banned" | "membership-pending" | "outside-ramo";

const TARGET_DENIAL_MESSAGES: Record<TargetDenial, string> = {
  "not-in-group": "Este escoteiro não pertence ao seu grupo",
  banned: "Este membro foi banido do grupo",
  "membership-pending": "Este membro ainda não foi aprovado no grupo",
  "outside-ramo": "Este escoteiro não pertence ao seu ramo",
};

function explainTargetDenial(
  viewer: ViewerAccess,
  target: VisibilityTarget,
): TargetDenial | null {
  if (!target.groupId || target.groupId !== viewer.groupId) return "not-in-group";
  if (target.bannedAt) return "banned";
  if ((target.membershipStatus ?? "approved") !== "approved") {
    return "membership-pending";
  }
  if (target.role !== "escoteiro") return null;
  if (viewer.isAdmin) return null;
  if (!target.ramo || !viewer.ramos.includes(target.ramo)) return "outside-ramo";
  return null;
}

/** The pure visibilidade de ramo predicate — no database access. */
export function isEscoteiroVisible(
  viewer: ViewerAccess,
  target: VisibilityTarget,
): boolean {
  return explainTargetDenial(viewer, target) === null;
}

/** Keep only the targets the viewer may see — no database access. */
export function filterVisibleEscoteiros<T extends VisibilityTarget>(
  viewer: ViewerAccess,
  targets: T[],
): T[] {
  return targets.filter((t) => isEscoteiroVisible(viewer, t));
}

/**
 * Throwing write-path guard: the caller must be a valid viewer and the target
 * must be visible to them. Returns both docs for logging/snapshotting.
 */
export async function assertCanActOnEscoteiro(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">,
): Promise<{ caller: Doc<"users">; target: Doc<"users"> }> {
  const viewer = await resolveRamoViewer(ctx);
  const target = await ctx.db.get(targetUserId);
  if (!target) throw new Error("Escoteiro não encontrado");
  const denial = explainTargetDenial(viewer, target);
  if (denial) throw new Error(TARGET_DENIAL_MESSAGES[denial]);
  return { caller: viewer.user, target };
}

/**
 * Resolve which single ramo an aggregate view (stats, AI) may show. Non-admins
 * are scoped to their accompanied ramos; an admin may request any ramo. An
 * omitted ramo defaults to the viewer's first accompanied ramo.
 */
export async function resolveRamoAccess(
  ctx: QueryCtx | MutationCtx,
  requested: Ramo | undefined,
): Promise<{ viewer: RamoViewer; groupId: Id<"groups">; ramo: Ramo }> {
  const viewer = await resolveRamoViewer(ctx);
  const ramo = requested ?? viewer.ramos[0];
  if (!ramo) throw new Error("Selecione um ramo");
  if (!viewer.isAdmin && !viewer.ramos.includes(ramo)) {
    throw new Error("Você não acompanha esse ramo");
  }
  return { viewer, groupId: viewer.groupId, ramo };
}
