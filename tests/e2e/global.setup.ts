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
import { SCOUT_SIGNIN_ID } from "../utils/selectors";
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
    // Under the concurrent capture batches the auth handshake can stall after
    // a correct submit (page stuck on /signin) — it never self-heals by
    // waiting, only a fresh navigation re-attempts it. Bounded retries; the
    // session from a stalled attempt is reused when it did land.
    for (let attempt = 1; ; attempt++) {
      await page.goto("/signin");
      const form = page.getByTestId(SCOUT_SIGNIN_ID);
      await Promise.race([
        form.waitFor({ state: "visible", timeout: 15_000 }),
        page.waitForURL((u) => !u.pathname.startsWith("/signin"), {
          timeout: 15_000,
        }),
      ]).catch(() => {});
      try {
        if (/\/signin/.test(page.url())) {
          await submitSignIn(page, scoutId, { timeout: 10_000 });
        }
        // Destination differs per role state — assert we left signin only.
        await expect(page).not.toHaveURL(/\/signin/, { timeout: 15_000 });
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
      }
    }
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
