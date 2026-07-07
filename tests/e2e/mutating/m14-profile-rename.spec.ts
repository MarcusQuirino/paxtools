/**
 * M14 — Profile rename (PRD #58, story 53).
 *
 * An escoteiro edits their display name on /settings ("Seu nome" section →
 * name <input>, "Salvar nome" → `users.updateName`) and the change persists
 * across a reload.
 *
 * Ownership (tests/utils/personas.ts): owns Gael Monteiro (sim-troop-lobinho-7)
 * and mutates only his name. Self-cleaning: the name is renamed BACK in
 * `finally`, and the start self-heals a leftover marker from an interrupted run
 * so the spec is retry-safe.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";

const SLUG = "sim-troop-lobinho-7";
const EMAIL = `${SLUG}@test.paxtools.local`;
const test = testAs(SLUG);
const ORIGINAL = "Gael Monteiro";
const MARKER = "Gael Monteiro [M14]";

/**
 * Dead storageState guard (PRD #58 hard rule): captured sessions can expire.
 * If the app bounced to /signin, re-login via the dev-only test form and
 * refresh this persona's own auth file — no `testing:*` call.
 */
async function gotoSettings(page: Page) {
  const heading = page.getByRole("heading", { name: "Seu nome" });
  await page.goto("/settings");
  const emailField = page.getByTestId("test-signin-email");
  // The auth redirect is client-side (fires after `goto`), so race the signin
  // form against the settings heading instead of checking immediately.
  await expect(emailField.or(heading).first()).toBeVisible({ timeout: 25_000 });
  if (await emailField.isVisible()) {
    await signInHere(page);
    await page.context().storageState({ path: `tests/.auth/${SLUG}.json` });
    await page.goto("/settings");
  }
  await expect(heading).toBeVisible({ timeout: 25_000 });
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

async function currentValue(page: Page) {
  return page.getByPlaceholder("Seu nome").inputValue();
}

/**
 * Rename and wait for the "Salvo." confirmation. It appears only once updateName
 * COMMITS (onSuccess sets `savedAt`) and the reactive viewer refetch clears
 * `dirty` — so it guarantees the write landed before we reload. We must NOT
 * reload earlier: navigating away can abort the in-flight mutation over the
 * Convex websocket (and waiting on the transient "Salvando…" is unreliable — it
 * can be missed, letting a premature reload abort the write). Generous window
 * because the reactive refetch can lag when the shared dev deployment is loaded.
 */
async function renameTo(page: Page, name: string) {
  await page.getByPlaceholder("Seu nome").fill(name);
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(page.getByText("Salvo.")).toBeVisible({ timeout: 60_000 });
}

test("escoteiro renames their profile and it persists", async ({ page }) => {
  // Up to three commit waits (self-heal + rename + restore); the reactive
  // "Salvo." can lag badly when the shared dev deployment is under load.
  test.setTimeout(180_000);
  try {
    await gotoSettings(page);

    // Self-heal a leftover marker from an interrupted run.
    if ((await currentValue(page)) !== ORIGINAL) {
      await renameTo(page, ORIGINAL);
    }
    await expect(page.getByPlaceholder("Seu nome")).toHaveValue(ORIGINAL);

    // Rename to a distinct marker and save (commit confirmed by "Salvo.").
    await renameTo(page, MARKER);

    // Persisted across a fresh, auth-safe load (post-commit → no abort risk).
    await gotoSettings(page);
    await expect(page.getByPlaceholder("Seu nome")).toHaveValue(MARKER);
  } finally {
    // Restore the seed name.
    await gotoSettings(page);
    if ((await currentValue(page)) !== ORIGINAL) {
      await renameTo(page, ORIGINAL);
    }
  }
});
