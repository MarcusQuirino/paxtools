/**
 * Sign a persona in through the production registro + password form — test
 * personas are ordinary contas gerenciadas, so there is no test-only login.
 */

import type { Page } from "@playwright/test";
import { DEFAULT_TEST_PASSWORD } from "../../convex/lib/testAccounts";
import {
  SCOUT_SIGNIN_ID,
  SCOUT_SIGNIN_PASSWORD,
  SCOUT_SIGNIN_SUBMIT,
} from "./selectors";

/** Must match the TEST_AUTH_PASSWORD the target deployment was seeded with. */
export const TEST_PASSWORD =
  process.env.TEST_AUTH_PASSWORD || DEFAULT_TEST_PASSWORD;

/** Fill and submit the form on an already-open `/signin` page. */
export async function submitSignIn(page: Page, scoutId: string): Promise<void> {
  await page.getByTestId(SCOUT_SIGNIN_ID).fill(scoutId);
  await page.getByTestId(SCOUT_SIGNIN_PASSWORD).fill(TEST_PASSWORD);
  await page.getByTestId(SCOUT_SIGNIN_SUBMIT).click();
}
