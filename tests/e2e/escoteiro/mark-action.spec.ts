/**
 * P0 — Escoteiro self-marks a progression action (pending) and can unmark it.
 *
 * `escoteiro-approved` is an approved group member with NO seeded completions,
 * so the first fixed action of "Aprendizagem Contínua" starts unchecked. An
 * escoteiro marking their own item creates a PENDING completion (it needs an
 * escotista's approval), and — because it is not yet approved — they can still
 * uncheck it. This spec is self-cleaning: it ends by unmarking, and tolerates
 * leftover state from a previous interrupted run by resetting at the start.
 *
 * Server contract: toggleAction inserts a `status:"pending"` row for an
 * escoteiro acting on themselves; toggling again deletes it (no approval lock
 * while pending).
 */

import { approvedTest as test, expect } from "../../fixtures/auth";

const ACTION_ID = "escoteiro:aprendizagem-continua:fixed:0";
const BLOCO_TRIGGER = /Aprendizagem Contínua/i;

test("escoteiro marks an action as pending and can unmark it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: BLOCO_TRIGGER }).first().click();

  const checkbox = page.locator(`[id="${ACTION_ID}"]`);
  await expect(checkbox).toBeVisible();

  // Reset any leftover state so the test is repeatable.
  if ((await checkbox.getAttribute("data-state")) === "checked") {
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "unchecked");
  }

  // Mark it → checked. As a self-marking escoteiro this is a PENDING completion,
  // which (unlike an approved one) is NOT locked — the checkbox stays enabled.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "checked");
  await expect(checkbox).toBeEnabled();

  // Unmark it → back to unchecked. Self-cleaning.
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "unchecked");
});
