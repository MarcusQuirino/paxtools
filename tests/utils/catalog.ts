/**
 * Single source of truth for the test user catalog.
 *
 * Mirrors section 3 of `docs/qa/infra-plan.md`. The Convex `testing:seedTestUsers`
 * mutation must produce these rows. Playwright `global.setup.ts` and
 * `tests/fixtures/auth.ts` iterate this list to create storageState files keyed
 * by `slug`.
 *
 * Every persona is a conta gerenciada; `scoutId` is its registro in the
 * reserved test range (`convex/lib/testAccounts.ts`).
 */

import { CANONICAL_SCOUT_IDS } from "../../convex/lib/testAccounts";

export type TestUserRole = "escotista" | "escoteiro" | null;
export type TestUserRamo = "lobinho" | "escoteiro" | "senior" | "pioneiro" | null;
export type TestUserMembershipStatus = "pending" | "approved" | null;

export interface TestUserCatalogEntry {
  /** Stable slug used as the filename for storageState (tests/.auth/<slug>.json). */
  readonly slug: string;
  /** Registro escoteiro the persona signs in with. */
  readonly scoutId: string;
  readonly role: TestUserRole;
  readonly membershipStatus: TestUserMembershipStatus;
  readonly ramo: TestUserRamo;
  readonly isAdmin: boolean;
  /** Only meaningful when `role === "escotista"`. */
  readonly escotistaRamos: readonly TestUserRamo[];
  readonly onboardingComplete: boolean;
  /** Whether the user belongs to the canonical `__TEST__ Grupo QA` group. */
  readonly hasGroup: boolean;
  /** Whether the user is banned (corresponds to `bannedAt` being set). */
  readonly bannedAt: boolean;
}

export const CATALOG = [
  {
    slug: "admin",
    scoutId: CANONICAL_SCOUT_IDS.admin,
    role: "escotista",
    membershipStatus: "approved",
    ramo: null,
    isAdmin: true,
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escotista",
    scoutId: CANONICAL_SCOUT_IDS.escotista,
    role: "escotista",
    membershipStatus: "approved",
    ramo: null,
    isAdmin: false,
    escotistaRamos: ["escoteiro", "senior"],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escotista-pending",
    scoutId: CANONICAL_SCOUT_IDS.escotista_pending,
    role: "escotista",
    membershipStatus: "pending",
    ramo: null,
    isAdmin: false,
    escotistaRamos: ["escoteiro"],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escoteiro-pending",
    scoutId: CANONICAL_SCOUT_IDS.escoteiro_pending,
    role: "escoteiro",
    membershipStatus: "pending",
    ramo: "escoteiro",
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escoteiro-approved",
    scoutId: CANONICAL_SCOUT_IDS.escoteiro_approved,
    role: "escoteiro",
    membershipStatus: "approved",
    ramo: "escoteiro",
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escoteiro-with-progression",
    scoutId: CANONICAL_SCOUT_IDS.escoteiro_with_progression,
    role: "escoteiro",
    membershipStatus: "approved",
    ramo: "escoteiro",
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escoteiro-lobinho",
    scoutId: CANONICAL_SCOUT_IDS.escoteiro_lobinho,
    role: "escoteiro",
    membershipStatus: "approved",
    ramo: "lobinho",
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: true,
    hasGroup: true,
    bannedAt: false,
  },
  {
    slug: "escoteiro-onboarding-incomplete",
    scoutId: CANONICAL_SCOUT_IDS.escoteiro_onboarding_incomplete,
    role: null,
    membershipStatus: null,
    ramo: null,
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: false,
    hasGroup: false,
    bannedAt: false,
  },
  {
    slug: "banned-user",
    scoutId: CANONICAL_SCOUT_IDS.banned_user,
    role: "escoteiro",
    membershipStatus: null,
    ramo: null,
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: false,
    hasGroup: false,
    bannedAt: true,
  },
  {
    // Dedicated persona owned by the M13 onboarding spec (mutating phase);
    // `escoteiro-onboarding-incomplete` above stays readonly-only.
    slug: "onboarding-m13",
    scoutId: CANONICAL_SCOUT_IDS.onboarding_m13,
    role: null,
    membershipStatus: null,
    ramo: null,
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: false,
    hasGroup: false,
    bannedAt: false,
  },
] as const satisfies readonly TestUserCatalogEntry[];

export type CatalogSlug = (typeof CATALOG)[number]["slug"];
