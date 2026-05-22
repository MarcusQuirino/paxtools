import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getAuthenticatedUser,
  assertAdmin,
  maybeBackfillUser,
} from "./lib/authHelpers";
import { ramoValidator } from "./schema";

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

export const createGroup = mutation({
  args: { name: v.string(), number: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas podem criar grupos");
    }
    if (!user.escotistaRamos || user.escotistaRamos.length === 0) {
      throw new Error("Escolha pelo menos um ramo antes de criar um grupo");
    }

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Nome do grupo inválido");
    }

    const number = normalizeNumber(args.number);
    if (!number || !/^\d{1,6}$/.test(number)) {
      throw new Error("Número do grupo inválido");
    }

    const existingByNumber = await ctx.db
      .query("groups")
      .withIndex("by_number", (q) => q.eq("number", number))
      .unique();
    if (existingByNumber) {
      throw new Error("Já existe um grupo com este número");
    }

    let password = generatePassword();
    let existing = await ctx.db
      .query("groups")
      .withIndex("by_password", (q) => q.eq("password", password))
      .unique();
    while (existing) {
      password = generatePassword();
      existing = await ctx.db
        .query("groups")
        .withIndex("by_password", (q) => q.eq("password", password))
        .unique();
    }

    const groupId = await ctx.db.insert("groups", {
      name,
      number,
      password,
      createdBy: user._id,
      createdAt: Date.now(),
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
    if (!group) return null;
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
      isCreator,
      isAdmin: computedAdmin,
      membershipStatus: user.membershipStatus ?? "approved",
    };
  },
});

export const getGroupMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "escotista") return [];
    if (!user.groupId) return [];
    if (user.membershipStatus !== "approved") return [];

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
      .take(500);

    const approved = members.filter(
      (m) => (m.membershipStatus ?? "approved") === "approved" && !m.bannedAt,
    );

    const visible = user.isAdmin
      ? approved
      : approved.filter((m) => {
          if (m.role !== "escoteiro") return true;
          if (!m.ramo) return false;
          return (user.escotistaRamos ?? []).includes(m.ramo);
        });

    return visible.map((m) => ({
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
    const admin = await assertAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
    }
    if (target.membershipStatus !== "pending") {
      throw new Error("Usuário não está pendente");
    }
    await ctx.db.patch(target._id, { membershipStatus: "approved" });
  },
});

export const rejectMembership = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
    }
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
    const admin = await assertAdmin(ctx);
    if (args.userId === admin._id) {
      throw new Error("Você não pode banir a si mesmo");
    }
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
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
  },
});

export const changeMemberRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("escoteiro"), v.literal("escotista")),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    if (args.userId === admin._id) {
      throw new Error("Use a tela de configurações para mudar seu próprio papel");
    }
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
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
  },
});

export const setMemberAdmin = mutation({
  args: { userId: v.id("users"), isAdmin: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
    }
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
  },
});

export const setMemberRamos = mutation({
  args: { userId: v.id("users"), ramos: v.array(ramoValidator) },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
    }
    if (target.role !== "escotista") {
      throw new Error("Apenas escotistas têm múltiplos ramos");
    }
    const dedup = Array.from(new Set(args.ramos));
    if (dedup.length === 0) throw new Error("Selecione pelo menos um ramo");
    await ctx.db.patch(target._id, { escotistaRamos: dedup });
  },
});

export const setMemberRamo = mutation({
  args: { userId: v.id("users"), ramo: ramoValidator },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.groupId !== admin.groupId) {
      throw new Error("Usuário não pertence ao seu grupo");
    }
    if (target.role !== "escoteiro") {
      throw new Error("Apenas escoteiros têm um ramo único");
    }
    await ctx.db.patch(target._id, { ramo: args.ramo });
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
