/**
 * Single source of truth for the test user catalog.
 *
 * Mirrors section 3 of `docs/qa/infra-plan.md`. The Convex `testing:seedTestUsers`
 * mutation must produce these rows. Playwright `global.setup.ts` and
 * `tests/fixtures/auth.ts` iterate this list to create storageState files keyed
 * by `slug`.
 *
 * Every `email` MUST end with `@test.paxtools.local`.
 */

export type TestUserRole = "escotista" | "escoteiro" | null;
export type TestUserRamo = "lobinho" | "escoteiro" | "senior" | "pioneiro" | null;
export type TestUserMembershipStatus = "pending" | "approved" | null;

export interface TestUserCatalogEntry {
  /** Stable slug used as the filename for storageState (tests/.auth/<slug>.json). */
  readonly slug: string;
  /** Must end in `@test.paxtools.local`. */
  readonly email: string;
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
    email: "admin@test.paxtools.local",
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
    email: "escotista@test.paxtools.local",
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
    email: "escotista-pending@test.paxtools.local",
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
    email: "pending@test.paxtools.local",
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
    email: "approved@test.paxtools.local",
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
    email: "progression@test.paxtools.local",
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
    email: "lobinho@test.paxtools.local",
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
    email: "onboarding@test.paxtools.local",
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
    email: "banned@test.paxtools.local",
    role: "escoteiro",
    membershipStatus: null,
    ramo: null,
    isAdmin: false,
    escotistaRamos: [],
    onboardingComplete: false,
    hasGroup: false,
    bannedAt: true,
  },
] as const satisfies readonly TestUserCatalogEntry[];

export type CatalogSlug = (typeof CATALOG)[number]["slug"];
