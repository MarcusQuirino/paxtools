/**
 * End-to-end wiring smoke test.
 *
 * Proves that:
 *   - `global.setup.ts` produced a usable `admin` storageState.
 *   - Visiting an authenticated route keeps us off `/signin` and off
 *     `/onboarding`.
 *
 * This test will fail until Agent D ships the test-credentials provider and
 * the hidden signin form — that is expected. Do not skip it.
 */

import { adminTest as test, expect } from "../../fixtures/auth";

test("admin lands on /escotista without redirect", async ({ page }) => {
  await page.goto("/escotista");
  await expect(page).not.toHaveURL(/\/signin/);
  await expect(page).not.toHaveURL(/\/onboarding/);
  await expect(page).toHaveURL(/\/escotista/);
});
