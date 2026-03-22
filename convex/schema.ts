import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  actionCompletions: defineTable({
    userId: v.id("users"),
    actionId: v.string(),
    completedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_actionId", ["userId", "actionId"]),

  specialtyCompletions: defineTable({
    userId: v.id("users"),
    blocoId: v.string(),
    specialtyName: v.string(),
    completedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_blocoId", ["userId", "blocoId"])
    .index("by_userId_and_blocoId_and_specialtyName", ["userId", "blocoId", "specialtyName"]),

  customActions: defineTable({
    userId: v.id("users"),
    blocoId: v.string(),
    text: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_blocoId", ["userId", "blocoId"]),
});
