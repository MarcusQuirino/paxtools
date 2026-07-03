import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getAuthenticatedUser,
  assertAdmin,
  maybeBackfillUser,
} from "./lib/authHelpers";
import { logGroupEvent } from "./lib/events";
import {
  filterVisibleEscoteiros,
  tryResolveRamoViewer,
} from "./lib/ramoVisibility";
import { ramoValidator } from "./schema";

/**
 * Guard the last-admin invariant when a user is about to abandon their current
 * group (by leaving, joining another, or creating another). A sole admin must
 * promote another escotista first, otherwise the original group is orphaned
 * with no one able to approve members, manage roles, or delete it.
 */
async function assertNotSoleAdminOfCurrentGroup(
  ctx: MutationCtx,
  user: Doc<"users">,
) {
  if (!user.groupId || !user.isAdmin) return;
  const otherAdmin = await ctx.db
    .query("users")
    .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
    .filter((q) =>
      q.and(q.neq(q.field("_id"), user._id), q.eq(q.field("isAdmin"), true)),
    )
    .first();
  if (!otherAdmin) {
    throw new Error(
      "Você é o único administrador do seu grupo atual. Promova outro escotista antes de sair dele.",
    );
  }
}

/**
 * For an admin action targeting another member: assert the caller is an admin,
 * load the target user, and verify the target belongs to the caller's group.
 * Throws "Usuário não pertence ao seu grupo" if the target is missing or in a
 * different group. Returns both the admin (caller) and the loaded target.
 */
async function loadGroupMember(ctx: MutationCtx, targetUserId: Id<"users">) {
  const admin = await assertAdmin(ctx);
  const target = await ctx.db.get(targetUserId);
  if (!target || target.groupId !== admin.groupId) {
    throw new Error("Usuário não pertence ao seu grupo");
  }
  return { admin, target };
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function normalizeNumber(raw: string): string {
  return raw.trim().replace(/^0+(?=\d)/, "");
}

const ramoNamesValidator = v.object({
  lobinho: v.optional(v.string()),
  escoteiro: v.optional(v.string()),
  senior: v.optional(v.string()),
  pioneiro: v.optional(v.string()),
});

function sanitizeRamoNames(
  raw:
    | {
        lobinho?: string;
        escoteiro?: string;
        senior?: string;
        pioneiro?: string;
      }
    | undefined,
): {
  lobinho?: string;
  escoteiro?: string;
  senior?: string;
  pioneiro?: string;
} {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const key of ["lobinho", "escoteiro", "senior", "pioneiro"] as const) {
    const trimmed = raw[key]?.trim();
    if (!trimmed) continue;
    if (trimmed.length > 60) throw new Error("Nome do ramo muito longo");
    out[key] = trimmed;
  }
  return out;
}

export const createGroup = mutation({
  args: {
    name: v.string(),
    number: v.string(),
    ramoNames: v.optional(ramoNamesValidator),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas podem criar grupos");
    }
    if (!user.escotistaRamos || user.escotistaRamos.length === 0) {
      throw new Error("Escolha pelo menos um ramo antes de criar um grupo");
    }
    // Creating a new group reassigns groupId; don't strand the current one.
    await assertNotSoleAdminOfCurrentGroup(ctx, user);

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Nome do grupo inválido");
    }

    const number = normalizeNumber(args.number);
    if (!number || !/^\d{1,6}$/.test(number)) {
      throw new Error("Número do grupo inválido");
    }

    const ramoNames = sanitizeRamoNames(args.ramoNames);

    const existingByNumber = await ctx.db
      .query("groups")
      .withIndex("by_number", (q) => q.eq("number", number))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    if (existingByNumber) {
      throw new Error("Já existe um grupo com este número");
    }

    let password = generatePassword();
    let existing = await ctx.db
      .query("groups")
      .withIndex("by_password", (q) => q.eq("password", password))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    while (existing) {
      password = generatePassword();
      existing = await ctx.db
        .query("groups")
        .withIndex("by_password", (q) => q.eq("password", password))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .unique();
    }

    const groupId = await ctx.db.insert("groups", {
      name,
      number,
      password,
      createdBy: user._id,
      createdAt: Date.now(),
      ramoNames,
    });

    await ctx.db.patch(user._id, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
    });

    return { groupId, password };
  },
});

