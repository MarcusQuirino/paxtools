# Paxtools E2E Test Infrastructure — Phase 2 Design

Locked decisions (do not re-litigate): tests share the user's **dev** Convex deployment; a test-only credentials provider is added env-gated by `TEST_AUTH=1`; Playwright auto-starts `bun dev` via `webServer`; **local only, no CI**.

This document is the contract Phase 2 implementers must follow.

---

## 1. Test data identification convention

**Single marker: user email matches the regex `/^.+@test\.paxtools\.local$/`.** A `users` row is "test data" iff `email` matches that pattern. Everything else is tagged by traversal from a test user.

Why: `users.email` is already indexed (`email` index) — cheap to filter; `.test.paxtools.local` is a reserved-style subdomain that cannot collide with a real Google account; one auditable predicate (`endsWith("@test.paxtools.local")`).

Other tables are tagged by **derivation, not by string prefix**:

| Table | Test predicate |
|---|---|
| `users` | `email` ends with `@test.paxtools.local` |
| `groups` | `name` starts with `__TEST__` **AND** `createdBy` resolves to a test user |
| `actionCompletions`, `specialtyCompletions`, `customActions`, `lisDeOuroCompletions`, `plannedItems` | `userId` resolves to a test user |
| `authAccounts`, `authSessions`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers` (from `authTables`) | `userId` / `accountId` chains back to a test user |

`__TEST__` group-name prefix is a **belt-and-suspenders second check** so a wipe with a buggy email predicate still can't nuke a real group. Both conditions must hold for a group row to be considered test data.

---

## 2. Convex testing module — `convex/testing.ts`

All exports are `internalMutation` / `internalQuery`. None are public. Every handler gates on `process.env.TEST_AUTH === "1"` and throws otherwise.

```ts
// convex/testing.ts
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const TEST_EMAIL_SUFFIX = "@test.paxtools.local";
const TEST_GROUP_PREFIX = "__TEST__";

function assertTestEnv() {
  if (process.env.TEST_AUTH !== "1") {
    throw new Error("convex/testing is disabled (TEST_AUTH != 1)");
  }
}

function isTestUser(u: Doc<"users">): boolean {
  return typeof u.email === "string" && u.email.endsWith(TEST_EMAIL_SUFFIX);
}

export const wipeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertTestEnv();

    // 1. Collect test users (single source of truth).
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter(isTestUser);
    const testUserIds = new Set(testUsers.map((u) => u._id));

    // 2. Collect test groups: prefix AND createdBy is a test user.
    const allGroups = await ctx.db.query("groups").collect();
    const testGroups = allGroups.filter(
      (g) => g.name.startsWith(TEST_GROUP_PREFIX) && testUserIds.has(g.createdBy),
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
          .withIndex("by_userId", (q) => q.eq("userId", uid as Id<"users">))
          .collect();
        for (const r of rows) {
          await ctx.db.delete(r._id);
          deletedRows++;
        }
      }
    }

    // 4. Auth tables — delete any row whose userId is a test user.
    for (const table of ["authAccounts", "authSessions", "authRefreshTokens"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) {
        if (testUserIds.has((r as { userId: Id<"users"> }).userId)) {
          await ctx.db.delete(r._id);
          deletedRows++;
        }
      }
    }

    // 5. Groups, then users — last, so FK-like checks above still resolve.
    for (const g of testGroups) await ctx.db.delete(g._id);
    for (const u of testUsers) await ctx.db.delete(u._id);

    return {
      deletedUsers: testUsers.length,
      deletedGroups: testGroups.length,
      deletedRows,
    };
  },
});

