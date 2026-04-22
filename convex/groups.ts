import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAuthenticatedUser } from "./lib/authHelpers";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const createGroup = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas podem criar grupos");
    }

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Nome do grupo inválido");
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
      password,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.patch(user._id, { groupId });

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

    await ctx.db.patch(user._id, { groupId: group._id });
    return { groupId: group._id, groupName: group.name };
  },
});

export const leaveGroup = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.groupId) throw new Error("Você não está em nenhum grupo");
    await ctx.db.patch(user._id, { groupId: undefined });
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
    return {
      _id: group._id,
      name: group.name,
      password: group.password,
      isCreator: group.createdBy === user._id,
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

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
      .take(200);

    return members.map((m) => ({
      _id: m._id,
      name: m.name,
      image: m.image,
      email: m.email,
      role: m.role,
    }));
  },
});
