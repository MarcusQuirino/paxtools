import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  createAccount,
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { ramoValidator } from "./schema";
import { assertCanActOnEscoteiro, resolveRamoViewer } from "./lib/ramoVisibility";
import { logGroupEvent } from "./lib/events";
import {
  MANAGED_PROVIDER,
  explainWeakPassword,
  generateTemporaryPassword,
  normalizeScoutId,
} from "./lib/managedAccounts";

/**
 * Conta gerenciada (see CONTEXT.md): members without Google who sign in with
 * their registro escoteiro + a password. An escotista creates the account and
 * hands over a temporary password; the member must replace it on first
 * sign-in. Any escotista may create escoteiros of a ramo they accompany; only
 * an admin may create escotistas. Whoever can act on the member may issue a
 * new temporary password when it is forgotten.
 *
 * The auth helpers (createAccount, …) need an action context, so the public
 * entry points are actions; every permission check runs in an internal query
 * first, with the caller's identity forwarded by ctx.runQuery.
 */

const memberRoleValidator = v.union(
  v.literal("escoteiro"),
  v.literal("escotista"),
);

/**
 * Surface a permission failure from a nested query as a ConvexError, so its
 * Portuguese message reaches the client instead of a redacted "Server Error".
 */
function rethrowAsUserError(err: unknown): never {
  if (err instanceof ConvexError) throw err;
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.match(/Uncaught Error:\s*([^\n]+)/);
  throw new ConvexError((m?.[1] ?? raw).replace(/\s+at .*$/, "").trim());
}

async function scoutIdTaken(ctx: QueryCtx, scoutId: string): Promise<boolean> {
  const account = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", MANAGED_PROVIDER).eq("providerAccountId", scoutId),
    )
    .unique();
  if (account) return true;
  const user = await ctx.db
    .query("users")
    .withIndex("by_scoutId", (q) => q.eq("scoutId", scoutId))
    .first();
  return user !== null;
}

export const authorizeCreate = internalQuery({
  args: {
    scoutId: v.string(),
    role: memberRoleValidator,
    ramo: v.optional(ramoValidator),
    escotistaRamos: v.optional(v.array(ramoValidator)),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveRamoViewer(ctx);
    if (args.role === "escotista") {
      if (!viewer.isAdmin) {
        throw new ConvexError("Apenas administradores podem criar acesso de escotista");
      }
      if (!args.escotistaRamos || args.escotistaRamos.length === 0) {
        throw new ConvexError("Selecione pelo menos um ramo");
      }
    } else {
      if (!args.ramo) throw new ConvexError("Selecione o ramo do escoteiro");
      if (!viewer.isAdmin && !viewer.ramos.includes(args.ramo)) {
        throw new ConvexError("Você não acompanha esse ramo");
      }
    }
    if (await scoutIdTaken(ctx, args.scoutId)) {
      throw new ConvexError("Este registro já tem acesso");
    }
    return { callerId: viewer.user._id, groupId: viewer.groupId };
  },
});

export const logCreated = internalMutation({
  args: { userId: v.id("users"), callerId: v.id("users") },
  handler: async (ctx, args) => {
    const [subject, actor] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.callerId),
    ]);
    if (!subject?.groupId || !actor) return null;
    await logGroupEvent(ctx, {
      type: "memberJoin",
      actor,
      subject,
      groupId: subject.groupId,
      summary: "Entrou no grupo (acesso com registro)",
    });
    return null;
  },
});

/**
 * Create a conta gerenciada in the caller's grupo — already approved and
 * onboarded — and return its temporary password. The password is only ever
 * returned here; it is stored hashed and cannot be read back.
 */
export const createManagedMember = action({
  args: {
    name: v.string(),
    scoutId: v.string(),
    role: memberRoleValidator,
    ramo: v.optional(ramoValidator),
    escotistaRamos: v.optional(v.array(ramoValidator)),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: Id<"users">; scoutId: string; password: string }> => {
    const name = args.name.trim();
    if (!name) throw new ConvexError("Informe o nome");
    if (name.length > 100) throw new ConvexError("Nome muito longo");
    const scoutId = normalizeScoutId(args.scoutId);
    if (!scoutId) throw new ConvexError("O registro deve ter 7 dígitos");
    const escotistaRamos =
      args.role === "escotista"
        ? Array.from(new Set(args.escotistaRamos ?? []))
        : undefined;

    const { callerId, groupId } = await ctx
      .runQuery(internal.managedAccounts.authorizeCreate, {
        scoutId,
        role: args.role,
        ramo: args.ramo,
        escotistaRamos,
      })
      .catch(rethrowAsUserError);

    const password = generateTemporaryPassword();
    let userId: Id<"users">;
    try {
      const { user } = await createAccount(ctx, {
        provider: MANAGED_PROVIDER,
        account: { id: scoutId, secret: password },
        profile: {
          name,
          scoutId,
          role: args.role,
          groupId,
          membershipStatus: "approved",
          onboardingComplete: true,
          managedBy: callerId,
          mustChangePassword: true,
          ...(args.role === "escotista"
            ? { escotistaRamos }
            : { ramo: args.ramo }),
        },
      });
      userId = user._id;
    } catch (err) {
      // Lost a race with a concurrent create of the same registro.
      if (err instanceof Error && err.message.includes("already exists")) {
        throw new ConvexError("Este registro já tem acesso");
      }
      throw err;
    }
    await ctx.runMutation(internal.managedAccounts.logCreated, {
      userId,
      callerId,
    });
    return { userId, scoutId, password };
  },
});