export const joinGroup = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const password = args.password.trim().toUpperCase();
    if (!password) throw new Error("Senha do grupo é obrigatória");

    const group = await ctx.db
      .query("groups")
      .withIndex("by_password", (q) => q.eq("password", password))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (!group) throw new Error("Grupo não encontrado");

    if (user.role === "escoteiro" && !user.ramo) {
      throw new Error("Escolha seu ramo antes de entrar em um grupo");
    }
    if (
      user.role === "escotista" &&
      (!user.escotistaRamos || user.escotistaRamos.length === 0)
    ) {
      throw new Error("Escolha pelo menos um ramo antes de entrar em um grupo");
    }
    // Joining another group reassigns groupId; don't strand the current one.
    await assertNotSoleAdminOfCurrentGroup(ctx, user);

    await ctx.db.patch(user._id, {
      groupId: group._id,
      membershipStatus: "pending",
      isAdmin: false,
    });
    return { groupId: group._id, groupName: group.name };
  },
});

export const leaveGroup = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.groupId) throw new Error("Você não está em nenhum grupo");

    if (user.isAdmin) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), user._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Você é o único administrador. Promova outro escotista antes de sair.",
        );
      }
    }

    await ctx.db.patch(user._id, {
      groupId: undefined,
      isAdmin: false,
      membershipStatus: undefined,
    });
  },
});

export const getMyGroup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || !user.groupId) return null;
    const group = await ctx.db.get(user.groupId);
    if (!group || group.deletedAt) return null;
    const isCreator = group.createdBy === user._id;
    // Fallback: a legacy group creator is admin even if the field
    // has not been backfilled yet.
    const computedAdmin = user.isAdmin === true || isCreator;
    return {
      _id: group._id,
      name: group.name,
      number: group.number ?? null,
      password:
        user.role === "escotista" && user.membershipStatus !== "pending"
          ? group.password
          : null,
      ramoNames: group.ramoNames ?? {},
      isCreator,
      isAdmin: computedAdmin,
      membershipStatus: user.membershipStatus ?? "approved",
    };
  },
});

export const getGroupMembers = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return [];

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", viewer.groupId))
      .take(500);

    return filterVisibleEscoteiros(viewer, members).map((m) => ({
      _id: m._id,
      name: m.name,
      image: m.image,
      email: m.email,
      role: m.role,
      ramo: m.ramo,
      escotistaRamos: m.escotistaRamos,
      isAdmin: m.isAdmin === true,
    }));
  },
});

export const getPendingMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || !user.groupId) return [];
    if (!user.isAdmin) {
      const group = await ctx.db.get(user.groupId);
      if (!group || group.createdBy !== user._id) return [];
    }

    const pending = await ctx.db
      .query("users")
      .withIndex("by_groupId_and_status", (q) =>
        q.eq("groupId", user.groupId).eq("membershipStatus", "pending"),
      )
      .take(200);

    return pending.map((m) => ({
      _id: m._id,
      name: m.name,
      image: m.image,
      email: m.email,
      role: m.role,
      ramo: m.ramo,
      escotistaRamos: m.escotistaRamos,
    }));
  },
});

export const approveMembership = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.membershipStatus !== "pending") {
      throw new Error("Usuário não está pendente");
    }
    await ctx.db.patch(target._id, { membershipStatus: "approved" });
    await logGroupEvent(ctx, {
      type: "memberJoin",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: "Entrou no grupo",
    });
  },
});

export const rejectMembership = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { target } = await loadGroupMember(ctx, args.userId);
    if (target.membershipStatus !== "pending") {
      throw new Error("Usuário não está pendente");
    }
    await ctx.db.patch(target._id, {
      groupId: undefined,
      membershipStatus: undefined,
      isAdmin: false,
    });
  },
});

export const banMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target._id === admin._id) {
      throw new Error("Você não pode banir a si mesmo");
    }
    if (target.isAdmin) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", admin.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), target._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Não é possível banir o único administrador. Promova outro antes.",
        );
      }
    }
    await ctx.db.patch(target._id, {
      groupId: undefined,
      isAdmin: false,
      membershipStatus: undefined,
      bannedAt: Date.now(),
      bannedBy: admin._id,
    });
    await logGroupEvent(ctx, {
      type: "memberBan",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: "Foi removido do grupo",
    });
  },
});

