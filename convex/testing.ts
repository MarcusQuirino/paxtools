import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getEixosForRamo } from "../src/data/progression-data";
import { getRamoRules } from "../src/data/progression-rules";
import type { Bloco, Eixo } from "../src/data/types";
import { YOUNGER_SPECIALTY_BY_ID } from "../src/data/specialty-data/younger";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  type ProjectStep,
} from "../src/data/specialty-data/older";
import {
  getCurrentStage,
  toCanonicalSpecialtyId,
} from "../src/lib/completion-logic";
import { ramoGroupForRamo } from "./lib/progression";
import {
  describeCompletion,
  logGroupEvent,
  logRamoEvent,
} from "./lib/events";

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

/**
 * Cascade-delete `targetUsers` and everything they own: per-user rows, auth
 * rows, and any group in `targetGroups`. Groups and users go last so the
 * traversals above them still resolve.
 */
async function wipeUsersCascade(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  targetUsers: Doc<"users">[],
  targetGroups: Doc<"groups">[],
): Promise<{ deletedUsers: number; deletedGroups: number; deletedRows: number }> {
  const targetUserIds = new Set<Id<"users">>(targetUsers.map((u) => u._id));

  // 1. Per-user owned rows.
  const userOwned = [
    "actionCompletions",
    "specialtyCompletions",
    "specialtyItemCompletions",
    "specialtyProjectReports",
    "customActions",
    "lisDeOuroCompletions",
    "irrCompletions",
    "plannedItems",
  ] as const;
  let deletedRows = 0;
  for (const table of userOwned) {
    for (const uid of targetUserIds) {
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

  // 2. Auth tables — any row whose userId is a target user. Sessions first
  // so refresh tokens (which FK by sessionId) can be cleaned alongside.
  const sessionIdsToDelete = new Set<Id<"authSessions">>();
  const allSessions = await ctx.db.query("authSessions").collect();
  for (const s of allSessions) {
    if (targetUserIds.has(s.userId)) {
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
    if (targetUserIds.has(a.userId)) {
      await ctx.db.delete(a._id);
      deletedRows++;
    }
  }

  // 3. Events where a target user is subject or actor (feed lines would
  // otherwise dangle and duplicate across re-seeds).
  const allEvents = await ctx.db.query("events").collect();
  for (const e of allEvents) {
    if (targetUserIds.has(e.subjectUserId) || targetUserIds.has(e.actorUserId)) {
      await ctx.db.delete(e._id);
      deletedRows++;
    }
  }

  // 4. Groups, then users — last, so traversals above still resolve.
  for (const g of targetGroups) await ctx.db.delete(g._id);
  for (const u of targetUsers) await ctx.db.delete(u._id);

  return {
    deletedUsers: targetUsers.length,
    deletedGroups: targetGroups.length,
    deletedRows,
  };
}

export const wipeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertTestEnv();

    // Collect test users (single source of truth).
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter(isTestUser);
    const testUserIds = new Set<Id<"users">>(testUsers.map((u) => u._id));

    // Test groups: prefix AND createdBy is a test user.
    const allGroups = await ctx.db.query("groups").collect();
    const testGroups = allGroups.filter(
      (g) =>
        g.name.startsWith(TEST_GROUP_PREFIX) && testUserIds.has(g.createdBy),
    );

    return await wipeUsersCascade(ctx, testUsers, testGroups);
  },
});

/**
 * Staging-only: delete every REAL user (any account whose email is not
 * `@test.paxtools.local`) so the Google onboarding flow can be re-tested
 * from scratch. Seeded test users and the test group are untouched.
 *
 * Cannot run on prod: `assertTestEnv` throws unless TEST_AUTH=1, which prod
 * never sets. Invoke via `bun run staging:wipe-real`.
 */
export const wipeRealUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertTestEnv();

    const allUsers = await ctx.db.query("users").collect();
    const realUsers = allUsers.filter((u) => !isTestUser(u));
    const realUserIds = new Set<Id<"users">>(realUsers.map((u) => u._id));

    // Any group a real user created (e.g. via onboarding) goes with them.
    const allGroups = await ctx.db.query("groups").collect();
    const realGroups = allGroups.filter((g) => realUserIds.has(g.createdBy));

    return await wipeUsersCascade(ctx, realUsers, realGroups);
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
        ramo: "escoteiro",
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

