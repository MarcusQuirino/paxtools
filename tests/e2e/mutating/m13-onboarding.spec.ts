/**
 * M13 — Full onboarding completion via the JOIN-GROUP path (issue #58, story 52).
 *
 * Persona: `onboarding-m13` (onboarding-m13@test.paxtools.local), a DEDICATED
 * onboarding persona owned solely by this spec (see tests/utils/personas.ts).
 * It starts not-onboarded (role=null, onboardingComplete=false, no group).
 *
 * Retry-safety: `resetOnboardingUser` patches ONLY this persona's row back to
 * the not-onboarded state (role/ramo/group cleared, onboardingComplete=false)
 * WITHOUT recreating the user, so the captured session stays valid. Running it
 * in beforeEach makes the spec idempotent across retries and back-to-back runs.
 *
 * Flow under test (src/routes/onboarding.tsx):
 *   role (Escoteiro) → ramo (Escoteiro) → JOIN the test group (99999 / TESTQA).
 * The wizard calls setRole → setEscoteiroRamo → joinGroup → completeOnboarding,
 * then navigates an escoteiro to "/". Unlike the old skip-path spec, this covers
 * the group-join branch (joinGroup sets membershipStatus="pending").
 *
 * End state: onboarding-m13 is a PENDING member of the test group, sitting on
 * the dashboard. Next run's resetOnboardingUser restores the not-onboarded row;
 * the teardown reseed covers everything else. This spec owns only this persona's
 * row and never asserts the group name (that is M17's exclusively-owned data).
 */

import { testAs, expect } from "../../fixtures/auth";
import { resetOnboardingUser } from "../../utils/convex-cli";

const M13_EMAIL = "onboarding-m13@test.paxtools.local";
const GROUP_PASSWORD = "TESTQA";

const test = testAs("onboarding-m13");

test.beforeEach(async () => {
  // Reset ONLY this persona → not-onboarded. Session row is patched, not
  // recreated, so the captured storageState remains valid afterwards.
  await resetOnboardingUser(M13_EMAIL);
});

test("escoteiro completes onboarding via role → ramo → join group", async ({
  page,
}) => {
  test.setTimeout(60_000);

  // Any route forces a not-onboarded user to the wizard.
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });

  // Step 1 — role. The two cards are "Escoteiro" and "Escotista"; only the
  // first contains the substring "Escoteiro".
  await page.getByRole("button", { name: /Escoteiro/i }).first().click();

  // Step 2 — ramo. Pick the Escoteiro ramo (accessible name "Escoteiro 11 a
  // 14 anos"), then continue.
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await page.getByRole("button", { name: /Escoteiro/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 3 — group. JOIN the test group with its invite code (the input
  // upper-cases input; the button reads "Entrar no grupo").
  const codeInput = page.getByPlaceholder(/Código do grupo/i);
  await expect(codeInput).toBeVisible();
  await codeInput.fill(GROUP_PASSWORD);
  await page.getByRole("button", { name: /Entrar no grupo/i }).click();

  // Landed off the wizard and off signin. joinGroup sets the escoteiro to
  // membershipStatus="pending"; per an R1 finding the product currently routes
  // a PENDING escoteiro to the dashboard "/" (no dedicated waiting screen), so
  // we assert that ACTUAL behavior rather than an aspirational waiting page.
  await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/signin/);
  await expect(page).toHaveURL(/localhost:3000\/$/);
});
