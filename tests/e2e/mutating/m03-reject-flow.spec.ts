/**
 * M3 (PRD #58 story 36, reject side) — approval-queue reject workflow across
 * two roles. Bruno Sá (sim-troop-escoteiro-2) self-marks a NEW ação → it shows
 * up in Renata Peçanha's (sim-escotista-escoteiro-1) pending queue on Bruno's
 * card → Renata rejects ONLY that row → it disappears for Bruno.
 *
 * Reject deletes the pending row (bulkAction reject), so the flow leaves no
 * approved/locked state and is repeatable.
 *
 * Care with Bruno's seed: he carries 2 seeded PENDING ações on his frontier
 * bloco (Consumo Responsável → fixed:0 + fixed:1) that other read specs assert
 * on. We mark a DIFFERENT unchecked ação (variable:0) and reject only that one
 * (deselect-all, then re-select just our row) so the seeded queue material
 * stays intact.
 *
 * Renata is a SHARED approver login (M2 also drives her queue concurrently), so
 * every queue assertion is scoped to Bruno's card — never a global count.
 */

import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const NEW_ACTION_ID = "escoteiro:consumo-responsavel:variable:0";
// The visible label of NEW_ACTION_ID — its accessible name in the queue card.
const NEW_ACTION_LABEL =
  /Registrar e analisar o consumo de água e energia da sua residência/i;
const BLOCO_TRIGGER = /Consumo Responsável/i;
// A seeded pending row we must NOT touch (proof the seed stays intact).
const SEEDED_ACTION_ID = "escoteiro:consumo-responsavel:fixed:0";

const BRUNO_STATE = "tests/.auth/sim-troop-escoteiro-2.json";
const RENATA_STATE = "tests/.auth/sim-escotista-escoteiro-1--m03.json";
const BRUNO_NAME = /Bruno Sá/i;

const expandBloco = (p: Page) =>
  p.getByRole("button", { name: BLOCO_TRIGGER }).first().click();

/** Bruno's card in Renata's queue, scoped to its bordered container. */
function brunoCard(page: Page): Locator {
  return page
    .getByRole("button", { name: BRUNO_NAME })
    .locator('xpath=ancestor::div[contains(@class,"bg-card")][1]');
}

test("escoteiro marks a new ação → escotista rejects it → row removed, seed intact", async ({
  browser,
}) => {
  test.setTimeout(60_000);

  const brunoCtx = await browser.newContext({ storageState: BRUNO_STATE });
  const renataCtx = await browser.newContext({ storageState: RENATA_STATE });
  const brunoPage = await brunoCtx.newPage();
  const renataPage = await renataCtx.newPage();
  const newCheckbox = brunoPage.locator(`[id="${NEW_ACTION_ID}"]`);

  try {
    // 1. Bruno marks a NEW ação → pending (self-marked, never locked).
    await brunoPage.goto("/");
    await expandBloco(brunoPage);
    await expect(newCheckbox).toBeVisible();
    if ((await newCheckbox.getAttribute("data-state")) === "checked") {
      await newCheckbox.click();
      await expect(newCheckbox).toHaveAttribute("data-state", "unchecked");
    }
    await newCheckbox.click();
    await expect(newCheckbox).toHaveAttribute("data-state", "checked");

    // 2. Renata sees Bruno's card; reject ONLY the new row.
    await renataPage.goto("/escotista/pending");
    const card = brunoCard(renataPage);
    const trigger = renataPage.getByRole("button", { name: BRUNO_NAME });
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click(); // expand

    const newItem = card.getByRole("checkbox", { name: NEW_ACTION_LABEL });
    await expect(newItem).toBeVisible();

    // All items start selected — deselect all (first checkbox = select-all),
    // then re-select just our new row so the reject touches only it.
    await card.getByRole("checkbox").first().click();
    await expect(newItem).not.toBeChecked();
    await newItem.click();
    await expect(newItem).toBeChecked();

    await card.getByRole("button", { name: /^Rejeitar/ }).click();

    // The new row is gone from Bruno's card; the card survives (seed remains).
    await expect(
      card.getByRole("checkbox", { name: NEW_ACTION_LABEL }),
    ).toHaveCount(0, { timeout: 15_000 });
    await expect(
      renataPage.getByRole("button", { name: BRUNO_NAME }),
    ).toBeVisible();

    // 3. Gone for Bruno on a fresh read; the seeded pending stays checked.
    await brunoPage.reload();
    await expandBloco(brunoPage);
    await expect(newCheckbox).toHaveAttribute("data-state", "unchecked");
    await expect(
      brunoPage.locator(`[id="${SEEDED_ACTION_ID}"]`),
    ).toHaveAttribute("data-state", "checked");
  } finally {
    // Safety net: if we failed after marking but before the reject landed,
    // unmark the (always-unlockable) new pending row so the next run is clean.
    try {
      await brunoPage.goto("/");
      await expandBloco(brunoPage);
      if ((await newCheckbox.getAttribute("data-state")) === "checked") {
        await newCheckbox.click();
      }
    } catch {
      // context tearing down; ignore.
    }
    await brunoCtx.close();
    await renataCtx.close();
  }
});
