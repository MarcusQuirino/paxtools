/**
 * P0 — Approval queue workflow: escoteiro marks an action → it appears in the
 * escotista's pending queue → the escotista rejects it → it disappears for the
 * escoteiro. Exercises the escotista progression-approval UI
 * (`getPendingForGroup` + `bulkAction` reject), which the read-only specs do
 * not cover.
 *
 * Reject (not approve) is used deliberately: rejecting DELETES the pending row,
 * so the test leaves no approved/locked state behind and is fully repeatable.
 * The complementary locked-after-approval state is covered by
 * `escoteiro/approved-locked.spec.ts`.
 *
 * Uses two browser contexts (escoteiro + admin) since the flow spans two roles.
 */

import { test, expect } from "@playwright/test";

const ACTION_ID = "escoteiro:aprendizagem-continua:fixed:1";
const BLOCO_TRIGGER = /Aprendizagem Contínua/i;
const ESCOTEIRO_STATE = "tests/.auth/escoteiro-approved.json";
const ADMIN_STATE = "tests/.auth/admin.json";
const ESCOTEIRO_NAME = "approved";

test("escoteiro mark → appears in escotista queue → escotista reject removes it", async ({
  browser,
}) => {
  test.setTimeout(60_000);

  const escCtx = await browser.newContext({ storageState: ESCOTEIRO_STATE });
  const adminCtx = await browser.newContext({ storageState: ADMIN_STATE });
  const escPage = await escCtx.newPage();
  const adminPage = await adminCtx.newPage();
  const escCheckbox = escPage.locator(`[id="${ACTION_ID}"]`);

  const expandBloco = (p: typeof escPage) =>
    p.getByRole("button", { name: BLOCO_TRIGGER }).first().click();

  try {
    // 1. Escoteiro marks the action → pending (a self-marked item, never locked).
    await escPage.goto("/");
    await expandBloco(escPage);
    await expect(escCheckbox).toBeVisible();
    if ((await escCheckbox.getAttribute("data-state")) === "checked") {
      await escCheckbox.click();
      await expect(escCheckbox).toHaveAttribute("data-state", "unchecked");
    }
    await escCheckbox.click();
    await expect(escCheckbox).toHaveAttribute("data-state", "checked");

    // 2. Admin sees the escoteiro's pending card in the queue and rejects it.
    await adminPage.goto("/escotista");
    await adminPage.getByRole("link", { name: "Pendentes" }).click();
    const card = adminPage.getByRole("button", {
      name: new RegExp(ESCOTEIRO_NAME, "i"),
    });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click(); // expand
    await adminPage.getByRole("button", { name: /^Rejeitar/ }).click();
    await expect(card).toHaveCount(0, { timeout: 15_000 });

    // 3. The action is gone for the escoteiro (fresh query via reload).
    await escPage.reload();
    await expandBloco(escPage);
    await expect(escCheckbox).toHaveAttribute("data-state", "unchecked");
  } finally {
    // Safety net: if something failed mid-flow, unmark the (always-unlockable)
    // pending item so the next run starts clean.
    try {
      await escPage.goto("/");
      await expandBloco(escPage);
      if ((await escCheckbox.getAttribute("data-state")) === "checked") {
        await escCheckbox.click();
      }
    } catch {
      // context may already be tearing down; ignore.
    }
    await escCtx.close();
    await adminCtx.close();
  }
});
