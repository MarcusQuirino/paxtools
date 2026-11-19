/**
 * Per-persona Playwright fixtures.
 *
 * Each `*Test` signs its persona (tests/utils/personas.ts) in afresh per test,
 * locating the deployment via the storageState captured by
 * `tests/e2e/global.setup.ts`. Specs import
 * the persona they need:
 *
 *   import { adminTest as test, expect } from "../../fixtures/auth";
 *   test("admin sees pending list", async ({ page }) => { ... });
 *
 * For sim-troop personas use `testAs(slug)`:
 *
 *   const test = testAs("sim-troop-escoteiro-4");
 *
 * Cross-role specs (escoteiro acts → escotista approves) should instead use
 * the plain `test` with multiple `browser.newContext({ storageState })` —
 * see m03-reject-flow.spec.ts for the canonical two-context pattern.
 */

import { test as base } from "@playwright/test";
import { personaBySlug } from "../utils/personas";
import { freshStorageState } from "../utils/fresh-session";

/**
 * Each test gets its OWN session for the persona (see fresh-session.ts):
 * sharing the captured storageState across parallel contexts lets Convex
 * Auth's refresh-token reuse detection revoke the session mid-run.
 */
export function testAs(slug: string): typeof base {
  personaBySlug(slug); // fail fast on a slug missing from the manifest
  return base.extend({
    // oxlint-disable-next-line no-empty-pattern -- Playwright fixture signature
    storageState: async ({}, use) => {
      await use(await freshStorageState(slug));
    },
  });
}

export const adminTest = testAs("admin");
export const escotistaTest = testAs("escotista");
export const escotistaPendingTest = testAs("escotista-pending");
export const pendingTest = testAs("escoteiro-pending");
export const approvedTest = testAs("escoteiro-approved");
export const progressionTest = testAs("escoteiro-with-progression");
export const lobinhoTest = testAs("escoteiro-lobinho");
export const onboardingTest = testAs("escoteiro-onboarding-incomplete");
export const bannedTest = testAs("banned-user");

export { expect } from "@playwright/test";
