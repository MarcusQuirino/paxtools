import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";

const TEST_EMAIL_SUFFIX = "@test.paxtools.local";
const TEST_GROUP_PREFIX = "__TEST__";
const TEST_GROUP_NAME = "__TEST__ Grupo QA";
const TEST_GROUP_NUMBER = "99999";
const TEST_GROUP_PASSWORD = "TESTQA";
const TEST_PROVIDER_ID = "test-password";
// Seed-side secret; the actual signin secret is verified against
// TEST_AUTH_PASSWORD in convex/auth.ts via crypto.verifySecret.
const TEST_AUTH_ACCOUNT_SECRET = "test-secret";

function assertTestEnv(): void {
  if (process.env.TEST_AUTH !== "1") {
    throw new Error("convex/testing is disabled (TEST_AUTH != 1)");
  }
}

function isTestUser(u: Doc<"users">): boolean {
  return typeof u.email === "string" && u.email.endsWith(TEST_EMAIL_SUFFIX);
}

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";
type Role = "escoteiro" | "escotista";
type Membership = "pending" | "approved";

type CatalogEntry = {
  slug: string;
  email: string;
  name: string;
  role?: Role;
  ramo?: Ramo;
  escotistaRamos?: Ramo[];
  isAdmin?: boolean;
  membershipStatus?: Membership;
  onboardingComplete?: boolean;
  inGroup: boolean; // whether to patch groupId to the test group
  banned?: boolean;
};

const CATALOG: CatalogEntry[] = [
  {
    slug: "admin",
    email: "admin@test.paxtools.local",
    name: "admin",
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    isAdmin: true,
    membershipStatus: "approved",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escotista",
    email: "escotista@test.paxtools.local",
    name: "escotista",
    role: "escotista",
    escotistaRamos: ["escoteiro", "senior"],
    isAdmin: false,
    membershipStatus: "approved",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escotista_pending",
    email: "escotista-pending@test.paxtools.local",
    name: "escotista-pending",
    role: "escotista",
    escotistaRamos: ["escoteiro"],
    isAdmin: false,
    membershipStatus: "pending",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escoteiro_pending",
    email: "pending@test.paxtools.local",
    name: "pending",
    role: "escoteiro",
    ramo: "escoteiro",
    membershipStatus: "pending",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escoteiro_approved",
    email: "approved@test.paxtools.local",
    name: "approved",
    role: "escoteiro",
    ramo: "escoteiro",
    membershipStatus: "approved",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escoteiro_with_progression",
    email: "progression@test.paxtools.local",
    name: "progression",
    role: "escoteiro",
    ramo: "escoteiro",
    membershipStatus: "approved",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escoteiro_lobinho",
    email: "lobinho@test.paxtools.local",
    name: "lobinho",
    role: "escoteiro",
    ramo: "lobinho",
    membershipStatus: "approved",
    onboardingComplete: true,
    inGroup: true,
  },
  {
    slug: "escoteiro_onboarding_incomplete",
    email: "onboarding@test.paxtools.local",
    name: "onboarding",
    onboardingComplete: false,
    inGroup: false,
  },
  {
    slug: "banned_user",
    email: "banned@test.paxtools.local",
    name: "banned",
    role: "escoteiro",
    inGroup: false,
    banned: true,
  },
];

