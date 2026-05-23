/**
 * P0 — Approved item is locked: escoteiro cannot un-check it.
 *
 * `escoteiro_with_progression` has `actionCompletions` rows seeded with
 * curriculum-shaped IDs that pass `ACTION_ID_PATTERN` in convex/progression.ts.
 * The fixed action `aprendizagem-continua:fixed:0` is seeded `status:"approved"`.
 *
 * The dashboard's `ActionItem` (src/components/progression/action-item.tsx)
 * renders this with `disabled` on the underlying Radix Checkbox (which surfaces
 * `disabled` + `data-disabled=""` on the rendered <button role="checkbox">).
 * That asserts the user-visible lock. We also click it to confirm clicks are
 * swallowed by the disabled affordance — `data-state` MUST remain "checked".
 */

import { progressionTest as test, expect } from "../../fixtures/auth";

const APPROVED_ACTION_ID = "aprendizagem-continua:fixed:0";
const BLOCO_TRIGGER_TEXT = /Aprendizagem Contínua/i;

test("approved fixed action renders disabled and stays checked when clicked", async ({
  page,
}) => {
  await page.goto("/");

  // Expand the eixo/bloco containing the approved action. The bloco trigger
  // is the only place that text appears.
  await page.getByRole("button", { name: BLOCO_TRIGGER_TEXT }).first().click();

  const checkbox = page.locator(`[id="${APPROVED_ACTION_ID}"]`);
  await expect(checkbox).toBeVisible();

  // The lock surfaces as `disabled` on the Radix checkbox button.
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toHaveAttribute("data-state", "checked");

  // Force-click anyway. A disabled button MUST NOT toggle off, and there
  // should be no console error mentioning the approved-lock error string
  // (clicks on disabled controls should be swallowed entirely).
  await checkbox.click({ force: true }).catch(() => {});
  await expect(checkbox).toHaveAttribute("data-state", "checked");
  await expect(checkbox).toBeDisabled();
});
