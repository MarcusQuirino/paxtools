import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Não autenticado");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Usuário não encontrado");
  if (user.bannedAt) throw new Error("Você foi banido do grupo");
  if ("patch" in ctx.db) {
    return await maybeBackfillUser(ctx as MutationCtx, user);
  }
  return user;
}

export async function maybeBackfillUser(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<Doc<"users">> {
  const patch: Partial<Doc<"users">> = {};

  if (user.groupId && user.membershipStatus === undefined) {
    patch.membershipStatus = "approved";
  }

  if (user.groupId && user.isAdmin === undefined) {
    const group = await ctx.db.get(user.groupId);
    if (group && group.createdBy === user._id) {
      patch.isAdmin = true;
    }
  }

  if (Object.keys(patch).length === 0) return user;
  await ctx.db.patch(user._id, patch);
  return { ...user, ...patch };
}

export async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const caller = await getAuthenticatedUser(ctx);
  if (caller.role !== "escotista") {
    throw new Error("Apenas administradores podem realizar esta ação");
  }
  if (!caller.groupId) throw new Error("Você não está em nenhum grupo");
  if (!caller.isAdmin) {
    // Legacy creators may not have the flag set yet.
    const group = await ctx.db.get(caller.groupId);
    if (!group || group.createdBy !== caller._id) {
      throw new Error("Apenas administradores podem realizar esta ação");
    }
  }
  return caller;
}
