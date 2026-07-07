/**
 * M15 — Pending escotista cancels their join request, then re-joins (PRD #58,
 * story 41).
 *
 * Olga Ventura (sim-pending-escotista-lobinho-1) is parked on the
 * `PendingApprovalScreen` at /escotista. She cancels ("Cancelar solicitação e
 * escolher outro grupo" → `groups.leaveGroup`), which clears her group, then
 * she re-joins the test group with password TESTQA so she ends pending again —
 * self-cleaning, no residue for the next run.
 *
 * PRODUCT NOTE (suspected bug, see report): the cancel button navigates to
 * /onboarding, but `leaveGroup` leaves `onboardingComplete === true`, so the
 * onboarding guard immediately bounces her to /escotista, which renders the
 * `NoGroupState` ("Sem grupo") fallback instead of the onboarding wizard. The
 * re-join therefore happens through that fallback's join form (identical end
 * state: role escotista, group joined, membershipStatus pending). Her role and
 * ramo (escotista / lobinho) were never cleared, so no role/ramo step appears.
 *
 * Ownership (tests/utils/personas.ts): owns Olga's row only. Never asserts group
 * name or queue counts (shared rows). Retry-safe: if a prior run already left
 * her cancelled, it proceeds straight to the re-join.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page, Locator } from "@playwright/test";

const SLUG = "sim-pending-escotista-lobinho-1";
const EMAIL = `${SLUG}@test.paxtools.local`;
const test = testAs(SLUG);
const GROUP_PASSWORD = "TESTQA";

/**
 * Dead storageState guard (PRD #58 hard rule): captured sessions can expire.
 * The auth redirect to /signin is client-side (fires after `goto` resolves), so
 * race the signin form against a `ready` locator. If signin wins, re-login via
 * the dev-only test form and refresh this persona's own auth file — no
 * `testing:*` call.
 */
async function gotoAs(page: Page, url: string, ready: Locator) {
  await page.goto(url);
  const emailField = page.getByTestId("test-signin-email");
  await expect(emailField.or(ready).first()).toBeVisible({ timeout: 25_000 });
  if (await emailField.isVisible()) {
    await signInHere(page);
    await page.context().storageState({ path: `tests/.auth/${SLUG}.json` });
    await page.goto(url);
    await expect(ready.first()).toBeVisible({ timeout: 25_000 });
  }
}

/**
 * Submit the dev-only test signin form, retry-tolerant: under the parallel
 * cold-start storm the first submit can be dropped or the round-trip can lag.
 */
async function signInHere(page: Page) {
  await expect(async () => {
    if (/\/signin/.test(page.url())) {
      await page.getByTestId("test-signin-email").fill(EMAIL);
      await page.getByTestId("test-signin-password").fill("paxtools-test-only");
      await page.getByTestId("test-signin-submit").click();
    }
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
}

test("pending escotista cancels their request and re-joins the group", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const waiting = page.getByRole("heading", { name: "Aguardando aprovação" });
  const noGroup = page.getByRole("heading", { name: "Sem grupo" });

  // Either parked (fresh run) or already cancelled (retry) — accept both.
  await gotoAs(page, "/escotista", waiting.or(noGroup));

  if (await waiting.isVisible()) {
    await page
      .getByRole("button", { name: /Cancelar solicitação/i })
      .click();
    // leaveGroup navigates away from the waiting screen (the onboarding bounce
    // lands on the no-group fallback; may also transiently drop to /signin).
    await expect(waiting).toHaveCount(0, { timeout: 15_000 });
  }

  // Re-establish auth if the leave dropped the session, and land on the
  // no-group fallback.
  await gotoAs(page, "/escotista", noGroup);

  // Re-join through the no-group fallback's join form.
  await page
    .getByRole("button", { name: /Entrar em grupo existente/i })
    .click();
  await page.getByPlaceholder("Ex: A3K9X2").fill(GROUP_PASSWORD);
  await page.getByRole("button", { name: /^Entrar no grupo$/ }).click();

  // Join took effect — the no-group fallback is replaced (by the waiting
  // screen, or transiently /signin).
  await expect(noGroup).toHaveCount(0, { timeout: 15_000 });

  // Back to pending — re-auth if needed, then assert she is re-parked.
  await gotoAs(page, "/escotista", waiting);
  await expect(waiting).toBeVisible({ timeout: 15_000 });
});
