/**
 * Shared mark/unmark flow (PRD #58 story 27) — an escoteiro self-marks one
 * progression ação (creating a PENDING completion) and then unmarks it.
 *
 * Parameterized by persona + actionId so both the desktop spec (Ana Lima,
 * escoteiro ramo) and the mobile spec (Alice Prado, lobinho ramo) wrap the
 * exact same steps. A self-marked pending item is never locked, so the flow is
 * fully self-cleaning: it ends unchecked and resets any leftover checked state
 * at the start, making it repeatable after an interrupted run.
 *
 * Server contract (convex/progression.ts `toggleAction`): an escoteiro acting
 * on themselves inserts a `status:"pending"` row; toggling again deletes it.
 */

import { type Page, expect } from "@playwright/test";

export interface MarkUnmarkParams {
  /** Full action id `ramo:blocoId:type:index` — becomes the checkbox `id`. */
  readonly actionId: string;
  /** Accordion trigger name for the bloco that owns the ação. */
  readonly blocoTrigger: RegExp;
}

export async function runMarkUnmarkFlow(
  page: Page,
  { actionId, blocoTrigger }: MarkUnmarkParams,
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: blocoTrigger }).first().click();

  const checkbox = page.locator(`[id="${actionId}"]`);
  await expect(checkbox).toBeVisible();

  // Reset any leftover state from a previous interrupted run so we start clean.
  if ((await checkbox.getAttribute("data-state")) === "checked") {
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "unchecked");
  }

  // Mark → checked + PENDING. As a self-marking escoteiro this needs an
  // escotista's approval, so the row is pending (clock shown) yet still
  // enabled — a pending item is never locked.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "checked");
  await expect(checkbox).toBeEnabled();

  // Pending signal: a clock icon renders in the same ação row.
  const pendingClock = page.locator(`label[for="${actionId}"] .lucide-clock`);
  await expect(pendingClock).toBeVisible();

  // Unmark → back to unchecked. Self-cleaning end state.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "unchecked");
  await expect(pendingClock).toHaveCount(0);
}
