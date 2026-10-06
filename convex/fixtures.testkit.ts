/**
 * Shared fixtures for the Convex backend tests: one module map, the
 * identity helper, and builders for a grupo and its members.
 *
 * The file name has two dots on purpose: Convex skips such files when it
 * bundles functions, and `bun test` only runs `*.test.ts`, so this is
 * test-only code that is still type-checked with the rest of convex/.
 */
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

/**
 * Every function module, for convex-test. Bun's test runner has no
 * `import.meta.glob`, so the map is spelled out — once, here. At least one
 * "_generated/" path must be present so convex-test finds the project root.
 */
export const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./aiHelpers.ts": () => import("./aiHelpers"),
  "./approvals.ts": () => import("./approvals"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./events.ts": () => import("./events"),
  "./featureFlags.ts": () => import("./featureFlags"),
  "./groups.ts": () => import("./groups"),
  "./http.ts": () => import("./http"),
  "./onboarding.ts": () => import("./onboarding"),
  "./plan.ts": () => import("./plan"),
  "./progression.ts": () => import("./progression"),
  "./specialties.ts": () => import("./specialties"),
  "./stats.ts": () => import("./stats"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};

export type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

/** A fresh in-memory backend. */
export function newTest() {
  return convexTest(schema, modules);
}

/** The schema-typed test backend `newTest()` returns. */
export type TestConvex = ReturnType<typeof newTest>;

/**
 * Act as `userId`. `withIdentity({ subject })` makes @convex-dev/auth's
 * getAuthUserId return it (it takes the JWT subject up to the first "|").
 */
export function as(t: TestConvex, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

type UserFields = Partial<{
  name: string;
  email: string;
  role: "escoteiro" | "escotista";
  ramo: Ramo;
  escotistaRamos: Ramo[];
  groupId: Id<"groups">;
  sectionId: Id<"sections">;
  isAdmin: boolean;
  membershipStatus: "pending" | "approved";
  onboardingComplete: boolean;
  bannedAt: number;
}>;

export async function insertUser(t: TestConvex, fields: UserFields = {}) {
  return t.run(async (ctx) => ctx.db.insert("users", { name: "U", ...fields }));
}

/** A grupo created by an admin escotista — the usual starting point. */
export async function seedGrupo(
  t: TestConvex,
  opts: { adminRamos?: Ramo[]; name?: string } = {},
): Promise<{ groupId: Id<"groups">; adminId: Id<"users"> }> {
  const adminId = await insertUser(t, {
    name: "Admin",
    role: "escotista",
    escotistaRamos: opts.adminRamos ?? ["escoteiro"],
    onboardingComplete: true,
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: opts.name ?? "Grupo",
      number: "1",
      password: "AAAAAA",
      createdBy: adminId,
      createdAt: 1,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.patch(adminId, { groupId, isAdmin: true, membershipStatus: "approved" }),
  );
  return { groupId, adminId };
}

/** An approved, non-admin escotista accompanying `ramos`. */
export async function addEscotista(
  t: TestConvex,
  groupId: Id<"groups">,
  ramos: Ramo[],
  fields: UserFields = {},
) {
  return insertUser(t, {
    name: "Escotista",
    role: "escotista",
    escotistaRamos: ramos,
    groupId,
    isAdmin: false,
    membershipStatus: "approved",
    onboardingComplete: true,
    ...fields,
  });
}

/** An approved escoteiro of `ramo`. */
export async function addEscoteiro(
  t: TestConvex,
  groupId: Id<"groups">,
  ramo: Ramo = "escoteiro",
  fields: UserFields = {},
) {
  return insertUser(t, {
    name: "Escoteiro",
    role: "escoteiro",
    ramo,
    groupId,
    membershipStatus: "approved",
    onboardingComplete: true,
    ...fields,
  });
}

/** All events of type approval/rejection, oldest first. */
export async function reviewEvents(t: TestConvex) {
  const events = await t.run((ctx) => ctx.db.query("events").collect());
  return events.filter((e) => e.type === "approval" || e.type === "rejection");
}