export const wipeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertTestEnv();

    // 1. Collect test users (single source of truth).
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter(isTestUser);
    const testUserIds = new Set<Id<"users">>(testUsers.map((u) => u._id));

    // 2. Collect test groups: prefix AND createdBy is a test user.
    const allGroups = await ctx.db.query("groups").collect();
    const testGroups = allGroups.filter(
      (g) =>
        g.name.startsWith(TEST_GROUP_PREFIX) && testUserIds.has(g.createdBy),
    );

    // 3. Per-user owned rows.
    const userOwned = [
      "actionCompletions",
      "specialtyCompletions",
      "customActions",
      "lisDeOuroCompletions",
      "plannedItems",
    ] as const;
    let deletedRows = 0;
    for (const table of userOwned) {
      for (const uid of testUserIds) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_userId", (q) => q.eq("userId", uid))
          .collect();
        for (const r of rows) {
          await ctx.db.delete(r._id);
          deletedRows++;
        }
      }
    }

    // 4. Auth tables — any row whose userId is a test user. Sessions first
    // so refresh tokens (which FK by sessionId) can be cleaned alongside.
    const sessionIdsToDelete = new Set<Id<"authSessions">>();
    const allSessions = await ctx.db.query("authSessions").collect();
    for (const s of allSessions) {
      if (testUserIds.has(s.userId)) {
        sessionIdsToDelete.add(s._id);
      }
    }
    const allRefreshTokens = await ctx.db.query("authRefreshTokens").collect();
    for (const r of allRefreshTokens) {
      if (sessionIdsToDelete.has(r.sessionId)) {
        await ctx.db.delete(r._id);
        deletedRows++;
      }
    }
    for (const sid of sessionIdsToDelete) {
      await ctx.db.delete(sid);
      deletedRows++;
    }
    const allAccounts = await ctx.db.query("authAccounts").collect();
    for (const a of allAccounts) {
      if (testUserIds.has(a.userId)) {
        await ctx.db.delete(a._id);
        deletedRows++;
      }
    }

    // 5. Groups, then users — last, so traversals above still resolve.
    for (const g of testGroups) await ctx.db.delete(g._id);
    for (const u of testUsers) await ctx.db.delete(u._id);

    return {
      deletedUsers: testUsers.length,
      deletedGroups: testGroups.length,
      deletedRows,
    };
  },
});

async function ensureUser(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  entry: CatalogEntry,
): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", entry.email))
    .unique();

  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("users", {
    email: entry.email,
    name: entry.name,
  });
}

async function ensureAuthAccount(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  userId: Id<"users">,
  email: string,
): Promise<void> {
  const existing = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", TEST_PROVIDER_ID).eq("providerAccountId", email),
    )
    .unique();
  if (existing) {
    if (existing.userId !== userId) {
      await ctx.db.patch(existing._id, { userId });
    }
    return;
  }
  await ctx.db.insert("authAccounts", {
    userId,
    provider: TEST_PROVIDER_ID,
    providerAccountId: email,
    secret: TEST_AUTH_ACCOUNT_SECRET,
  });
}

