/**
 * M22 — Star a catalog especialidade into the plano.
 *
 * Kelly Faria (`sim-troop-escoteiro-11`) has an empty plano and no
 * especialidades. The flow stars Administração on /especialidades, checks the
 * "No plano" chip, finds it on /plan (both views) and follows its link back to
 * the card, then unstars it in `finally` so reruns start clean.
 *
 * NO page.reload(): the test-auth refresh token is single-use, so after the one
 * initial load everything navigates client-side via the tab bar (see
 * tests/e2e/shared/plan-lifecycle-flow.ts).
 *
 * OWNERSHIP: mutates only Kelly Faria's plano.
 */

import type { Page } from "@playwright/test";
import { testAs, expect } from "../../fixtures/auth";

const test = testAs("sim-troop-escoteiro-11");

const NAME = "Administração";

/** The ONLY full load; re-`goto` past a cold-load auth bounce. */
async function openEspecialidades(page: Page): Promise<void> {
  const search = page.getByRole("searchbox", {
    name: "Buscar por nome ou requisito",
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(`/especialidades?q=${encodeURIComponent(NAME)}`);
    const ok = await search
      .waitFor({ state: "visible", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  await search.waitFor({ state: "visible", timeout: 12_000 });
}

test("escoteiro stars an especialidade into the plano and unstars it", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  await openEspecialidades(page);

  const add = page.getByRole("button", { name: `Adicionar ${NAME} ao plano` });
  const remove = page.getByRole("button", { name: `Remover ${NAME} do plano` });

  // Normalize a leftover from a crashed prior run.
  await expect(add.or(remove)).toBeVisible();
  if (await remove.isVisible()) await remove.click();
  await expect(add).toBeVisible();

  try {
    await add.click();
    await expect(remove).toBeVisible();

    // "No plano" chip lists it.
    await page.getByRole("button", { name: "No plano", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(NAME) }).first())
      .toBeVisible();

    // Plano → Por Área: under its eixo's Especialidades block.
    await page.getByRole("link", { name: "Plano", exact: true }).click();
    await expect(page).toHaveURL(/\/plan/);
    const row = page.getByRole("link", { name: `abrir ${NAME}` });
    await expect(row).toBeVisible();
    await expect(row).toContainText("0/6 itens");

    // Minha Ordem: labelled "Especialidade" instead of a bloco.
    await page.getByRole("button", { name: "Minha Ordem" }).click();
    await expect(page.getByText("Especialidade", { exact: true })).toBeVisible();

    // The row deep-links to the card on /especialidades.
    await page.getByRole("link", { name: `abrir ${NAME}` }).click();
    await expect(page).toHaveURL(/specialty=administracao/);
  } finally {
    if (!/\/especialidades/.test(page.url())) {
      await page
        .getByRole("link", { name: "Especialidades", exact: true })
        .click();
    }
    const unstar = page
      .getByRole("button", { name: `Remover ${NAME} do plano` })
      .first();
    if (await unstar.isVisible().catch(() => false)) await unstar.click();
  }

  await expect(add.first()).toBeVisible();
});
