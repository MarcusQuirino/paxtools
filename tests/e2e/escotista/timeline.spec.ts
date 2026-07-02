/**
 * Audit timeline tab. Verifies the new escotista-only "Histórico" tab:
 *   - an escotista can open `/escotista/timeline` and the feed renders (either
 *     the empty state or a list of events — data-agnostic since other specs may
 *     have produced events earlier in the serial run);
 *   - an escoteiro is redirected away (the route is guarded by
 *     `useAuthGate("escotista")`).
 */

import { escotistaTest, approvedTest, expect } from "../../fixtures/auth";

escotistaTest("escotista opens the Histórico timeline tab", async ({ page }) => {
  await page.goto("/escotista");

  await page.getByRole("button", { name: "Mais" }).click();
  const tab = page.getByRole("link", { name: "Histórico" });
  await expect(tab).toBeVisible();
  await tab.click();

  await expect(page).toHaveURL(/\/escotista\/timeline/);
  await expect(
    page.getByTestId("timeline-feed").or(page.getByTestId("timeline-empty")),
  ).toBeVisible({ timeout: 15_000 });
});

approvedTest("escoteiro is redirected away from the timeline", async ({
  page,
}) => {
  await page.goto("/escotista/timeline");
  // useAuthGate("escotista") bounces a non-escotista off the route.
  await expect(page).not.toHaveURL(/\/escotista\/timeline/, { timeout: 10_000 });
});
