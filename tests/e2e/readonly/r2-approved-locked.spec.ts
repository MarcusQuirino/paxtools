/**
 * P0 — Approved item is locked: escoteiro cannot un-check it.
 *
 * `escoteiro_with_progression` has `actionCompletions` rows seeded with
 * curriculum-shaped IDs that pass `ACTION_ID_PATTERN` in convex/progression.ts.
 * The fixed action `escoteiro:aprendizagem-continua:fixed:0` is seeded `status:"approved"`.
 *
 * The bloco screen's `ActionItem` (src/components/progression/action-item.tsx)
 * renders this as an `ActionCheck` (`<button role="checkbox"
 * data-state="approved">`) with `disabled` set (lockApproved for the
 * escoteiro). That asserts the user-visible lock. We also click it to confirm
 * clicks are swallowed by the disabled affordance — `data-state` MUST remain
 * "approved".
 */

import { progressionTest as test, expect } from "../../fixtures/auth";
import { openBloco } from "../shared/bloco-nav";

const APPROVED_ACTION_ID = "escoteiro:aprendizagem-continua:fixed:0";
const BLOCO_ID = "aprendizagem-continua";

test("approved fixed action renders disabled and stays checked when clicked", async ({
  page,
}) => {
  await page.goto("/");

  // Open the bloco screen containing the approved action (tap its row).
  await openBloco(page, BLOCO_ID);

  const checkbox = page.locator(`[id="${APPROVED_ACTION_ID}"]`);
  await expect(checkbox).toBeVisible();

  // The lock surfaces as `disabled` on the check button.
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toHaveAttribute("data-state", "approved");

  // Force-click anyway. A disabled button MUST NOT toggle off, and there
  // should be no console error mentioning the approved-lock error string
  // (clicks on disabled controls should be swallowed entirely).
  await checkbox.click({ force: true }).catch(() => {});
  await expect(checkbox).toHaveAttribute("data-state", "approved");
  await expect(checkbox).toBeDisabled();
});