export const seedTestUsers = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ users: Record<string, Id<"users">>; groupId: Id<"groups"> }> => {
    assertTestEnv();
    // Idempotent: lookup-or-insert each row by email; ensure final field state matches the catalog.
    // Pseudocode:
    //   for each entry in TEST_USER_CATALOG:
    //     existing = db.query("users").withIndex("email", q => q.eq("email", entry.email)).unique()
    //     id = existing?._id ?? await db.insert("users", { email, name, ... })
    //     patch(id, desired-fields)  // re-applies role/ramo/onboardingComplete/etc.
    //   group: lookup-or-insert by name "__TEST__ Grupo QA" with createdBy = admin user id.
    //   patch all members with groupId + membershipStatus per catalog.
    //   For escoteiro_with_progression: ensure N rows in actionCompletions exist (idempotent via index).
    return /* { users: {...}, groupId } */ {} as never;
  },
});

export const getTestUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    assertTestEnv();
    if (!email.endsWith(TEST_EMAIL_SUFFIX)) throw new Error("not a test email");
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});
```

**Predicate invariant**: a row is deletable only if (a) it is a `users` row whose `email` ends with `@test.paxtools.local`, or (b) a `groups` row with name prefix `__TEST__` whose `createdBy` is in the test-user set, or (c) a child row whose `userId` is in the test-user set. Anything else MUST be untouched.

---

## 3. Test user catalog

All emails end with `@test.paxtools.local`. The seed creates exactly one group `__TEST__ Grupo QA` (number `99999`, password `TESTQA`) created by `admin`.

| slug | email | role | groupId | membershipStatus | other state | scenarios covered |
|---|---|---|---|---|---|---|
| `admin` | `admin@test.paxtools.local` | escotista | testGroup | approved | `isAdmin=true`, `escotistaRamos=["escoteiro"]`, onboardingComplete | admin-only flows: approve, ban, role change, delete group, edit ramo names |
| `escotista` | `escotista@test.paxtools.local` | escotista | testGroup | approved | `isAdmin=false`, `escotistaRamos=["escoteiro","senior"]`, onboardingComplete | non-admin escotista: view members, approve progression items, no admin tools |
| `escotista_pending` | `escotista-pending@test.paxtools.local` | escotista | testGroup | pending | `isAdmin=false`, `escotistaRamos=["escoteiro"]`, onboardingComplete | escotista pending screen; admin approves pending escotista; `getMyGroup` hides password from pending escotistas |
| `escoteiro_pending` | `pending@test.paxtools.local` | escoteiro | testGroup | pending | `ramo=escoteiro`, onboardingComplete | pending approval gate; appears in admin pending list |
| `escoteiro_approved` | `approved@test.paxtools.local` | escoteiro | testGroup | approved | `ramo=escoteiro`, onboardingComplete, no completions | clean-slate progression view, can check items |
| `escoteiro_with_progression` | `progression@test.paxtools.local` | escoteiro | testGroup | approved | `ramo=escoteiro`, onboardingComplete, ~5 `actionCompletions` (mix `pending`/`approved`), 1 starred plan item | locked-approved-item rule, approval list, "Por Area" view |
| `escoteiro_lobinho` | `lobinho@test.paxtools.local` | escoteiro | testGroup | approved | `ramo=lobinho`, onboardingComplete | `ComingSoon` panel for non-escoteiro ramo; ramo-scoped visibility filter (must NOT appear to a non-admin escotista whose `escotistaRamos` excludes `lobinho`) |
| `escoteiro_onboarding_incomplete` | `onboarding@test.paxtools.local` | (unset) | undefined | undefined | `onboardingComplete` falsy, no role | onboarding redirect, role/ramo selection, group join via password; **also covers escotista-creates-group flow** (test sets `role=escotista` mid-flow) |
| `banned_user` | `banned@test.paxtools.local` | escoteiro | undefined | undefined | `bannedAt` set, `bannedBy=admin._id` | ban gate (`getAuthenticatedUser` throws), cannot rejoin |

Justification per row:
- `admin`: only writer of admin mutations (`assertAdmin` gate).
- `escotista`: non-admin escotista — sees members, approves progression, no admin tools.
- `escotista_pending`: required by test-plan P0 "Escotista who joined sits on pending screen" and admin-P0 "approve pending escotista". Distinct from `escoteiro_pending` because the pending-screen UI and approval mutation behave differently per role.
- `escoteiro_pending`: exercises pending UI and admin pending list without mutating others mid-run.
- `escoteiro_approved`: default scoutee for tests that don't care about state.
- `escoteiro_with_progression`: only state with content for lock-after-approval, approval list, and "Por Area" view.
- `escoteiro_lobinho`: required by escoteiro-P1 "non-escoteiro ramo sees ComingSoon" AND escotista-P0 "only sees escoteiros in assigned ramos". A `ramo=lobinho` member in the test group is the only way to assert the negative case (lobinho row must NOT appear in a non-admin escotista's dashboard whose `escotistaRamos=["escoteiro"]`).
- `escoteiro_onboarding_incomplete`: exercises `/onboarding` and `joinGroup`. Also covers "escotista creates a new group" by selecting `escotista` role mid-onboarding. Tests that mutate this user must end with `seedTestUsers` to re-patch fields back to empty.
- `banned_user`: asserts the `bannedAt` short-circuit in `getAuthenticatedUser`.

---

## 4. Test-credentials provider design

Use `Password` from `@convex-dev/auth/providers/Password`, **wrapped behind a `TEST_AUTH` env gate**, alongside the existing `Google` provider. A custom credentials provider that auto-creates users is rejected: it would bypass the canonical seed and let any test produce un-tagged auth rows.

```ts
// convex/auth.ts
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const TEST_AUTH_ENABLED = process.env.TEST_AUTH === "1";

