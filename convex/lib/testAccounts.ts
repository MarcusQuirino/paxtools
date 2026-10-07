/**
 * Test personas are ordinary contas gerenciadas (see CONTEXT.md): they sign in
 * through the same `managed` provider and form as real members, so e2e runs
 * exercise the production login path. Pure rules shared by `convex/testing.ts`
 * and the Playwright suite — no database access.
 *
 * Every test registro lives in the reserved `99xxxx` range; that prefix is
 * what marks a user as test data for the wipes.
 *   990NNN   canonical catalog personas
 *   99RKNN   simulated troop — R ramo (1-4), K kind (1-4), NN index (01-99)
 */

export const TEST_SCOUT_ID_PREFIX = "99";

/** Fallback when TEST_AUTH_PASSWORD is unset (local dev, staging default). */
export const DEFAULT_TEST_PASSWORD = "paxtools-test-only";

export const CANONICAL_SCOUT_IDS = {
  admin: "990001",
  escotista: "990002",
  escotista_pending: "990003",
  escoteiro_pending: "990004",
  escoteiro_approved: "990005",
  escoteiro_with_progression: "990006",
  escoteiro_lobinho: "990007",
  escoteiro_onboarding_incomplete: "990008",
  onboarding_m13: "990009",
  banned_user: "990010",
} as const;

export type CanonicalSlug = keyof typeof CANONICAL_SCOUT_IDS;

const SIM_RAMO_DIGIT = {
  lobinho: 1,
  escoteiro: 2,
  senior: 3,
  pioneiro: 4,
} as const;

const SIM_KIND_DIGIT = {
  troop: 1,
  escotista: 2,
  pending: 3,
  "pending-escotista": 4,
} as const;

export type SimKind = keyof typeof SIM_KIND_DIGIT;

/** Registro of the `n`th (1-based) sim persona of a kind in a ramo. */
export function simScoutId(
  ramo: keyof typeof SIM_RAMO_DIGIT,
  kind: SimKind,
  n: number,
): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new Error(`sim persona index out of range: ${n}`);
  }
  return `${TEST_SCOUT_ID_PREFIX}${SIM_RAMO_DIGIT[ramo]}${SIM_KIND_DIGIT[kind]}${String(n).padStart(2, "0")}`;
}

export function isTestScoutId(scoutId: string | undefined): boolean {
  return scoutId?.startsWith(TEST_SCOUT_ID_PREFIX) ?? false;
}

/** Sim personas are the test registros outside the canonical `990NNN` block. */
export function isSimScoutId(scoutId: string | undefined): boolean {
  return isTestScoutId(scoutId) && scoutId![2] !== "0";
}