export const changeMemberRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("escoteiro"), v.literal("escotista")),
  },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target._id === admin._id) {
      throw new Error("Use a tela de configurações para mudar seu próprio papel");
    }
    if (target.role === args.role) return;

    const patch: Record<string, unknown> = { role: args.role };
    if (args.role === "escoteiro") {
      patch.isAdmin = false;
      patch.escotistaRamos = undefined;
    } else {
      patch.ramo = undefined;
    }
    await ctx.db.patch(target._id, patch);
    await logGroupEvent(ctx, {
      type: "accessChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary:
        args.role === "escotista" ? "Tornou-se escotista" : "Tornou-se escoteiro",
    });
  },
});

export const setMemberAdmin = mutation({
  args: { userId: v.id("users"), isAdmin: v.boolean() },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escotista") {
      throw new Error("Apenas escotistas podem ser administradores");
    }
    if (!args.isAdmin && target._id === admin._id) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", admin.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), admin._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Você é o único administrador. Promova outro antes de se remover.",
        );
      }
    }
    await ctx.db.patch(target._id, { isAdmin: args.isAdmin });
    await logGroupEvent(ctx, {
      type: "accessChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: args.isAdmin
        ? "Promovido a administrador"
        : "Removido de administrador",
    });
  },
});

export const setMemberRamos = mutation({
  args: { userId: v.id("users"), ramos: v.array(ramoValidator) },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escotista") {
      throw new Error("Apenas escotistas têm múltiplos ramos");
    }
    const dedup = Array.from(new Set(args.ramos));
    if (dedup.length === 0) throw new Error("Selecione pelo menos um ramo");
    // Skip no-op saves so the audit timeline isn't littered with phantom changes.
    const sortedNew = [...dedup].sort();
    const sortedCur = [...(target.escotistaRamos ?? [])].sort();
    if (
      sortedCur.length === sortedNew.length &&
      sortedCur.every((r, i) => r === sortedNew[i])
    ) {
      return;
    }
    await ctx.db.patch(target._id, { escotistaRamos: dedup });
    await logGroupEvent(ctx, {
      type: "ramoChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: `Ramos atualizados: ${dedup.join(", ")}`,
    });
  },
});

export const setMemberRamo = mutation({
  args: { userId: v.id("users"), ramo: ramoValidator },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escoteiro") {
      throw new Error("Apenas escoteiros têm um ramo único");
    }
    if (target.ramo === args.ramo) return; // no-op: don't log a phantom change
    await ctx.db.patch(target._id, { ramo: args.ramo });
    await logGroupEvent(ctx, {
      type: "ramoChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: `Ramo alterado para ${args.ramo}`,
    });
  },
});

export const updateGroup = mutation({
  args: {
    name: v.optional(v.string()),
    ramoNames: v.optional(ramoNamesValidator),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    if (!admin.groupId) throw new Error("Você não está em nenhum grupo");
    const group = await ctx.db.get(admin.groupId);
    if (!group || group.deletedAt) throw new Error("Grupo não encontrado");

    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name || name.length > 100) {
        throw new Error("Nome do grupo inválido");
      }
      patch.name = name;
    }

    if (args.ramoNames !== undefined) {
      patch.ramoNames = sanitizeRamoNames(args.ramoNames);
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(group._id, patch);
  },
});

export const deleteGroup = mutation({
  args: { confirmName: v.string() },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    if (!admin.groupId) throw new Error("Você não está em nenhum grupo");
    const group = await ctx.db.get(admin.groupId);
    if (!group || group.deletedAt) throw new Error("Grupo não encontrado");
    if (args.confirmName.trim() !== group.name) {
      throw new Error("Confirmação inválida");
    }
    await ctx.db.patch(group._id, { deletedAt: Date.now() });
  },
});

// Make sure backfill runs whenever the viewer is touched via this module
export const ensureBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    await maybeBackfillUser(ctx, user);
    return null;
  },
});
