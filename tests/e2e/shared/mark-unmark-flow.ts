/**
 * Shared mark/unmark flow (PRD #58 story 27) — an escoteiro self-marks one
 * progression ação (creating a PENDING completion) and then unmarks it.
 *
 * Parameterized by persona + actionId so both the desktop spec (Ana Lima,
 * escoteiro ramo) and the mobile spec (Alice Prado, lobinho ramo) wrap the
 * exact same steps. A self-marked pending item is never locked, so the flow is
 * fully self-cleaning: it ends open (unmarked) and resets any leftover marked
 * state at the start, making it repeatable after an interrupted run.
 *
 * DOM (Design A): Progressão lists bloco rows; tapping one pushes
 * /bloco/<blocoId>, whose ações are `ActionCheck` buttons
 * (`role="checkbox" id="<actionId>" data-state="open|pending|approved"`); the
 * pending clock renders inside the check.
 *
 * Server contract (convex/progression.ts `toggleAction`): an escoteiro acting
 * on themselves inserts a `status:"pending"` row; toggling again deletes it.
 */

import { type Page, expect } from "@playwright/test";
import { blocoIdOf, openBloco } from "./bloco-nav";

export interface MarkUnmarkParams {
  /** Full action id `ramo:blocoId:type:index` — becomes the check's `id`. */
  readonly actionId: string;
  /** Bloco display name — the bloco screen's h1. */
  readonly blocoName: RegExp;
}

export async function runMarkUnmarkFlow(
  page: Page,
  { actionId, blocoName }: MarkUnmarkParams,
): Promise<void> {
  await page.goto("/");
  await openBloco(page, blocoIdOf(actionId));
  await expect(page.getByRole("heading", { level: 1, name: blocoName })).toBeVisible();

  const checkbox = page.locator(`[id="${actionId}"]`);
  await expect(checkbox).toBeVisible();

  // Reset any leftover state from a previous interrupted run so we start clean.
  if ((await checkbox.getAttribute("data-state")) === "pending") {
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "open");
  }

  // Mark → PENDING. As a self-marking escoteiro this needs an escotista's
  // approval, so the check is pending (clock shown) yet still enabled — a
  // pending item is never locked.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "pending");
  await expect(checkbox).toBeEnabled();

  // Pending signal: a clock icon renders inside the check.
  const pendingClock = checkbox.locator("svg.lucide-clock");
  await expect(pendingClock).toBeVisible();

  // Unmark → back to open. Self-cleaning end state.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "open");
  await expect(pendingClock).toHaveCount(0);
}
