import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Não autenticado");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export async function assertEscotistaInSameGroup(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">,
) {
  const caller = await getAuthenticatedUser(ctx);
  if (caller.role !== "escotista") {
    throw new Error("Apenas escotistas podem realizar esta ação");
  }
  if (!caller.groupId) {
    throw new Error("Você não está em nenhum grupo");
  }
  const target = await ctx.db.get(targetUserId);
  if (!target) throw new Error("Escoteiro não encontrado");
  if (target.groupId !== caller.groupId) {
    throw new Error("Este escoteiro não pertence ao seu grupo");
  }
  return { caller, target };
}