export const seedTestUsers = internalMutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    users: Record<string, Id<"users">>;
    groupId: Id<"groups">;
  }> => {
    assertTestEnv();

    // 1. Ensure the admin user first so we can use its _id as createdBy.
    const adminEntry = CATALOG.find((c) => c.slug === "admin");
    if (!adminEntry) throw new Error("admin entry missing from catalog");
    const adminId = await ensureUser(ctx, adminEntry);
    await ensureAuthAccount(ctx, adminId, adminEntry.email);

    // 2. Ensure the test group exists (by exact name match — group is unique).
    const allGroups = await ctx.db.query("groups").collect();
    let group = allGroups.find(
      (g) => g.name === TEST_GROUP_NAME && !g.deletedAt,
    );
    if (!group) {
      const newId = await ctx.db.insert("groups", {
        name: TEST_GROUP_NAME,
        number: TEST_GROUP_NUMBER,
        password: TEST_GROUP_PASSWORD,
        createdBy: adminId,
        createdAt: Date.now(),
        ramoNames: {},
      });
      const fetched = await ctx.db.get(newId);
      if (!fetched) throw new Error("failed to insert test group");
      group = fetched;
    } else {
      // Re-apply expected fields in case a previous run mutated them.
      await ctx.db.patch(group._id, {
        number: TEST_GROUP_NUMBER,
        password: TEST_GROUP_PASSWORD,
        createdBy: adminId,
        deletedAt: undefined,
      });
    }
    const groupId = group._id;

    // 3. Ensure every catalog user exists, auth account exists, and apply
    // the catalog's field state via patch (idempotent).
    const userIds: Record<string, Id<"users">> = {};
    for (const entry of CATALOG) {
      const userId =
        entry.slug === "admin" ? adminId : await ensureUser(ctx, entry);
      userIds[entry.slug] = userId;
      await ensureAuthAccount(ctx, userId, entry.email);

      const existingUser = await ctx.db.get(userId);
      const wasBannedBefore =
        existingUser !== null && existingUser.bannedAt !== undefined;

      // Build patch from catalog. `undefined` clears the field via patch.
      const patch: Partial<Doc<"users">> = {
        name: entry.name,
        role: entry.role,
        ramo: entry.ramo,
        escotistaRamos: entry.escotistaRamos,
        isAdmin: entry.isAdmin,
        membershipStatus: entry.membershipStatus,
        onboardingComplete: entry.onboardingComplete,
        groupId: entry.inGroup ? groupId : undefined,
      };

      if (entry.banned) {
        // Only stamp bannedAt on first creation so the timestamp doesn't
        // churn across runs.
        if (!wasBannedBefore) {
          patch.bannedAt = Date.now();
          patch.bannedBy = adminId;
        }
      } else {
        patch.bannedAt = undefined;
        patch.bannedBy = undefined;
      }

      await ctx.db.patch(userId, patch);
    }

    // 4. Progression rows for escoteiro_with_progression.
    const progressionId = userIds["escoteiro_with_progression"];
    if (!progressionId) {
      throw new Error("escoteiro_with_progression missing after seed");
    }
    // Use real curriculum-shaped action IDs (see src/data/progression-data/
    // and the ACTION_ID_PATTERN guard in convex/progression.ts). IDs are
    // 4-part `${ramo}:${blocoId}:${type}:${index}` since the multi-ramo
    // refactor; synthetic IDs like "test-action-1" are rejected by the input
    // validator BEFORE the approved-lock check runs, making the lock untestable.
    const completionRows: {
      actionId: string;
      status: "pending" | "approved";
    }[] = [
      { actionId: "escoteiro:aprendizagem-continua:fixed:0", status: "approved" },
      { actionId: "escoteiro:aprendizagem-continua:fixed:1", status: "approved" },
      { actionId: "escoteiro:aprendizagem-continua:variable:0", status: "pending" },
      { actionId: "escoteiro:aprendizagem-continua:variable:1", status: "pending" },
      { actionId: "escoteiro:autonomia-lideranca:fixed:0", status: "approved" },
    ];
    for (const row of completionRows) {
      const existing = await ctx.db
        .query("actionCompletions")
        .withIndex("by_userId_and_actionId", (q) =>
          q.eq("userId", progressionId).eq("actionId", row.actionId),
        )
        .unique();
      if (existing) continue;
      await ctx.db.insert("actionCompletions", {
        userId: progressionId,
        actionId: row.actionId,
        completedAt: Date.now(),
        status: row.status,
        approvedBy: row.status === "approved" ? adminId : undefined,
        approvedAt: row.status === "approved" ? Date.now() : undefined,
      });
    }

    // Plan item key shape: `action:<actionId>` per src/lib/plan-keys.ts, where
    // actionId is the 4-part `${ramo}:${blocoId}:${type}:${index}`. Must
    // reference a real curriculum action so the "Por Área" view renders it.
    const plannedKey = "action:escoteiro:aprendizagem-continua:variable:2";
    const existingPlanned = await ctx.db
      .query("plannedItems")
      .withIndex("by_userId_and_itemKey", (q) =>
        q.eq("userId", progressionId).eq("itemKey", plannedKey),
      )
      .unique();
    if (!existingPlanned) {
      await ctx.db.insert("plannedItems", {
        userId: progressionId,
        itemKey: plannedKey,
        position: 0,
      });
    }

    return { users: userIds, groupId };
  },
});

export const getTestUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    assertTestEnv();
    if (!email.endsWith(TEST_EMAIL_SUFFIX)) {
      throw new Error("not a test email");
    }
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});

