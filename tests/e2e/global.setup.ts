/**
 * Playwright setup project — runs once before any chromium spec.
 *
 *   1. Seed test users via the Convex `testing:seedTestUsers` mutation.
 *   2. For each catalog entry, sign in via the hidden test-only credentials
 *      form (mounted only when `VITE_TEST_AUTH === "1"`) and save the
 *      resulting storageState to `tests/.auth/<slug>.json`.
 *
 * The destination after signin depends on role state (`/onboarding`, `/`,
 * `/escotista`, ...), so the post-signin assertion is intentionally loose:
 * just confirm the URL has moved off `/signin`.
 */

import { test as setup, expect } from "@playwright/test";
import { CATALOG } from "../utils/catalog";
import { seedTestData } from "../utils/convex-cli";
import {
  TEST_SIGNIN_EMAIL,
  TEST_SIGNIN_PASSWORD,
  TEST_SIGNIN_SUBMIT,
} from "../utils/selectors";

setup("seed + auth state", async ({ browser }) => {
  await seedTestData();

  const password = process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only";

  for (const u of CATALOG) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/signin");
    await page.getByTestId(TEST_SIGNIN_EMAIL).fill(u.email);
    await page.getByTestId(TEST_SIGNIN_PASSWORD).fill(password);
    await page.getByTestId(TEST_SIGNIN_SUBMIT).click();
    // Destination differs per role state — assert we left signin, nothing more.
    await expect(page).not.toHaveURL(/\/signin/);
    await ctx.storageState({ path: `tests/.auth/${u.slug}.json` });
    await ctx.close();
  }
});