// ── Simulated demo troop ─────────────────────────────────────────────────────
//
// Seeds all four ramos with a realistic cohort so every feature surface has
// data: stats/coverage (varied blocos + eixos, real gaps), etapa distribution,
// especialidades (earned / in-progress / pending; younger item-based and older
// project-based), IRR (one holder per ramo + one partial), the approvals queue
// (pending conclusões), ações personalizadas, planos, synthetic events, ≥2
// escotistas per ramo (single-ramo — the CATALOG `escotista` covering
// escoteiro+senior stays the deliberate multi-ramo edge case), pending join
// requests, and multi-ramo history scouts (past-ramo records that must NOT
// bleed into the current ramo).
//
// Deterministic on purpose (index arithmetic, no randomness) so re-seeds and
// Playwright runs see identical data. Idempotent: `sim-*` users are wiped and
// re-created by the seedSimulatedTroop action. Every sim user gets a test auth
// account, so e2e can authenticate as any persona. All sim users share
// _creationTime=now, so the acompanhamento "novo membro" hint flags them all —
// a seeding artifact, not a bug.
//
// Requires testing:seedTestUsers first (test group + admin login).
const SIM_EMAIL_PREFIX = "sim-"; // also matches the legacy "sim-troop-" scheme

const RAMOS = ["lobinho", "escoteiro", "senior", "pioneiro"] as const;

const simRamoArg = v.union(
  v.literal("lobinho"),
  v.literal("escoteiro"),
  v.literal("senior"),
  v.literal("pioneiro"),
);

// "earned" completes the linked bloco (level 1 for younger; all three etapas
// approved for older). "level2" is younger-only full completion. "inProgress"
// has approved work below the earning threshold; "pending" awaits approval.
type SpecialtyMode = "earned" | "level2" | "inProgress" | "pending";

type ScoutSpec = {
  name: string;
  /** Completed blocos via ações (an earned especialidade may add one more). */
  blocks: number;
  irr?: "full" | "partial";
  specialty?: SpecialtyMode;
  /** Pending conclusões on the frontier bloco (approvals-queue material). */
  pendingActions?: number;
  /** Approved-but-incomplete frontier bloco (all fixed, one variable short). */
  partialNext?: boolean;
  custom?: "approved" | "pending";
  plan?: boolean;
  /** Fully-completed past ramos (with their IRR) — retained record. */
  history?: Ramo[];
};

type RamoSimSpec = {
  scouts: ScoutSpec[];
  escotistas: string[];
  pendingScout: string;
  pendingEscotista?: string;
};

