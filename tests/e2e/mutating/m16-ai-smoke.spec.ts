/**
 * M16 — AI suggestions card shell smoke (PRD #58, story 42).
 *
 * Flag-gated feature: `AiSuggestionsCard` (src/components/escotista/
 * ai-suggestions-card.tsx) renders nothing unless the `ai_suggestions` feature
 * flag is enabled. On this dev deployment the flag has NO featureFlags row, so
 * `isEnabled` is false and the card never mounts — this spec then cleanly
 * `test.skip()`s.
 *
 * The positive path (card visible → trigger → loading state) is written to run
 * UNCHANGED on any deployment where the flag is ON (e.g. staging). It only
 * asserts the shell reaches its loading state ("Gerando…"); it NEVER awaits or
 * asserts model output. Triggering fires `ai.suggestActivities`, which writes a
 * group/ramo-scoped cache row — not persona (scout) data — so no owned persona
 * is mutated.
 *
 * Uses the single-ramo lobinho escotista Marina Solano (shared read login,
 * mirrors r5-stats): her stats page has no ramo switcher, so the card (if any)
 * mounts on first load.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page, Locator } from "@playwright/test";

const SLUG = "sim-escotista-lobinho-1--m16";
const EMAIL = "sim-escotista-lobinho-1@test.paxtools.local";
const test = testAs(SLUG);

/**
 * Dead storageState guard (PRD #58 hard rule): captured sessions can expire.
 * The auth redirect to /signin is client-side (fires after `goto` resolves), so
 * race the signin form against a `ready` locator. If signin wins, re-login via
 * the dev-only test form and refresh THIS persona's auth file — no `testing:*`
 * call.
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

test("AI suggestions card reaches its loading state when triggered", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const distribution = page.getByTestId("stats-stage-distribution");
  await gotoAs(page, "/escotista/stats", distribution);
  await expect(distribution).toBeVisible({ timeout: 15_000 });

  const card = page.getByTestId("stats-ai-suggestions");

  // Wait briefly for the flag query to resolve and (if enabled) mount the card.
  let cardPresent = true;
  try {
    await card.waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    cardPresent = false;
  }
  test.skip(
    !cardPresent,
    "ai_suggestions feature flag OFF on this deployment — card not mounted",
  );

  // ── Positive path (deployments with the flag ON) ──────────────────────────
  await expect(card).toBeVisible();
  const generate = card.getByRole("button", {
    name: /Gerar sugestões|Gerar de novo/,
  });
  await expect(generate).toBeEnabled();

  await generate.click();

  // Shell smoke only: assert the loading affordance appears. NEVER await the
  // model's output.
  await expect(
    card.getByRole("button", { name: /Gerando/ }),
  ).toBeVisible();
});
