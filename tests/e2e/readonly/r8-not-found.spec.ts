/**
 * R8 — Unknown URLs render the pt-BR 404 page (`defaultNotFoundComponent`,
 * src/components/not-found.tsx; part of #127) instead of the router's bare
 * English "Not Found", for signed-out and signed-in viewers, and "Voltar ao
 * início" leads each one home through the normal auth gate.
 */

import { test as anon, expect } from "@playwright/test";
import { adminTest, progressionTest } from "../../fixtures/auth";

const HEADING = { name: "Página não encontrada" } as const;

anon("signed out: unknown URL shows the 404 page and links to sign-in", async ({ page }) => {
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", HEADING)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Not Found", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await page.waitForURL("**/signin");
});

progressionTest("escoteiro: unknown nested URL shows the 404 page and links home", async ({ page }) => {
  await page.goto("/pagina/que/nao/existe");
  await expect(page.getByRole("heading", HEADING)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await expect(page.getByRole("heading", HEADING)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Progressão" })).toBeVisible({ timeout: 20_000 });
});

// Under /escotista the layout's role guard runs first (an escoteiro there is
// sent home, not shown a 404); an escotista gets the 404 and goes to the painel.
adminTest("escotista: unknown URL under /escotista shows the 404 page and links to the painel", async ({ page }) => {
  await page.goto("/escotista/nao-existe");
  await expect(page.getByRole("heading", HEADING)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await page.waitForURL("**/escotista");
  await expect(page.getByRole("link", { name: "Painel" })).toBeVisible({ timeout: 20_000 });
});
