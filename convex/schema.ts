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

  // ── Especialidades (new system, #41) ────────────────────────────────────────

  // Item-level specialty tracking for the younger ramoGroup (lobinho + escoteiro).
  // Identity: (userId, ramoGroup, specialtyId, itemIndex).
  // Level is computed on read via getSpecialtyLevel(approvedCount, totalItems).
  // `fileIds` reserved for a future upload UI; not exposed in any current UI.
  specialtyItemCompletions: defineTable({
    userId: v.id("users"),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    specialtyId: v.string(),
    itemIndex: v.number(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    fileIds: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_ramoGroup_and_specialtyId", [
      "userId",
      "ramoGroup",
      "specialtyId",
    ])
    .index("by_userId_and_status", ["userId", "status"]),

  // Project-step specialty tracking for the older ramoGroup (sênior + pioneiro).
  // Identity: (userId, ramoGroup, specialtyId, step).
  // Steps: conhecer → fazer → compartilhar (sequential; UI enforces locking).
  // Specialty is earned when the compartilhar step is approved.
  // `fileIds` reserved for a future upload UI.
  specialtyProjectReports: defineTable({
    userId: v.id("users"),
    ramoGroup: v.union(v.literal("younger"), v.literal("older")),
    specialtyId: v.string(),
    step: v.union(
      v.literal("conhecer"),
      v.literal("fazer"),
      v.literal("compartilhar"),
    ),
    text: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    fileIds: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_ramoGroup_and_specialtyId", [
      "userId",
      "ramoGroup",
      "specialtyId",
    ])
    .index("by_userId_and_status", ["userId", "status"]),

  // ── Legacy specialty system (deprecated, still live until #42–44 ship) ──────
  // DEPRECATED (#41): replaced by specialtyItemCompletions / specialtyProjectReports.
  // Still written by `toggleSpecialty` and read by `getMyCompletions` /
  // `getCompletionsForUser` — kept live so the existing specialty UI keeps working
  // during the migration window. The earned-set contribution to bloco completion is
  // already disabled (earnedSpecialtyBlocoIds=∅ in #41; wired in #44).
  // Full purge (toggleSpecialty + reads + UI) deferred to #42–44.
  // Drop the table definition once #42–44 land and migration is confirmed on prod.
  //
  // Ramo-scoped (#37): a completion's identity is (userId, ramo, blocoId,
  // specialtyName). `ramo` is optional (backfilled in place by
  // `migrations:backfillRamoOnCompletions`); reads filter to the subject's
  // current ramo so a past ramo's especialidades don't bleed into it. blocoIds
  // are shared across ramos, so ramo MUST be in the write-uniqueness lookup.
  specialtyCompletions: defineTable({
    userId: v.id("users"),
    ramo: v.optional(ramoValidator),
    blocoId: v.string(),
    specialtyName: v.string(),
    completedAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    // Serves both the (userId, ramo) current-ramo reads (prefix) and the
    // (userId, ramo, blocoId, specialtyName) .unique() toggle/backfill lookups.
    // The pre-#37 non-ramo blocoId/specialtyName lookup indexes are gone —
    // ramo is now part of a completion's identity.
    .index("by_userId_and_ramo_and_blocoId_and_specialtyName", [
      "userId",
      "ramo",
      "blocoId",
      "specialtyName",
    ]),

  // Ramo-scoped (#37): identity (userId, ramo, blocoId). `ramo` optional,
  // backfilled in place. The per-bloco custom-action cap is counted within the
  // current ramo so a past ramo's ações personalizadas neither bleed nor eat
  // the quota.
  customActions: defineTable({
    userId: v.id("users"),
    ramo: v.optional(ramoValidator),
    blocoId: v.string(),
    text: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
    status: completionStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    // Serves (userId, ramo) current-ramo reads (prefix) and the per-bloco cap
    // count (userId, ramo, blocoId). Supersedes the pre-#37 by_userId_and_blocoId.
    .index("by_userId_and_ramo_and_blocoId", ["userId", "ramo", "blocoId"]),

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

  // Ramo-scoped (#37): identity (userId, ramo, itemKey). `ramo` optional,
  // backfilled in place. `specialty:`/`custom:` plan keys aren't ramo-prefixed
  // (blocoIds are shared), so ramo MUST be in the write-uniqueness lookup; the
  // plan is read and ordered within the current ramo only.
  plannedItems: defineTable({
    userId: v.id("users"),
    ramo: v.optional(ramoValidator),
    itemKey: v.string(),
    position: v.number(),
  })
    .index("by_userId", ["userId"])
    // Kept: the legacy plan-key backfill (prefixLegacyPlannedItemKeys) still
    // looks up by (userId, itemKey) across ramos.
    .index("by_userId_and_itemKey", ["userId", "itemKey"])
    // (userId, ramo) ordered reads + last-position lookup within the ramo.
    // Supersedes the pre-#37 by_userId_and_position.
    .index("by_userId_and_ramo_and_position", ["userId", "ramo", "position"])
    // (userId, ramo, itemKey) .unique() toggle/reorder/backfill lookups.
    .index("by_userId_and_ramo_and_itemKey", ["userId", "ramo", "itemKey"]),

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