// Single fixed password for ALL seeded test users. Local dev only.
// Production guard: this provider is not in the array unless TEST_AUTH=1.
const TestPassword = Password({
  id: "test-password",
  profile(params) {
    const email = params.email as string;
    if (!email.endsWith("@test.paxtools.local")) {
      throw new Error("test-password provider only accepts @test.paxtools.local");
    }
    return { email, name: email.split("@")[0] };
  },
  // Verify password is the shared test secret. Reject signups; the seed
  // mutation creates users, this provider only signs them in.
  verify: async ({ password }) => password === process.env.TEST_AUTH_PASSWORD,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: TEST_AUTH_ENABLED ? [Google, TestPassword] : [Google],
});
```

Notes: Google sign-in is unaffected (`[Google]` always present); production builds set `TEST_AUTH=""` so the array shrinks to `[Google]` and the provider isn't registered; `TEST_AUTH_PASSWORD` (e.g. `paxtools-test-only`) is not a security boundary because the provider only accepts test emails, which only exist on dev.

Production guard mechanism (defense in depth):
1. `convex/auth.ts` excludes the provider when `TEST_AUTH !== "1"`.
2. `profile()` rejects non-test emails.
3. `convex/testing.ts` mutations throw if `TEST_AUTH !== "1"`.
4. Phase 2 must add a unit test asserting that `import("./auth")` with `TEST_AUTH` unset produces a providers array of length 1.

---

## 5. Playwright config — `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,   // shared dev backend — keep serial
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "bun dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      TEST_AUTH: "1",
      VITE_TEST_AUTH: "1",
      TEST_AUTH_PASSWORD: process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
```

Key choices: `reuseExistingServer: true` (don't fight Convex codegen); `workers: 1` (shared backend); separate `setup` project produces storageState; `retries: 0` — flake must be diagnosed.

---

## 6. Auth via storageState — fixtures pattern

### `tests/e2e/global.setup.ts`

Runs once before any chromium test: (1) invoke `bunx convex run testing:seedTestUsers` via `Bun.spawn` (argv array — no shell interpolation); (2) for each role slug, sign in via the `test-password` provider and write `tests/.auth/<slug>.json`. Capture `escoteiro_onboarding_incomplete` too so tests can start authenticated-but-unconfigured.

```ts
// tests/e2e/global.setup.ts
import { test as setup, expect } from "@playwright/test";
import { CATALOG } from "../utils/catalog";