export const authorizeReset = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewer = await resolveRamoViewer(ctx);
    if (args.userId === viewer.user._id) {
      throw new ConvexError("Use a tela de perfil para trocar sua própria senha");
    }
    let target: Doc<"users">;
    const loaded = await ctx.db.get(args.userId);
    if (loaded?.role === "escoteiro") {
      // Same rule as every other action on an escoteiro: visibilidade de ramo.
      ({ target } = await assertCanActOnEscoteiro(ctx, args.userId));
    } else {
      if (!loaded || loaded.groupId !== viewer.groupId || loaded.bannedAt) {
        throw new ConvexError("Usuário não pertence ao seu grupo");
      }
      if (!viewer.isAdmin) {
        throw new ConvexError("Apenas administradores podem redefinir a senha de escotistas");
      }
      target = loaded;
    }
    if (!target.scoutId) {
      throw new ConvexError("Este membro entra com Google; não há senha para redefinir");
    }
    return { scoutId: target.scoutId, callerId: viewer.user._id };
  },
});

export const markReset = internalMutation({
  args: { userId: v.id("users"), callerId: v.id("users"), scoutId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { mustChangePassword: true });
    // Forgetting the password usually means failed attempts piled up; the
    // fresh temporary password must work right away, not in an hour.
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", MANAGED_PROVIDER).eq("providerAccountId", args.scoutId),
      )
      .unique();
    if (account) {
      const limit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", account._id))
        .unique();
      if (limit) await ctx.db.delete(limit._id);
    }
    const [subject, actor] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.callerId),
    ]);
    if (subject?.groupId && actor) {
      await logGroupEvent(ctx, {
        type: "accessChange",
        actor,
        subject,
        groupId: subject.groupId,
        summary: "Senha redefinida",
      });
    }
    return null;
  },
});

/**
 * Issue a new temporary password for a conta gerenciada (the member forgot
 * theirs). Signs the member out everywhere and forces a change on next
 * sign-in. Returns the temporary password — the only time it is visible.
 */
export const resetManagedPassword = action({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    args,
  ): Promise<{ scoutId: string; password: string }> => {
    const { scoutId, callerId } = await ctx
      .runQuery(internal.managedAccounts.authorizeReset, { userId: args.userId })
      .catch(rethrowAsUserError);
    const password = generateTemporaryPassword();
    await modifyAccountCredentials(ctx, {
      provider: MANAGED_PROVIDER,
      account: { id: scoutId, secret: password },
    });
    await invalidateSessions(ctx, { userId: args.userId });
    await ctx.runMutation(internal.managedAccounts.markReset, {
      userId: args.userId,
      callerId,
      scoutId,
    });
    return { scoutId, password };
  },
});

export const getManagedSelf = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Não autenticado");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Usuário não encontrado");
    if (user.bannedAt) throw new ConvexError("Você foi banido do grupo");
    if (!user.scoutId) throw new ConvexError("Sua conta entra com Google");
    return {
      userId: user._id,
      scoutId: user.scoutId,
      mustChangePassword: user.mustChangePassword === true,
    };
  },
});

export const clearMustChange = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { mustChangePassword: undefined });
    return null;
  },
});

/**
 * The signed-in conta gerenciada chooses a new password. The current one is
 * required, except right after a temporary password was issued (the member
 * just signed in with it). Other sessions are signed out.
 */
export const changeOwnPassword = action({
  args: {
    currentPassword: v.optional(v.string()),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const self = await ctx
      .runQuery(internal.managedAccounts.getManagedSelf, {})
      .catch(rethrowAsUserError);
    const weak = explainWeakPassword(args.newPassword, self.scoutId);
    if (weak) throw new ConvexError(weak);

    if (!self.mustChangePassword) {
      if (!args.currentPassword) throw new ConvexError("Informe a senha atual");
      try {
        await retrieveAccount(ctx, {
          provider: MANAGED_PROVIDER,
          account: { id: self.scoutId, secret: args.currentPassword },
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code === "TooManyFailedAttempts") {
          throw new ConvexError("Muitas tentativas. Tente de novo mais tarde.");
        }
        throw new ConvexError("Senha atual incorreta");
      }
    }

    await modifyAccountCredentials(ctx, {
      provider: MANAGED_PROVIDER,
      account: { id: self.scoutId, secret: args.newPassword },
    });
    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, {
      userId: self.userId,
      except: sessionId ? [sessionId] : [],
    });
    await ctx.runMutation(internal.managedAccounts.clearMustChange, {
      userId: self.userId,
    });
    return null;
  },
});