const SIM_SPECS: Record<Ramo, RamoSimSpec> = {
  lobinho: {
    scouts: [
      { name: "Alice Prado", blocks: 0, plan: true },
      { name: "Bento Farias", blocks: 1, pendingActions: 2 },
      { name: "Cecília Moraes", blocks: 2, specialty: "pending" },
      { name: "Davi Siqueira", blocks: 3, partialNext: true, plan: true },
      { name: "Estela Ramos", blocks: 3, custom: "pending" },
      { name: "Felipe Duarte", blocks: 4, specialty: "inProgress" },
      { name: "Gael Monteiro", blocks: 5 },
      { name: "Helena Braga", blocks: 6, specialty: "earned" },
      { name: "Igor Peixoto", blocks: 7, pendingActions: 1 },
      { name: "Júlia Sales", blocks: 8, custom: "approved", plan: true },
      { name: "Kaique Neves", blocks: 9, specialty: "level2" },
      { name: "Lara Fontes", blocks: 11 },
      { name: "Miguel Serra", blocks: 13 },
      { name: "Nara Bicalho", blocks: 15, specialty: "earned" },
      { name: "Otto Vilela", blocks: 18, irr: "full" },
      { name: "Pilar Antunes", blocks: 18, irr: "partial" },
    ],
    escotistas: ["Marina Solano", "Caio Bandeira"],
    pendingScout: "Théo Barcellos",
    pendingEscotista: "Olga Ventura",
  },
  escoteiro: {
    scouts: [
      { name: "Ana Lima", blocks: 0, plan: true },
      { name: "Bruno Sá", blocks: 1, pendingActions: 2 },
      { name: "Carla Reis", blocks: 2, specialty: "pending" },
      { name: "Diego Alves", blocks: 3, partialNext: true, plan: true },
      { name: "Elisa Nunes", blocks: 4, custom: "pending" },
      { name: "Felipe Rocha", blocks: 5, specialty: "inProgress" },
      { name: "Gabriela Pinto", blocks: 6, specialty: "earned" },
      { name: "Heitor Dias", blocks: 7, pendingActions: 1 },
      { name: "Íris Campos", blocks: 8, custom: "approved", plan: true },
      { name: "João Mendes", blocks: 9, specialty: "level2" },
      { name: "Kelly Faria", blocks: 11 },
      { name: "Lucas Teixeira", blocks: 13 },
      { name: "Marina Costa", blocks: 14 },
      { name: "Nina Barros", blocks: 16 },
      { name: "Otávio Freitas", blocks: 18, irr: "full" },
    ],
    escotistas: ["Renata Peçanha", "Bruno Valente"],
    pendingScout: "Manu Setúbal",
  },
  senior: {
    scouts: [
      { name: "Paulo Vidal", blocks: 0, plan: true },
      { name: "Quésia Torres", blocks: 1, pendingActions: 2 },
      { name: "Rafael Bastos", blocks: 3, specialty: "pending" },
      { name: "Sofia Cardoso", blocks: 4, partialNext: true, plan: true },
      { name: "Tiago Furtado", blocks: 5, custom: "pending" },
      { name: "Úrsula Mattos", blocks: 6, specialty: "inProgress" },
      { name: "Vitor Sampaio", blocks: 7, specialty: "earned" },
      { name: "Wanda Leal", blocks: 8, pendingActions: 1 },
      { name: "Xavier Dutra", blocks: 10, custom: "approved", plan: true },
      { name: "Yara Boaventura", blocks: 12 },
      { name: "Zeca Amorim", blocks: 14 },
      {
        name: "Aurora Linhares",
        blocks: 9,
        history: ["lobinho", "escoteiro"],
        plan: true,
      },
      { name: "Breno Cavalcanti", blocks: 18, irr: "full" },
    ],
    escotistas: ["Talita Novaes", "Sérgio Camargo"],
    pendingScout: "Ivan Queiroga",
  },
  pioneiro: {
    scouts: [
      {
        name: "Clara Estevão",
        blocks: 7,
        history: ["lobinho", "escoteiro", "senior"],
        plan: true,
      },
      { name: "Dante Meireles", blocks: 2, pendingActions: 1, custom: "pending" },
      { name: "Eloá Pacheco", blocks: 5, specialty: "inProgress" },
      { name: "Fábio Quintana", blocks: 12, specialty: "earned" },
      { name: "Gilda Rezende", blocks: 18, irr: "full" },
    ],
    escotistas: ["Vera Lacerda", "Hugo Tavares"],
    pendingScout: "Bia Frota",
    pendingEscotista: "Pedro Sabino",
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Round-robin across eixos: the order a troop realistically works blocos —
 * spread over all eixos in parallel rather than one eixo at a time, so partial
 * progressions produce per-eixo coverage instead of a monotone prefix.
 */
function troopOrder(eixos: Eixo[]): Bloco[] {
  const perEixo = eixos.map((e) => e.blocos);
  const longest = Math.max(...perEixo.map((b) => b.length));
  const out: Bloco[] = [];
  for (let i = 0; i < longest; i++) {
    for (const blocos of perEixo) {
      const b = blocos[i];
      if (b) out.push(b);
    }
  }
  return out;
}

/**
 * Mostly-shared prefix of the troop order with one per-scout deviation, so
 * progressions look like a real cohort — similar, not identical — and the
 * coverage stats show genuine gaps.
 */
function completedBlocosFor(
  order: Bloco[],
  blocks: number,
  idx: number,
): Bloco[] {
  if (blocks <= 0) return [];
  const chosen = order.slice(0, blocks);
  const next = order[blocks];
  if (!next) return chosen; // all 18 — nothing to deviate into
  if (idx % 3 === 1 && blocks >= 2) {
    chosen[blocks - 1] = next; // skipped one at the frontier, did the next
  } else if (idx % 3 === 2 && blocks >= 3) {
    chosen[blocks - 2] = next; // a gap two blocos back
  }
  return chosen;
}

/** Rotate the variable-ação choice per scout+bloco so `neglectedVariable` and
 * `mostDone` aren't degenerate (everyone picking the first N). */
function variableIdsFor(bloco: Bloco, scoutIdx: number, ordinal: number): string[] {
  const len = bloco.variableActions.length;
  if (len === 0) return [];
  const need = Math.min(bloco.variableRequired, len);
  const offset = (scoutIdx + ordinal) % len;
  return Array.from(
    { length: need },
    (_, k) => bloco.variableActions[(offset + k) % len]!.id,
  );
}

type SpecialtyTarget = { bloco: Bloco; name: string; id: string };

/** All (bloco, especialidade) pairs whose especialidade resolves to a real
 * catalog entry for the ramo's group — the pool bloco-completing especialidade
 * work is drawn from. */
function specialtyTargets(ramo: Ramo, eixos: Eixo[]): SpecialtyTarget[] {
  const younger = ramoGroupForRamo(ramo) === "younger";
  const out: SpecialtyTarget[] = [];
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      for (const alt of bloco.alternativeCompletions) {
        if (alt.type !== "especialidade") continue;
        for (const name of alt.items) {
          const id = toCanonicalSpecialtyId(name);
          const known = younger
            ? YOUNGER_SPECIALTY_BY_ID.has(id)
            : OLDER_SPECIALTY_BY_ID.has(id);
          if (known) {
            out.push({ bloco, name, id });
            break; // one especialidade per alternative-completion entry
          }
        }
      }
    }
  }
  if (out.length === 0) {
    throw new Error(`no especialidade targets resolve for ramo ${ramo}`);
  }
  return out;
}

