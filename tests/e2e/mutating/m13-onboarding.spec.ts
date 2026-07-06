/**
 * P0 — Onboarding completion flow (escoteiro, skip group).
 *
 * `escoteiro-onboarding-incomplete` has role=null / onboardingComplete=false.
 * The wizard runs role → ramo → group. Choosing "Escoteiro", picking the
 * Escoteiro ramo, then "Pular por enquanto" (skip) calls completeOnboarding
 * WITHOUT joining the test group, so it does not pollute group-scoped specs.
 *
 * Repeatable: `seedTestUsers` re-applies this user's catalog state (role=null,
 * onboardingComplete=false) on every run, so completing onboarding here is
 * reset before the next run.
 *
 * Server contract: setRole → setEscoteiroRamo → completeOnboarding; the router
 * then sends a fully-onboarded escoteiro to `/`.
 */

import { onboardingTest as test, expect } from "../../fixtures/auth";

test("escoteiro completes onboarding via role → ramo → skip", async ({
  page,
}) => {
  await page.goto("/onboarding");

  // Step 1 — role. Pick "Escoteiro" (the other card is "Escotista").
  await page.getByRole("button", { name: /Escoteiro/i }).first().click();

  // Step 2 — ramo. The Escoteiro ramo button, then continue.
  await page.getByRole("button", { name: /Escoteiro/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 3 — group. Skip joining a group.
  await page.getByRole("button", { name: /Pular por enquanto/i }).click();

  // Landed on the escoteiro home, off onboarding and signin.
  await expect(page).not.toHaveURL(/\/onboarding/);
  await expect(page).not.toHaveURL(/\/signin/);
  await expect(page).toHaveURL(/localhost:3000\/$/);
});
