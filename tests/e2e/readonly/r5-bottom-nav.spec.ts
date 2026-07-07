/**
 * Bottom navigation restructure (Plan A). Verifies the fixed bottom bar:
 *   - shows the 3 primary slots Painel / Pendentes / Mais;
 *   - is anchored bottom (position: fixed);
 *   - "Mais" opens a sheet revealing Histórico + Ajustes for every escotista,
 *     and Admin only when the caller is an admin;
 *   - navigating from a sheet link works.
 */

import { escotistaTest, adminTest, expect } from "../../fixtures/auth";

escotistaTest("bottom bar shows the 3 primary slots and is fixed", async ({
  page,
}) => {
  await page.goto("/escotista");

  const bar = page.getByTestId("escotista-bottom-nav");
  await expect(bar).toBeVisible();
  await expect(bar).toHaveCSS("position", "fixed");

  await expect(bar.getByRole("link", { name: "Painel" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Pendentes" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Mais" })).toBeVisible();

  // Secondary destinations are hidden until "Mais" is tapped.
  await expect(page.getByRole("link", { name: "Histórico" })).toHaveCount(0);
});

escotistaTest("Mais reveals Histórico + Ajustes (no Admin for non-admin) and navigates", async ({
  page,
}) => {
  await page.goto("/escotista");

  await page.getByRole("button", { name: "Mais" }).click();

  await expect(page.getByRole("link", { name: "Histórico" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ajustes" })).toBeVisible();
  // Non-admin escotista never sees the Admin destination.
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

  // Navigation from a sheet link works (sheet closes, route changes).
  await page.getByRole("link", { name: "Histórico" }).click();
  await expect(page).toHaveURL(/\/escotista\/timeline/);
});

adminTest("admin sees the Admin destination inside Mais", async ({ page }) => {
  await page.goto("/escotista");

  await page.getByRole("button", { name: "Mais" }).click();
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});
