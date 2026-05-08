import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const completionStatus = v.optional(
  v.union(v.literal("pending"), v.literal("approved")),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("escoteiro"), v.literal("escotista"))),
    groupId: v.optional(v.id("groups")),
    onboardingComplete: v.optional(v.boolean()),
    favoriteEscoteiroIds: v.optional(v.array(v.id("users"))),
  })
    .index("email", ["email"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_and_role", ["groupId", "role"]),

  groups: defineTable({
    name: v.string(),
    password: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_password", ["password"]),

  actionCompletions: defineTable({
    userId: v.id("users"),
    actionId: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_actionId", ["userId", "actionId"])
    .index("by_userId_and_status", ["userId", "status"]),

  specialtyCompletions: defineTable({
    userId: v.id("users"),
    blocoId: v.string(),
    specialtyName: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_blocoId", ["userId", "blocoId"])
    .index("by_userId_and_blocoId_and_specialtyName", [
      "userId",
      "blocoId",
      "specialtyName",
    ])
    .index("by_userId_and_status", ["userId", "status"]),

  customActions: defineTable({
    userId: v.id("users"),
    blocoId: v.string(),
    text: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_blocoId", ["userId", "blocoId"])
    .index("by_userId_and_status", ["userId", "status"]),

  lisDeOuroCompletions: defineTable({
    userId: v.id("users"),
    itemId: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_itemId", ["userId", "itemId"])
    .index("by_userId_and_status", ["userId", "status"]),
});
