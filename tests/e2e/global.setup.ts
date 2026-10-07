/**
 * Playwright setup project — runs once before any spec project.
 *
 *   1. Guaranteed-pristine reseed of the TARGET deployment (wipe + canonical
 *      users + simulated troop). Both targets get the identical dataset, so
 *      exact-count assertions behave the same on local and staging.
 *   2. Capture a logged-in storageState for every manifest persona
 *      (tests/utils/personas.ts) via the real registro sign-in form, in small
 *      concurrent batches so setup stays fast.
 *
 * Set E2E_SKIP_SEED=1 to skip the reseed AND the recapture when iterating on
 * specs locally (reseeding recreates sim users with fresh IDs, which would
 * invalidate every previously captured session).
 *
 * The destination after signin depends on role state (`/onboarding`, `/`,
 * `/escotista`, ...), so the post-signin assertion is intentionally loose:
 * just confirm the URL has moved off `/signin`.
 */

import { test as setup, expect } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { resetTestData } from "../utils/convex-cli";
import { LOGIN_PERSONAS, authFile } from "../utils/personas";
import { submitSignIn } from "../utils/signin";

const CAPTURE_BATCH = 6;

async function captureState(
  browser: Browser,
  scoutId: string,
  slug: string,
): Promise<void> {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    await page.goto("/signin");
    await submitSignIn(page, scoutId);
    // Destination differs per role state — assert we left signin, nothing more.
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 15_000 });
    await ctx.storageState({ path: authFile(slug) });
  } finally {
    await ctx.close();
  }
}

setup("reseed + capture auth states", async ({ browser }) => {
  setup.setTimeout(600_000);

  if (process.env.E2E_SKIP_SEED === "1") return;

  await resetTestData();

  const queue = [...LOGIN_PERSONAS];
  for (let i = 0; i < queue.length; i += CAPTURE_BATCH) {
    const batch = queue.slice(i, i + CAPTURE_BATCH);
    await Promise.all(
      batch.map((p) => captureState(browser, p.scoutId, p.slug)),
    );
  }
});