// Simulated demo troop: 15 escoteiros in the test group's `escoteiro` ramo,
// spread across all four stages by completed-block count (Pista 0 / Trilha 4 /
// Rumo 8 / Travessia 13). Each scout fully completes its first N blocks (all
// fixed + `variableRequired` variable actions, approved) so snapshotProgression
// derives the intended stage. Idempotent: re-running replaces the prior sim
// scouts (email prefix `sim-troop-`). Requires testing:seedTestUsers first
// (for the group + the admin/escotista login accounts). All scouts share
// _creationTime=now, so the acompanhamento "novo membro" hint flags them all —
// a seeding artifact, not a bug.
const SIM_EMAIL_PREFIX = "sim-troop-";

const SIM_SCOUTS: { name: string; blocks: number }[] = [
  { name: "Ana Lima", blocks: 0 },
  { name: "Bruno Sá", blocks: 1 },
  { name: "Carla Reis", blocks: 2 },
  { name: "Diego Alves", blocks: 3 },
  { name: "Elisa Nunes", blocks: 4 },
  { name: "Felipe Rocha", blocks: 5 },
  { name: "Gabriela Pinto", blocks: 6 },
  { name: "Heitor Dias", blocks: 7 },
  { name: "Íris Campos", blocks: 8 },
  { name: "João Mendes", blocks: 9 },
  { name: "Kelly Faria", blocks: 11 },
  { name: "Lucas Teixeira", blocks: 13 },
  { name: "Marina Costa", blocks: 14 },
  { name: "Nina Barros", blocks: 16 },
  { name: "Otávio Freitas", blocks: 18 },
];

export const seedSimulatedTroop = internalMutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    created: number;
    groupId: Id<"groups">;
    perStage: Record<string, number>;
  }> => {
    assertTestEnv();

    const admin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "admin@test.paxtools.local"))
      .unique();
    if (!admin) {
      throw new Error("run testing:seedTestUsers first (admin login missing)");
    }
    const groups = await ctx.db.query("groups").collect();
    const group = groups.find(
      (g) => g.name === TEST_GROUP_NAME && !g.deletedAt,
    );
    if (!group) {
      throw new Error("run testing:seedTestUsers first (test group missing)");
    }

    // Ordered flat list of the escoteiro ramo's 18 blocos.
    const blocos = getEixosForRamo("escoteiro").flatMap((e) => e.blocos);

    // Idempotent: drop any previously-seeded sim scouts + their completions.
    for (const u of await ctx.db.query("users").collect()) {
      if (typeof u.email === "string" && u.email.startsWith(SIM_EMAIL_PREFIX)) {
        for (const c of await ctx.db
          .query("actionCompletions")
          .withIndex("by_userId", (q) => q.eq("userId", u._id))
          .collect()) {
          await ctx.db.delete(c._id);
        }
        await ctx.db.delete(u._id);
      }
    }

    const now = Date.now();
    const perStage: Record<string, number> = {
      pista: 0,
      trilha: 0,
      rumo: 0,
      travessia: 0,
    };
    let created = 0;
    let idx = 0;
    for (const scout of SIM_SCOUTS) {
      idx += 1;
      const email = `${SIM_EMAIL_PREFIX}${idx}@test.paxtools.local`;
      const userId = await ctx.db.insert("users", {
        email,
        name: scout.name,
      });
      await ctx.db.patch(userId, {
        name: scout.name,
        role: "escoteiro",
        ramo: "escoteiro",
        membershipStatus: "approved",
        onboardingComplete: true,
        groupId: group._id,
      });

      // Fully complete the first `blocks` blocos.
      for (const b of blocos.slice(0, scout.blocks)) {
        const actionIds = [
          ...b.fixedActions.map((a) => a.id),
          ...b.variableActions
            .slice(0, Math.min(b.variableRequired, b.variableActions.length))
            .map((a) => a.id),
        ];
        for (const actionId of actionIds) {
          await ctx.db.insert("actionCompletions", {
            userId,
            actionId,
            completedAt: now,
            status: "approved",
            approvedBy: admin._id,
            approvedAt: now,
          });
        }
      }

      const n = scout.blocks;
      const stage =
        n >= 13 ? "travessia" : n >= 8 ? "rumo" : n >= 4 ? "trilha" : "pista";
      perStage[stage] = (perStage[stage] ?? 0) + 1;
      created += 1;
    }

    return { created, groupId: group._id, perStage };
  },
});
