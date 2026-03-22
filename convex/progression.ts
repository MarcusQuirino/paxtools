import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMyCompletions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { actions: [], specialties: [], customActions: [] };

    const actions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);

    const specialties = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const customActions = await ctx.db
      .query("customActions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);

    return { actions, specialties, customActions };
  },
});

export const toggleAction = mutation({
  args: { actionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");

    const existing = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId_and_actionId", (q) =>
        q.eq("userId", userId).eq("actionId", args.actionId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("actionCompletions", {
        userId,
        actionId: args.actionId,
        completedAt: Date.now(),
      });
    }
  },
});

export const toggleSpecialty = mutation({
  args: { blocoId: v.string(), specialtyName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");

    const existing = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_blocoId", (q) =>
        q.eq("userId", userId).eq("blocoId", args.blocoId),
      )
      .take(20);

    const match = existing.find(
      (s) => s.specialtyName === args.specialtyName,
    );
    if (match) {
      await ctx.db.delete(match._id);
    } else {
      await ctx.db.insert("specialtyCompletions", {
        userId,
        blocoId: args.blocoId,
        specialtyName: args.specialtyName,
        completedAt: Date.now(),
      });
    }
  },
});

export const addCustomAction = mutation({
  args: { blocoId: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");

    return await ctx.db.insert("customActions", {
      userId,
      blocoId: args.blocoId,
      text: args.text,
      completed: false,
      createdAt: Date.now(),
    });
  },
});

export const toggleCustomAction = mutation({
  args: { customActionId: v.id("customActions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");

    const doc = await ctx.db.get(args.customActionId);
    if (!doc || doc.userId !== userId) throw new Error("Não encontrado");

    await ctx.db.patch(args.customActionId, { completed: !doc.completed });
  },
});

export const deleteCustomAction = mutation({
  args: { customActionId: v.id("customActions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");

    const doc = await ctx.db.get(args.customActionId);
    if (!doc || doc.userId !== userId) throw new Error("Não encontrado");

    await ctx.db.delete(args.customActionId);
  },
});
