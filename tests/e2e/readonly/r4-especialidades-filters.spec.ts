/**
 * R4 — Especialidades search + filter chips on the escoteiro's own page
 * (/especialidades): `?q=` searches names and item text, `?f=` is "minhas"
 * (started) or an eixoId. With neither set the page keeps its eixo sections.
 *
 * Seed: sim-troop-lobinho-11 (Kaique Neves) holds Nutrição (Saúde e
 * Bem-estar) at 6/6 — see r4-especialidades.spec.ts.
 *
 * READ-ONLY: chips and search only.
 */

import type { Page, TestInfo } from "@playwright/test";
import { testAs, expect } from "../../fixtures/auth";

/** Re-`goto` past the cold-load auth bounce (see r4-especialidades.spec.ts). */
async function openPage(page: Page, testInfo: TestInfo): Promise<void> {
  testInfo.setTimeout(90_000);
  const search = page.getByRole("searchbox", {
    name: "Buscar por nome ou requisito",
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto("/especialidades");
    const ok = await search
      .waitFor({ state: "visible", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  await search.waitFor({ state: "visible", timeout: 12_000 });
}

testAs("sim-troop-lobinho-11")(
  "escoteiro filters especialidades by Minhas, eixo and search",
  async ({ page }, testInfo) => {
    await openPage(page, testInfo);
    const nutricao = page.getByRole("button", { name: /Nutrição/ });
    const chip = (name: string) =>
      page.getByRole("button", { name, exact: true });

    // Minhas: only started especialidades, as a flat list.
    await chip("Minhas").click();
    await expect(chip("Minhas")).toHaveAttribute("aria-pressed", "true");
    await expect(nutricao).toBeVisible();
    await expect(page).toHaveURL(/f=minhas/);

    // Another eixo excludes it.
    await chip("Meio Ambiente").click();
    await expect(nutricao).toHaveCount(0);

    // Its own eixo + a search on the name finds it.
    await chip("Saúde e Bem-estar").click();
    await page.getByRole("searchbox").fill("nutri");
    await expect(nutricao).toBeVisible();

    // Nothing matches → empty state.
    await page.getByRole("searchbox").fill("zzzz");
    await expect(page.getByText("Nada encontrado")).toBeVisible();

    // Clearing both brings back the eixo sections.
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await chip("Todas").click();
    await expect(
      page.getByRole("button", { name: /^Saúde e Bem-estar\s*\d+ especialidades/ }),
    ).toBeVisible();
  },
);