function pickTarget(
  targets: SpecialtyTarget[],
  completedIds: Set<string>,
  idx: number,
): SpecialtyTarget {
  for (let k = 0; k < targets.length; k++) {
    const t = targets[(idx + k) % targets.length]!;
    if (!completedIds.has(t.bloco.id)) return t;
  }
  return targets[idx % targets.length]!;
}

async function insertActionRows(
  ctx: MutationCtx,
  userId: Id<"users">,
  actionIds: string[],
  status: "pending" | "approved",
  approverId: Id<"users">,
  at: number,
): Promise<void> {
  for (const actionId of actionIds) {
    await ctx.db.insert("actionCompletions", {
      userId,
      actionId,
      completedAt: at,
      status,
      approvedBy: status === "approved" ? approverId : undefined,
      approvedAt: status === "approved" ? at : undefined,
    });
  }
}

/**
 * Fully complete a PAST ramo: every bloco (fixed + required variables) plus its
 * IRR — the record an escoteiro carries when advancing. Ramo-scoped reads must
 * keep it out of the current ramo's progression and stats.
 */
async function fullyCompleteRamo(
  ctx: MutationCtx,
  userId: Id<"users">,
  ramo: Ramo,
  approverId: Id<"users">,
  at: number,
): Promise<void> {
  for (const bloco of getEixosForRamo(ramo).flatMap((e) => e.blocos)) {
    const ids = [
      ...bloco.fixedActions.map((a) => a.id),
      ...bloco.variableActions
        .slice(0, Math.min(bloco.variableRequired, bloco.variableActions.length))
        .map((a) => a.id),
    ];
    await insertActionRows(ctx, userId, ids, "approved", approverId, at);
  }
  for (const item of getRamoRules(ramo).irr.items.filter((i) => !i.auto)) {
    await ctx.db.insert("irrCompletions", {
      userId,
      ramo,
      itemId: item.id,
      completedAt: at,
      status: "approved",
      approvedBy: approverId,
      approvedAt: at,
    });
  }
}

