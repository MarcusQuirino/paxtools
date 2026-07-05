import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const completionStatus = v.optional(
  v.union(v.literal("pending"), v.literal("approved")),
);

export const ramoValidator = v.union(
  v.literal("lobinho"),
  v.literal("escoteiro"),
  v.literal("senior"),
  v.literal("pioneiro"),
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
    ramo: v.optional(ramoValidator),
    escotistaRamos: v.optional(v.array(ramoValidator)),
    isAdmin: v.optional(v.boolean()),
    membershipStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved")),
    ),
    bannedAt: v.optional(v.number()),
    bannedBy: v.optional(v.id("users")),
  })
    .index("email", ["email"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_and_role", ["groupId", "role"])
    .index("by_groupId_and_status", ["groupId", "membershipStatus"]),

  groups: defineTable({
    name: v.string(),
    number: v.optional(v.string()),
    password: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    ramoNames: v.optional(
      v.object({
        lobinho: v.optional(v.string()),
        escoteiro: v.optional(v.string()),
        senior: v.optional(v.string()),
        pioneiro: v.optional(v.string()),
      }),
    ),
    deletedAt: v.optional(v.number()),
  })
    .index("by_password", ["password"])
    .index("by_number", ["number"]),

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

  // DEPRECATED (Workstream B / #36): escoteiro-only recognition table, kept as
  // the untouched copy-forward SOURCE until `irrCompletions` is verified on prod.
  // `migrations:copyLisDeOuroToIrr` copies each row here into `irrCompletions`
  // with `ramo` stamped and its id rewritten `lis_* → irr_*`. Drop this table in
  // a follow-up once the counts are verified. No code reads/writes it anymore.
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

  // Ramo-scoped recognition (IRR — Insígnia de Reconhecimento de Ramo). A row's
  // identity is (userId, ramo, itemId): the same escoteiro who was a lobinho
  // keeps a separate IRR record per ramo, and reads only ever return the current
  // ramo's rows. Item ids are `irr_*` (shared across ramos; the ramo column, not
  // the id, distinguishes them). "Lis de Ouro" survives only as escoteiro's
  // display name via getRamoRules("escoteiro").irr.name.
  irrCompletions: defineTable({
    userId: v.id("users"),
    ramo: ramoValidator,
    itemId: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    // Serves both the (userId, ramo) current-ramo reads (prefix) and the
    // (userId, ramo, itemId) .unique() toggle/migration lookups.
    .index("by_userId_and_ramo_and_itemId", ["userId", "ramo", "itemId"]),

  plannedItems: defineTable({
    userId: v.id("users"),
    itemKey: v.string(),
    position: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_itemKey", ["userId", "itemKey"])
    .index("by_userId_and_position", ["userId", "position"]),

  // Audit timeline. Every row is one thing that happened in a group. Two scopes:
  //   - "ramo": about an escoteiro's progression (approval/rejection/levelUp/
  //     lisDeOuro). Carries `subjectRamo` so non-admin escotistas see only their
  //     ramos. Visible to any escotista whose ramos include subjectRamo.
  //   - "group": membership/admin actions (memberJoin/memberBan/ramoChange/
  //     accessChange). `subjectRamo` is absent; visible to admins only.
  // Names are denormalized for cheap rendering; `summary` is server-rendered at
  // write time so the audit line stays accurate even if labels change later.
  events: defineTable({
    type: v.union(
      v.literal("approval"),
      v.literal("rejection"),
      v.literal("levelUp"),
      v.literal("lisDeOuro"),
      v.literal("memberJoin"),
      v.literal("memberBan"),
      v.literal("ramoChange"),
      v.literal("accessChange"),
    ),
    scope: v.union(v.literal("ramo"), v.literal("group")),
    groupId: v.id("groups"),
    subjectRamo: v.optional(ramoValidator),
    actorUserId: v.id("users"),
    actorName: v.optional(v.string()),
    subjectUserId: v.id("users"),
    subjectName: v.optional(v.string()),
    summary: v.optional(v.string()),
    stageId: v.optional(v.string()),
    stageName: v.optional(v.string()),
  })
    // [groupId, _creationTime] — admin feed + MVP per-page visibility filter.
    .index("by_group", ["groupId"])
    // [groupId, subjectRamo, _creationTime] — per-ramo streams (kept so a future
    // strict merged-stream pagination needs no migration).
    .index("by_group_and_ramo", ["groupId", "subjectRamo"]),

  // Cached AI activity suggestions, one row per (group, ramo). Regenerated on
  // demand from the stats page; the page shows the cached row otherwise. Only
  // activity TEXTS + counts feed the model — never scout names/PII.
  // Content fields are optional because a row may exist as a claim stub
  // (requestedAt set, no content yet) while the LLM call is in flight — the
  // claim is what makes the regen cooldown race-free across concurrent calls.
  aiSuggestions: defineTable({
    groupId: v.id("groups"),
    ramo: ramoValidator,
    perEixoIdeas: v.optional(
      v.array(
        v.object({
          eixoId: v.string(),
          eixoName: v.string(),
          idea: v.string(),
          groundedOn: v.array(v.string()),
        }),
      ),
    ),
    overview: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    requestedAt: v.optional(v.number()),
  }).index("by_group_and_ramo", ["groupId", "ramo"]),

  // Runtime feature flags, one row per key. Missing row = flag OFF. Toggle via
  // dashboard (edit the row / run featureFlags:setFlag) or CLI:
  //   bunx convex run featureFlags:setFlag '{"key":"ai_suggestions","enabled":true}'
  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
  }).index("by_key", ["key"]),
});
