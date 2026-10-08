/**
 * M15 — A pending conta gerenciada cannot cancel its join request (PRD #58,
 * story 41).
 *
 * Olga Ventura (sim-pending-escotista-lobinho-1) is parked on the
 * `PendingApprovalScreen` at /escotista. Like every persona she signs in with a
 * registro, and `groups.leaveGroup` refuses contas gerenciadas — the grupo
 * created the account and it has no other way back in. So "Cancelar
 * solicitação e escolher outro grupo" must leave her exactly where she was:
 * still in the group, still pending.
 *
 * The Google-account cancel → re-join flow has no e2e coverage: personas
 * cannot sign in with Google. `convex/groups.test.ts` covers leaveGroup itself.
 *
 * Ownership (tests/utils/personas.ts): owns Olga's row only. Never asserts group
 * name or queue counts (shared rows). Mutates nothing when the guard holds, so
 * it is retry-safe.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page, Locator } from "@playwright/test";
import { login } from "../../utils/personas";
import { SCOUT_SIGNIN_ID } from "../../utils/selectors";
import { submitSignIn } from "../../utils/signin";

const SLUG = "sim-pending-escotista-lobinho-1";
const SCOUT_ID = login(SLUG);
const test = testAs(SLUG);

/**
 * Dead storageState guard (PRD #58 hard rule): captured sessions can expire.
 * The auth redirect to /signin is client-side (fires after `goto` resolves), so
 * race the signin form against a `ready` locator. If signin wins, re-login via
 * the registro sign-in form and refresh this persona's own auth file — no
 * `testing:*` call.
 */
async function gotoAs(page: Page, url: string, ready: Locator) {
  await page.goto(url);
  const idField = page.getByTestId(SCOUT_SIGNIN_ID);
  await expect(idField.or(ready).first()).toBeVisible({ timeout: 25_000 });
  if (await idField.isVisible()) {
    await signInHere(page);
    await page.context().storageState({ path: `tests/.auth/${SLUG}.json` });
    await page.goto(url);
    await expect(ready.first()).toBeVisible({ timeout: 25_000 });
  }
}

/**
 * Submit the registro sign-in form, retry-tolerant: under the parallel
 * cold-start storm the first submit can be dropped or the round-trip can lag.
 */
async function signInHere(page: Page) {
  await expect(async () => {
    if (/\/signin/.test(page.url())) {
      await submitSignIn(page, SCOUT_ID);
    }
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
}

test("pending conta gerenciada cannot cancel its request and stays parked", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const waiting = page.getByRole("heading", { name: "Aguardando aprovação" });
  const cancel = page.getByRole("button", { name: /Cancelar solicitação/i });

  await gotoAs(page, "/escotista", waiting);

  // leaveGroup rejects; once the mutation settles the button re-enables and
  // the waiting screen is still there.
  await cancel.click();
  await expect(cancel).toBeEnabled({ timeout: 15_000 });
  await expect(waiting).toBeVisible();

  // Server state agrees: a fresh load still parks her on the waiting screen.
  await gotoAs(page, "/escotista", waiting);
  await expect(waiting).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Sem grupo" })).toHaveCount(0);
});
