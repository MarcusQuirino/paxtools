/**
 * M23 — Guided tour, replayed from Perfil / Ajustes.
 *
 * Seeded personas carry `tourSeenAt`, so the tour never auto-opens in the
 * suite; these specs open it by hand with "Ver tutorial" and walk it:
 *   - escoteiro: replay from Perfil lands the tour on Progressão, spotlights
 *     real elements, Voltar steps back, Concluir closes it;
 *   - escotista: replay from Ajustes moves to the Painel; Pular and Esc close.
 *
 * Only write: `markTourSeen` re-stamps the persona's `tourSeenAt`, a field no
 * other spec reads.
 */

import type { Page } from "@playwright/test";
import { approvedTest, escotistaTest, expect } from "../../fixtures/auth";

async function startTourFromSettings(page: Page): Promise<void> {
  await page.goto("/settings");
  const replay = page.getByRole("button", { name: "Ver tutorial" });
  await expect(replay).toBeVisible({ timeout: 20_000 });
  await replay.click();
  await expect(page.getByTestId("guided-tour")).toBeVisible();
}

approvedTest("escoteiro walks the tour from Perfil to the end", async ({ page }) => {
  await startTourFromSettings(page);

  const card = page.getByRole("dialog");
  await expect(card).toHaveAttribute("data-tour-step", "welcome");
  await expect(page).toHaveURL(/\/$/);
  await expect(card.getByText(/^Passo 1 de \d+$/i)).toBeVisible();

  await card.getByRole("button", { name: "Vamos lá" }).click();
  await expect(card).toHaveAttribute("data-tour-step", "stage");

  await card.getByRole("button", { name: "Voltar" }).click();
  await expect(card).toHaveAttribute("data-tour-step", "welcome");

  // Walk to the end; every targeted step must find its element.
  await card.getByRole("button", { name: "Vamos lá" }).click();
  for (let i = 0; i < 20; i++) {
    const next = card.getByRole("button", { name: /^(Próximo|Concluir)$/ });
    if ((await next.innerText()) === "Concluir") break;
    await next.click();
  }
  await expect(card).toHaveAttribute("data-tour-step", "done");
  await card.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByTestId("guided-tour")).toHaveCount(0);
});

escotistaTest("escotista tour moves to the Painel; Pular and Esc close it", async ({
  page,
}) => {
  await startTourFromSettings(page);

  const card = page.getByRole("dialog");
  await expect(page).toHaveURL(/\/escotista$/, { timeout: 10_000 });
  await expect(card).toHaveAttribute("data-tour-step", "welcome");

  await card.getByRole("button", { name: "Vamos lá" }).click();
  await expect(card).toHaveAttribute("data-tour-step", "grupo");
  await card.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByTestId("guided-tour")).toHaveCount(0);

  // Replay once more and dismiss with the keyboard.
  await startTourFromSettings(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("guided-tour")).toHaveCount(0);
});