async function insertYoungerSpecialty(
  ctx: MutationCtx,
  userId: Id<"users">,
  specialtyId: string,
  mode: SpecialtyMode,
  approverId: Id<"users">,
  now: number,
): Promise<void> {
  const total = YOUNGER_SPECIALTY_BY_ID.get(specialtyId)?.items.length ?? 0;
  if (total === 0) {
    throw new Error(`unknown younger especialidade ${specialtyId}`);
  }
  // items.length is always even: level 1 (earned) = total/2 approved items.
  let approved = 0;
  let pending = 0;
  if (mode === "earned") approved = total / 2;
  else if (mode === "level2") approved = total;
  else if (mode === "inProgress") {
    approved = Math.max(0, Math.ceil(total / 2) - 1); // one short of level 1
    pending = approved === 0 ? 2 : 1;
  } else pending = 2;
  for (let k = 0; k < Math.min(total, approved + pending); k++) {
    const isApproved = k < approved;
    await ctx.db.insert("specialtyItemCompletions", {
      userId,
      ramoGroup: "younger",
      specialtyId,
      itemIndex: k,
      completedAt: now - 5 * DAY_MS,
      status: isApproved ? "approved" : "pending",
      approvedBy: isApproved ? approverId : undefined,
      approvedAt: isApproved ? now - 4 * DAY_MS : undefined,
    });
  }
}

async function insertOlderSpecialty(
  ctx: MutationCtx,
  userId: Id<"users">,
  specialtyId: string,
  mode: SpecialtyMode,
  approverId: Id<"users">,
  now: number,
): Promise<void> {
  if (!OLDER_SPECIALTY_BY_ID.has(specialtyId)) {
    throw new Error(`unknown older especialidade ${specialtyId}`);
  }
  // Older especialidades are binary: earned = all three etapas approved.
  const reports: { step: ProjectStep; status: "pending" | "approved" }[] =
    mode === "earned" || mode === "level2"
      ? PROJECT_STEPS.map((step) => ({ step, status: "approved" as const }))
      : mode === "inProgress"
        ? [
            { step: "conhecer", status: "approved" },
            { step: "fazer", status: "pending" },
          ]
        : [{ step: "conhecer", status: "pending" }];
  for (const r of reports) {
    await ctx.db.insert("specialtyProjectReports", {
      userId,
      ramoGroup: "older",
      specialtyId,
      step: r.step,
      text: `Relatório da etapa ${r.step} (dados de demonstração).`,
      completedAt: now - 6 * DAY_MS,
      status: r.status,
      approvedBy: r.status === "approved" ? approverId : undefined,
      approvedAt: r.status === "approved" ? now - 5 * DAY_MS : undefined,
    });
  }
}

async function insertIrr(
  ctx: MutationCtx,
  userId: Id<"users">,
  ramo: Ramo,
  mode: "full" | "partial",
  approverId: Id<"users">,
  now: number,
): Promise<void> {
  const manual = getRamoRules(ramo).irr.items.filter((i) => !i.auto);
  const rows =
    mode === "full"
      ? manual.map((item) => ({ item, status: "approved" as const }))
      : manual
          .slice(0, 3)
          .map((item, k) => ({
            item,
            status: k < 2 ? ("approved" as const) : ("pending" as const),
          }));
  for (const r of rows) {
    await ctx.db.insert("irrCompletions", {
      userId,
      ramo,
      itemId: r.item.id,
      completedAt: now - DAY_MS,
      status: r.status,
      approvedBy: r.status === "approved" ? approverId : undefined,
      approvedAt: r.status === "approved" ? now - DAY_MS : undefined,
    });
  }
}

export type SimRamoSummary = {
  scouts: number;
  escotistas: number;
  pendingRequests: number;
  perStage: Record<string, number>;
  events: number;
};

