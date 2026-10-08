/**
 * Test personas are ordinary contas gerenciadas (see CONTEXT.md): they sign in
 * through the same `managed` provider and form as real members, so e2e runs
 * exercise the production login path. Pure rules shared by `convex/testing.ts`
 * and the Playwright suite — no database access.
 *
 * Every test registro lives in the reserved `99xxxxx` range; that prefix is
 * what marks a user as test data for the wipes.
 *   990NNNN  canonical catalog personas
 *   99RK0NN  simulated troop — R ramo (1-4), K kind (1-4), NN index (01-99)
 */

export const TEST_SCOUT_ID_PREFIX = "99";

/** Fallback when TEST_AUTH_PASSWORD is unset (local dev, staging default). */
export const DEFAULT_TEST_PASSWORD = "paxtools-test-only";

export const CANONICAL_SCOUT_IDS = {
  admin: "9900001",
  escotista: "9900002",
  escotista_pending: "9900003",
  escoteiro_pending: "9900004",
  escoteiro_approved: "9900005",
  escoteiro_with_progression: "9900006",
  escoteiro_lobinho: "9900007",
  escoteiro_onboarding_incomplete: "9900008",
  onboarding_m13: "9900009",
  banned_user: "9900010",
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
  return `${TEST_SCOUT_ID_PREFIX}${SIM_RAMO_DIGIT[ramo]}${SIM_KIND_DIGIT[kind]}${String(n).padStart(3, "0")}`;
}

export function isTestScoutId(scoutId: string | undefined): boolean {
  return scoutId?.startsWith(TEST_SCOUT_ID_PREFIX) ?? false;
}

/** Sim personas are the test registros outside the canonical `990NNNN` block. */
export function isSimScoutId(scoutId: string | undefined): boolean {
  return isTestScoutId(scoutId) && scoutId![2] !== "0";
}

/**
 * The 7-digit form of a pre-hotfix 6-digit test registro: a zero inserted
 * after the first four digits (990001 → 9900001, 99RKNN → 99RK0NN), matching
 * the layout above. Used once by `migrations:testRegistrosToSevenDigits`.
 */
export function widenLegacyTestScoutId(scoutId: string): string | null {
  if (!/^99\d{4}$/.test(scoutId)) return null;
  return `${scoutId.slice(0, 4)}0${scoutId.slice(4)}`;
}
