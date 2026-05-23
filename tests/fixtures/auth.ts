/**
 * Per-role Playwright fixtures.
 *
 * Each `*Test` reuses the storageState captured by `tests/e2e/global.setup.ts`
 * for the corresponding catalog slug. Specs import the role they need:
 *
 *   import { adminTest as test, expect } from "../fixtures/auth";
 *   test("admin sees pending list", async ({ page }) => { ... });
 *
 * Slug ↔ filename mapping must match `tests/utils/catalog.ts`.
 */

import { test as base } from "@playwright/test";

const STATE = (slug: string) => ({ storageState: `tests/.auth/${slug}.json` });

export const adminTest = base.extend(STATE("admin"));
export const escotistaTest = base.extend(STATE("escotista"));
export const escotistaPendingTest = base.extend(STATE("escotista-pending"));
export const pendingTest = base.extend(STATE("escoteiro-pending"));
export const approvedTest = base.extend(STATE("escoteiro-approved"));
export const progressionTest = base.extend(STATE("escoteiro-with-progression"));
export const lobinhoTest = base.extend(STATE("escoteiro-lobinho"));
export const onboardingTest = base.extend(STATE("escoteiro-onboarding-incomplete"));
export const bannedTest = base.extend(STATE("banned-user"));

export { expect } from "@playwright/test";
