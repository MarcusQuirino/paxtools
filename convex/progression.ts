import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ACTION_ID_PATTERN = /^[a-z0-9-]+:(fixed|variable):\d+$/;
const BLOCO_ID_PATTERN = /^[a-z0-9-]+$/;
const VALID_LIS_ITEM_IDS = new Set([
  "lis_promessa",
  "lis_blocos",
  "lis_jornada",
  "lis_autoavaliacao",
  "lis_corte_honra",
]);
const MAX_CUSTOM_ACTIONS_PER_BLOCO = 20;

export const getMyCompletions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        actions: [],
        specialties: [],
        customActions: [],
        lisDeOuroItems: [],
      };

    const actions = await ctx.db
      .query("actionCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);

    const specialties = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);

    const customActions = await ctx.db
      .query("customActions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(1000);

    const lisDeOuroItems = await ctx.db
      .query("lisDeOuroCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(10);

    return { actions, specialties, customActions, lisDeOuroItems };
  },
});

export const toggleAction = mutation({
  args: { actionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");
    if (!ACTION_ID_PATTERN.test(args.actionId))
      throw new Error("ID de ação inválido");

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
    if (!BLOCO_ID_PATTERN.test(args.blocoId))
      throw new Error("ID de bloco inválido");
    if (!args.specialtyName.trim() || args.specialtyName.length > 200)
      throw new Error("Nome de especialidade inválido");

    const existing = await ctx.db
      .query("specialtyCompletions")
      .withIndex("by_userId_and_blocoId_and_specialtyName", (q) =>
        q
          .eq("userId", userId)
          .eq("blocoId", args.blocoId)
          .eq("specialtyName", args.specialtyName),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
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
    if (!BLOCO_ID_PATTERN.test(args.blocoId))
      throw new Error("ID de bloco inválido");

    const text = args.text.trim();
    if (!text) throw new Error("Texto vazio");
    if (text.length > 500) throw new Error("Texto muito longo");

    const existingCount = await ctx.db
      .query("customActions")
      .withIndex("by_userId_and_blocoId", (q) =>
        q.eq("userId", userId).eq("blocoId", args.blocoId),
      )
      .take(MAX_CUSTOM_ACTIONS_PER_BLOCO + 1);
    if (existingCount.length >= MAX_CUSTOM_ACTIONS_PER_BLOCO)
      throw new Error("Limite de ações personalizadas atingido");

    return await ctx.db.insert("customActions", {
      userId,
      blocoId: args.blocoId,
      text,
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

export const toggleLisDeOuroItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado");
    if (!VALID_LIS_ITEM_IDS.has(args.itemId))
      throw new Error("ID de item inválido");

    const existing = await ctx.db
      .query("lisDeOuroCompletions")
      .withIndex("by_userId_and_itemId", (q) =>
        q.eq("userId", userId).eq("itemId", args.itemId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("lisDeOuroCompletions", {
        userId,
        itemId: args.itemId,
        completedAt: Date.now(),
      });
    }
  },
});
