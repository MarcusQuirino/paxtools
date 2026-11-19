/**
 * Sign a persona in through the production registro + password form — test
 * personas are ordinary contas gerenciadas, so there is no test-only login.
 */

import type { Page } from "@playwright/test";
import { requireTestPassword } from "../../convex/lib/testAccounts";
import {
  SCOUT_SIGNIN_ID,
  SCOUT_SIGNIN_PASSWORD,
  SCOUT_SIGNIN_SUBMIT,
} from "./selectors";

/** Must match the TEST_AUTH_PASSWORD the target deployment was seeded with. */
export const TEST_PASSWORD = requireTestPassword(process.env);

/**
 * Fill and submit the form on an already-open `/signin` page. Pass `timeout`
 * when the form may vanish under you (a transient /signin bounce during the
 * auth handshake) so the caller can recover instead of hanging.
 */
export async function submitSignIn(
  page: Page,
  scoutId: string,
  opts: { timeout?: number } = {},
): Promise<void> {
  await page.getByTestId(SCOUT_SIGNIN_ID).fill(scoutId, opts);
  await page.getByTestId(SCOUT_SIGNIN_PASSWORD).fill(TEST_PASSWORD, opts);
  await page.getByTestId(SCOUT_SIGNIN_SUBMIT).click(opts);
}
