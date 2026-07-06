/**
 * Per-persona Playwright fixtures.
 *
 * Each `*Test` reuses the storageState captured by `tests/e2e/global.setup.ts`
 * for the corresponding manifest slug (tests/utils/personas.ts). Specs import
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
import { authFile, personaBySlug } from "../utils/personas";

export function testAs(slug: string): typeof base {
  personaBySlug(slug); // fail fast on a slug missing from the manifest
  return base.extend({ storageState: authFile(slug) });
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