setup("seed + auth state", async ({ browser }) => {
  const proc = Bun.spawn(["bunx", "convex", "run", "testing:seedTestUsers"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error("seed failed with exit " + code);

  for (const u of CATALOG) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/signin");
    // Hidden test-only sign-in form mounted only when import.meta.env.VITE_TEST_AUTH === "1".
    await page.getByTestId("test-signin-email").fill(u.email);
    await page.getByTestId("test-signin-password").fill(process.env.TEST_AUTH_PASSWORD!);
    await page.getByTestId("test-signin-submit").click();
    await expect(page).toHaveURL(/\/(onboarding|$|plan)/);
    await ctx.storageState({ path: `tests/.auth/${u.slug}.json` });
    await ctx.close();
  }
});
```

A small test-only sign-in form must be conditionally rendered in `src/routes/signin.tsx` behind `import.meta.env.VITE_TEST_AUTH === "1"`. The component calls `useAuthActions().signIn("test-password", { email, password, flow: "signIn" })`.

### `tests/fixtures/auth.ts`

```ts
import { test as base } from "@playwright/test";

const STATE = (slug: string) => ({ storageState: `tests/.auth/${slug}.json` });

// Per-role test object — each spec imports the one it needs.
export const adminTest = base.extend(STATE("admin"));
export const escotistaTest = base.extend(STATE("escotista"));
export const escotistaPendingTest = base.extend(STATE("escotista-pending"));
export const pendingTest = base.extend(STATE("escoteiro-pending"));
export const approvedTest = base.extend(STATE("escoteiro-approved"));
export const progressionTest = base.extend(STATE("escoteiro-with-progression"));
export const lobinhoTest = base.extend(STATE("escoteiro-lobinho"));
export const onboardingTest = base.extend(STATE("escoteiro-onboarding-incomplete"));
export const bannedTest = base.extend(STATE("banned-user"));
```

Spec usage:
```ts
import { adminTest as test, expect } from "../fixtures/auth";
test("admin sees pending list", async ({ page }) => { /* ... */ });
```

---

## 7. Directory layout

```
tests/
  e2e/
    global.setup.ts          # seeds + captures storageState per role
    admin/                   # specs grouped by primary actor
    escotista/
    escoteiro/
    onboarding/
  utils/
    catalog.ts               # exports CATALOG (single source of truth for slugs/emails)
    convex-cli.ts            # wrappers around `bunx convex run testing:*` via Bun.spawn
    selectors.ts             # shared data-testid constants
  fixtures/
    auth.ts                  # per-role storageState fixtures
  .auth/                     # gitignored; storageState JSON per role
scripts/
  test-e2e-seed.ts           # runs testing:seedTestUsers
  test-e2e-wipe.ts           # runs testing:wipeTestData
  test-e2e-reset.ts          # wipe then seed
docs/qa/
  infra-plan.md              # this file
```

Add `tests/.auth/` to `.gitignore`.

---

## 8. `package.json` scripts to add

```jsonc
{
  "scripts": {
    "test:e2e":       "TEST_AUTH=1 playwright test",
    "test:e2e:ui":    "TEST_AUTH=1 playwright test --ui",
    "test:e2e:seed":  "TEST_AUTH=1 bunx convex run testing:seedTestUsers",
    "test:e2e:wipe":  "TEST_AUTH=1 bunx convex run testing:wipeTestData",
    "test:e2e:reset": "bun run test:e2e:wipe && bun run test:e2e:seed"
  }
}
```

Phase 2 installs `@playwright/test` as a devDependency via `bun add -d @playwright/test` and runs `bunx playwright install chromium` once.

---

## 9. Test-data lifecycle in a run

**Recommendation: leave-in-place across runs; seed is idempotent.**

Per run: (1) `global.setup.ts` calls `testing:seedTestUsers` (idempotent — re-applies field state, re-creates missing rows, never wipes); (2) specs run serially; (3) specs that mutate shared state (ban, promote, role change) MUST end with a cleanup step that calls `testing:seedTestUsers` to re-patch fields; (4) no wipe at end of normal runs. Manual `bun run test:e2e:reset` is the escape hatch when a crashed spec left orphans.

Rationale: wiping every run is slow and forces re-issuance of auth tokens. Idempotent seed + occasional reset is faster and equally safe.

---

## 10. Risks of sharing the dev deployment + mitigations

| Risk | Mitigation |
|---|---|
| **Wipe predicate has a bug and deletes real data.** | Two-layer predicate: `users` by email suffix, `groups` by `__TEST__` prefix AND `createdBy` in `testUsers`. Child rows only via `userId` in `testUsers`. The mutation must include a unit test (below). |
| Developer's real Google account happens to use `@test.paxtools.local`. | Impossible — not a public-DNS TLD, Google won't issue accounts there. The suffix check is sound. |
| Test writes leak into developer's real working state mid-run (e.g. dev is logged in as themselves while tests mutate group). | `workers: 1` + warning in README that tests share the dev backend. Developer-facing flows operate on their own (Google) account; tests only mutate `@test.paxtools.local` rows. |
| A spec uses a non-seeded email and the test-password provider creates an un-tagged user. | The `profile()` callback rejects any email not ending in `@test.paxtools.local`, so the provider cannot create real-domain accounts. |
| Schema migration deletes the `email` field or stops indexing it. | Wipe mutation uses `collect()` on full table; if the `email` index disappears, the filter still works on collected rows. |
| `escoteiro_with_progression` mutated by another spec mid-run, breaking ordering assumptions. | Serial execution (`workers: 1`); each spec re-seeds at start if it relies on a clean slate. |
| Test deployment URL accidentally pointed at prod Convex. | `convex/testing.ts` gates every mutation on `TEST_AUTH === "1"`. The user must never set this in their prod env. Document loudly in the README. |

**Wipe-mutation invariant unit test (Phase 2 must add):**

```ts
// In a bun test against a temporary deployment OR via convex-test:
// Seed: one test user "a@test.paxtools.local" and one real user "real@gmail.com".
// Run: testing:wipeTestData.
// Assert: db.query("users").collect() returns exactly the real user.
// One-line invariant: every surviving users row must NOT match the test-email regex.
```

---

## 11. What Phase 2 implementers must NOT do

1. **Do not weaken the wipe predicate to make a test pass.** If a test needs a row outside the test set, the test is wrong — fix the test, not the predicate.
2. **Do not commit `tests/.auth/*.json`.** They contain session tokens. `.gitignore` must include `tests/.auth/`.
3. **Do not register the `test-password` provider unconditionally.** It must be inside the `TEST_AUTH_ENABLED` branch in `convex/auth.ts`.
4. **Do not remove the `TEST_AUTH` env check from `convex/testing.ts` mutations.** Every handler starts with `assertTestEnv()`.
5. **Do not relax the `profile()` email-suffix check** in the test provider — it is the last line of defense.
6. **Do not parallelize Playwright workers** while the dev deployment is shared. If parallelism is needed, the design must change to per-worker deployments first.
7. **Do not add tests that depend on real Google accounts.** All authenticated specs use storageState from the catalog.
8. **Do not use ad-hoc `bunx convex run` paths in specs** — go through `scripts/test-e2e-*.ts` or `tests/utils/convex-cli.ts` so future deployment-isolation work has a single place to edit.
9. **Do not skip the wipe-invariant unit test.** It is the only thing standing between a typo and data loss.
10. **Do not seed inside individual specs by reaching into Convex directly.** Always go through `testing:seedTestUsers` or a helper exported from `convex/testing.ts`.

---

End of plan.
