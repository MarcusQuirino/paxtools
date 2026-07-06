/**
 * Stats page. Verifies an escotista can open /escotista/stats and the core
 * sections render (eixo coverage bars + gap list). Data-agnostic: other specs
 * in the serial run mutate completions, so we assert structure, not counts.
 */
import { escotistaTest, approvedTest, expect } from "../../fixtures/auth";

escotistaTest("escotista opens the Stats page and core sections render", async ({
  page,
}) => {
  await page.goto("/escotista");
  const tab = page.getByRole("link", { name: "Stats" });
  await expect(tab).toBeVisible();
  await tab.click();

  await expect(page).toHaveURL(/\/escotista\/stats/);
  await expect(page.getByTestId("stats-eixo-bars")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("stats-gap-list")).toBeVisible();
});

approvedTest("escoteiro is redirected away from the stats page", async ({
  page,
}) => {
  await page.goto("/escotista/stats");
  await expect(page).not.toHaveURL(/\/escotista\/stats/, { timeout: 10_000 });
});