/** Wipe every simulated persona (email `sim-*@test.paxtools.local`) and all
 * rows they own, including their events. Legacy `sim-troop-N` emails match. */
export const wipeSimUsers = internalMutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ deletedUsers: number; deletedRows: number }> => {
    assertTestEnv();
    const allUsers = await ctx.db.query("users").collect();
    const simUsers = allUsers.filter(
      (u) =>
        typeof u.email === "string" &&
        u.email.startsWith(SIM_EMAIL_PREFIX) &&
        u.email.endsWith(TEST_EMAIL_SUFFIX),
    );
    const res = await wipeUsersCascade(ctx, simUsers, []);
    return { deletedUsers: res.deletedUsers, deletedRows: res.deletedRows };
  },
});

/** Seed one ramo's slice of the simulated troop. Assumes wipeSimUsers ran.
 * Split per ramo to stay far from Convex's per-mutation write limits. */
export const seedSimRamo = internalMutation({
  args: { ramo: simRamoArg },
  handler: async (ctx, { ramo }): Promise<SimRamoSummary> => {
    assertTestEnv();

    const admin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "admin@test.paxtools.local"))
      .unique();
    if (!admin) {
      throw new Error("run testing:seedTestUsers first (admin login missing)");
    }
    const groups = await ctx.db.query("groups").collect();
    const group = groups.find((g) => g.name === TEST_GROUP_NAME && !g.deletedAt);
    if (!group) {
      throw new Error("run testing:seedTestUsers first (test group missing)");
    }

    const eixos = getEixosForRamo(ramo);
    const order = troopOrder(eixos);
    const rules = getRamoRules(ramo);
    const targets = specialtyTargets(ramo, eixos);
    const spec = SIM_SPECS[ramo];
    const now = Date.now();

    const createUser = async (
      email: string,
      name: string,
      patch: Partial<Doc<"users">>,
    ): Promise<Doc<"users">> => {
      const userId = await ctx.db.insert("users", { email, name });
      await ensureAuthAccount(ctx, userId, email);
      await ctx.db.patch(userId, patch);
      const doc = await ctx.db.get(userId);
      if (!doc) throw new Error("sim user vanished after insert");
      return doc;
    };

    // 1. Escotistas — single-ramo, approvers/actors for everything below.
    const escotistas: Doc<"users">[] = [];
    for (let j = 0; j < spec.escotistas.length; j++) {
      escotistas.push(
        await createUser(
          `sim-escotista-${ramo}-${j + 1}${TEST_EMAIL_SUFFIX}`,
          spec.escotistas[j]!,
          {
            role: "escotista",
            escotistaRamos: [ramo],
            isAdmin: false,
            membershipStatus: "approved",
            onboardingComplete: true,
            groupId: group._id,
          },
        ),
      );
    }
    const approver = escotistas[0] ?? admin;

    // 2. Pending join requests (one escoteiro per ramo; escotista where spec'd).
    let pendingRequests = 0;
    await createUser(
      `sim-pending-${ramo}-1${TEST_EMAIL_SUFFIX}`,
      spec.pendingScout,
      {
        role: "escoteiro",
        ramo,
        membershipStatus: "pending",
        onboardingComplete: true,
        groupId: group._id,
      },
    );
    pendingRequests++;
    if (spec.pendingEscotista) {
      await createUser(
        `sim-pending-escotista-${ramo}-1${TEST_EMAIL_SUFFIX}`,
        spec.pendingEscotista,
        {
          role: "escotista",
          escotistaRamos: [ramo],
          isAdmin: false,
          membershipStatus: "pending",
          onboardingComplete: true,
          groupId: group._id,
        },
      );
      pendingRequests++;
    }

    // 3. Scouts.
    const perStage: Record<string, number> = {};
    for (const s of rules.etapas) perStage[s.id] = 0;
    const created: {
      doc: Doc<"users">;
      spec: ScoutSpec;
      effectiveBlocks: number;
      sampleApprovedActionId?: string;
      nextActionId?: string;
    }[] = [];

    for (let i = 0; i < spec.scouts.length; i++) {
      const sc = spec.scouts[i]!;
      const doc = await createUser(
        `sim-troop-${ramo}-${i + 1}${TEST_EMAIL_SUFFIX}`,
        sc.name,
        {
          role: "escoteiro",
          ramo,
          membershipStatus: "approved",
          onboardingComplete: true,
          groupId: group._id,
        },
      );

      for (const past of sc.history ?? []) {
        await fullyCompleteRamo(ctx, doc._id, past, approver._id, now - 400 * DAY_MS);
      }

      const completed = completedBlocosFor(order, sc.blocks, i);
      const completedIds = new Set(completed.map((b) => b.id));
      let sampleApprovedActionId: string | undefined;
      for (const [ordinal, bloco] of completed.entries()) {
        // Spread completedAt over past weeks so detail views look lived-in.
        const at = now - (completed.length - ordinal) * 9 * DAY_MS;
        const ids = [
          ...bloco.fixedActions.map((a) => a.id),
          ...variableIdsFor(bloco, i, ordinal),
        ];
        sampleApprovedActionId = ids[0] ?? sampleApprovedActionId;
        await insertActionRows(ctx, doc._id, ids, "approved", approver._id, at);
      }

      // Especialidade work; an earned one completes its bloco (the
      // especialidade satisfies the variable section — the bloco's fixed
      // ações still need approval).
      let specialtyBlocoId: string | undefined;
      let effectiveBlocks = completed.length;
      if (sc.specialty) {
        const target = pickTarget(targets, completedIds, i);
        if (sc.specialty === "earned" || sc.specialty === "level2") {
          await insertActionRows(
            ctx,
            doc._id,
            target.bloco.fixedActions.map((a) => a.id),
            "approved",
            approver._id,
            now - 3 * DAY_MS,
          );
          specialtyBlocoId = target.bloco.id;
          effectiveBlocks += 1;
        }
        if (ramoGroupForRamo(ramo) === "younger") {
          await insertYoungerSpecialty(ctx, doc._id, target.id, sc.specialty, approver._id, now);
        } else {
          await insertOlderSpecialty(ctx, doc._id, target.id, sc.specialty, approver._id, now);
        }
      }

      if (sc.irr) {
        await insertIrr(ctx, doc._id, ramo, sc.irr, approver._id, now);
      }

      // Frontier bloco for pendings / partials / ações personalizadas / plano.
      const nextBloco = order.find(
        (b) => !completedIds.has(b.id) && b.id !== specialtyBlocoId,
      );
      let nextActionId: string | undefined;
      if (nextBloco) {
        nextActionId =
          nextBloco.fixedActions[0]?.id ?? nextBloco.variableActions[0]?.id;
        if (sc.partialNext) {
          const need = Math.min(
            nextBloco.variableRequired,
            nextBloco.variableActions.length,
          );
          const ids = [
            ...nextBloco.fixedActions.map((a) => a.id),
            ...variableIdsFor(nextBloco, i, 0).slice(0, Math.max(0, need - 1)),
          ];
          await insertActionRows(ctx, doc._id, ids, "approved", approver._id, now - DAY_MS);
        }
        if (sc.pendingActions) {
          const pool = [
            ...nextBloco.fixedActions,
            ...nextBloco.variableActions,
          ].map((a) => a.id);
          await insertActionRows(
            ctx,
            doc._id,
            pool.slice(0, sc.pendingActions),
            "pending",
            approver._id,
            now,
          );
        }
      }

      let customId: Id<"customActions"> | undefined;
      if (sc.custom && nextBloco) {
        customId = await ctx.db.insert("customActions", {
          userId: doc._id,
          ramo,
          blocoId: nextBloco.id,
          text: `Projeto pessoal: organizar uma atividade de ${nextBloco.name.toLowerCase()} para a seção`,
          completed: true,
          createdAt: now - 2 * DAY_MS,
          status: sc.custom,
          approvedBy: sc.custom === "approved" ? approver._id : undefined,
          approvedAt: sc.custom === "approved" ? now - DAY_MS : undefined,
        });
      }

      if (sc.plan) {
        const keys: string[] = [];
        if (nextBloco) {
          const variable =
            nextBloco.variableActions[
              i % Math.max(1, nextBloco.variableActions.length)
            ];
          if (variable) keys.push(`action:${variable.id}`);
          const fixed = nextBloco.fixedActions[0];
          if (fixed) keys.push(`action:${fixed.id}`);
        }
        const planTarget = targets[(i + 1) % targets.length]!;
        keys.push(`specialty:${planTarget.bloco.id}:${planTarget.name}`);
        if (customId) keys.push(`custom:${customId}`);
        for (const [position, itemKey] of keys.entries()) {
          await ctx.db.insert("plannedItems", {
            userId: doc._id,
            ramo,
            itemKey,
            position,
          });
        }
      }

      const stageId = getCurrentStage(effectiveBlocks, ramo).id;
      perStage[stageId] = (perStage[stageId] ?? 0) + 1;
      created.push({
        doc,
        spec: sc,
        effectiveBlocks,
        sampleApprovedActionId,
        nextActionId,
      });
    }

    // 4. Synthetic events — a representative feed, consistent with the rows
    // above (direct inserts bypass mutation-side event emission). Timestamps
    // cluster at seed time; _creationTime cannot be backdated.
    let events = 0;
    for (const c of created.slice(0, 2)) {
      await logGroupEvent(ctx, {
        type: "memberJoin",
        actor: c.doc,
        subject: c.doc,
        groupId: group._id,
        summary: "Entrou no grupo",
      });
      events++;
    }
    const secondEtapa = rules.etapas[1];
    const leveled = created.filter(
      (c) =>
        secondEtapa !== undefined &&
        c.effectiveBlocks >= secondEtapa.blocksRequired &&
        !c.spec.irr,
    );
    for (const c of leveled.slice(-4)) {
      const stage = getCurrentStage(c.effectiveBlocks, ramo);
      await logRamoEvent(ctx, {
        type: "levelUp",
        actor: approver,
        subject: c.doc,
        summary: `Subiu para ${stage.name}`,
        stageId: stage.id,
        stageName: stage.name,
      });
      events++;
    }
    for (const c of created.filter((x) => x.spec.irr === "full")) {
      await logRamoEvent(ctx, {
        type: "lisDeOuro",
        actor: approver,
        subject: c.doc,
        summary: `Conquistou a ${rules.irr.name}`,
      });
      events++;
    }
    const withActions = created.filter((c) => c.sampleApprovedActionId);
    for (const c of withActions.slice(0, 3)) {
      await logRamoEvent(ctx, {
        type: "approval",
        actor: approver,
        subject: c.doc,
        summary: `Aprovou: ${describeCompletion(ramo, "action", { actionId: c.sampleApprovedActionId })}`,
      });
      events++;
    }
    const rejected = created.find((c) => c.nextActionId);
    if (rejected) {
      await logRamoEvent(ctx, {
        type: "rejection",
        actor: approver,
        subject: rejected.doc,
        summary: `Rejeitou: ${describeCompletion(ramo, "action", { actionId: rejected.nextActionId })}`,
      });
      events++;
    }

    return {
      scouts: created.length,
      escotistas: escotistas.length,
      pendingRequests,
      perStage,
      events,
    };
  },
});

/** Wipe + reseed the whole simulated troop across all four ramos. The staging
 * entry point (`bun run staging:seed`). Split into one mutation per ramo so no
 * single transaction approaches Convex's write limits. */
export const seedSimulatedTroop = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    wipedUsers: number;
    perRamo: Record<string, SimRamoSummary>;
  }> => {
    assertTestEnv();
    const wiped: { deletedUsers: number; deletedRows: number } =
      await ctx.runMutation(internal.testing.wipeSimUsers, {});
    const perRamo: Record<string, SimRamoSummary> = {};
    for (const ramo of RAMOS) {
      perRamo[ramo] = await ctx.runMutation(internal.testing.seedSimRamo, {
        ramo,
      });
    }
    return { wipedUsers: wiped.deletedUsers, perRamo };
  },
});
