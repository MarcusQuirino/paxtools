/**
 * Bloco navigation helpers (Design A). Progressão (/) lists every bloco as a
 * link row (`data-testid="bloco-row-<blocoId>"`) that pushes the bloco screen
 * `/bloco/<blocoId>` — or `/bloco/<blocoId>?escoteiroId=<id>` from the
 * escotista's impersonation view. The bloco screen holds the ação checks
 * (`ActionCheck`: `<button role="checkbox" id="<actionId>" data-state=
 * "open|pending|approved">`), plan stars and the "Ação personalizada" sheet.
 */

import { expect, type Page } from "@playwright/test";

/** Bloco id of a curriculum action id (`ramo:blocoId:type:index`). */
export function blocoIdOf(actionId: string): string {
  const id = actionId.split(":")[1];
  if (!id) throw new Error(`not a curriculum action id: ${actionId}`);
  return id;
}

/** A bloco's row on a Progressão body (own dashboard or impersonation). */
export const blocoRow = (page: Page, blocoId: string) =>
  page.getByTestId(`bloco-row-${blocoId}`);

/**
 * Tap a bloco row and wait for the pushed bloco screen (client-side nav).
 * Assumes the page shows a Progressão body. Retries the tap: under parallel
 * load a Convex re-render can swallow a single click.
 */
export async function openBloco(page: Page, blocoId: string): Promise<void> {
  const url = new RegExp(`/bloco/${blocoId}(?:[?#]|$)`);
  await expect(async () => {
    if (!url.test(page.url())) {
      await blocoRow(page, blocoId).click({ timeout: 5_000 });
    }
    await expect(page).toHaveURL(url, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByTestId("bloco-head")).toBeVisible();
}
