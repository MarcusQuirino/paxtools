/**
 * Escoteiro bottom tab bar (redesign PR 1, "Design A"). Replaces the top
 * segmented Tudo / Plano / Esp. nav. Verifies:
 *   - the fixed bar shows 4 full-label tabs: Progressão / Plano /
 *     Especialidades / Perfil;
 *   - the active tab carries aria-current="page" and follows client-side nav;
 *   - the page header is the context title (no "PAXTOOLS" wordmark);
 *   - Perfil (/settings) keeps sign-out reachable once the avatar menu is gone.
 * READ-ONLY: navigates and reads; never submits.
 */

import { approvedTest, expect } from "../../fixtures/auth";

const TABS = ["Progressão", "Plano", "Especialidades", "Perfil"] as const;

approvedTest("tab bar shows 4 full-label tabs, fixed, Progressão active on /", async ({
  page,
}) => {
  await page.goto("/");

  const bar = page.getByTestId("escoteiro-tab-bar");
  await expect(bar).toBeVisible({ timeout: 15_000 });
  await expect(bar).toHaveCSS("position", "fixed");

  for (const label of TABS) {
    await expect(bar.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(
    bar.getByRole("link", { name: "Progressão", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);

  await expect(
    page.getByRole("heading", { level: 1, name: "Progressão", exact: true }),
  ).toBeVisible();
  // The old wordmark header is gone.
  await expect(page.getByRole("heading", { name: "Paxtools", exact: true })).toHaveCount(0);
});

approvedTest("tabs navigate client-side and move aria-current", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByTestId("escoteiro-tab-bar");
  await expect(bar).toBeVisible({ timeout: 15_000 });

  const cases = [
    { label: "Plano", url: /\/plan$/ },
    { label: "Especialidades", url: /\/especialidades$/ },
    { label: "Perfil", url: /\/settings$/ },
    { label: "Progressão", url: /\/$/ },
  ] as const;

  for (const { label, url } of cases) {
    await bar.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: label, exact: true }),
    ).toBeVisible();
    await expect(
      bar.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

approvedTest("Perfil keeps sign-out reachable", async ({ page }) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { level: 1, name: "Perfil", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
});
