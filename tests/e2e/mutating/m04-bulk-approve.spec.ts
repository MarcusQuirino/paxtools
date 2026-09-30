/**
 * M4 (PRD #58 story 35, bulk side) — the escotista bulk-approve affordance.
 * Quésia Torres (sim-troop-senior-2) carries 2 seeded PENDING ações on her
 * frontier bloco (Consumo Responsável → variable:0 + variable:1). Talita Novaes
 * (sim-escotista-senior-1) taps Quésia's queue card header (selects all her
 * items) and bulk-approves both with one "Aprovar (N)" click → both flip to approved → Quésia's card leaves
 * the queue (totalPending → 0).
 *
 * CLEANUP (achieved: full self-restore).
 *   a) Talita opens Quésia's impersonation dashboard (/escotista/escoteiro/<id>)
 *      → the bloco row → /bloco/<blocoId>?escoteiroId=<id>, where escotistas
 *      keep edit rights (lockApproved=false), and toggles the two now-approved
 *      ações OFF — an escotista direct-toggle deletes the row
 *      (convex/progression.ts toggleAction).
 *   b) As Quésia herself, re-marks the two ações → they return to PENDING,
 *      restoring the seed-equivalent queue material so a rerun exercises fresh.
 *
 * Retry-tolerance: if a prior interrupted run consumed Quésia's pending
 * material without restoring it, her card is absent → the test skips (teardown
 * reseed restores the seed). Talita is a SHARED approver login (M8 drives her
 * queue too), so every assertion is scoped to Quésia's card — never a global
 * count.
 */

import { test, expect } from "@playwright/test";
import { openBloco } from "../shared/bloco-nav";

const SEEDED_IDS = [
  "senior:consumo-responsavel:variable:0",
  "senior:consumo-responsavel:variable:1",
] as const;
const BLOCO_ID = "consumo-responsavel";

const QUESIA_STATE = "tests/.auth/sim-troop-senior-2.json";
const TALITA_STATE = "tests/.auth/sim-escotista-senior-1--m04.json";
const QUESIA_NAME = /Quésia Torres/i;


test("escotista bulk-approves an escoteiro's pending ações, then cleans up", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const talitaCtx = await browser.newContext({ storageState: TALITA_STATE });
  const quesiaCtx = await browser.newContext({ storageState: QUESIA_STATE });
  const talitaPage = await talitaCtx.newPage();
  const quesiaPage = await quesiaCtx.newPage();

  try {
    // 1. Talita opens the queue. If Quésia's card is absent, a prior run
    //    consumed her seed without restoring — skip (teardown reseed restores).
    await talitaPage.goto("/escotista/pending");
    const trigger = talitaPage.getByRole("button", { name: QUESIA_NAME });
    try {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      test.skip(
        true,
        "Quésia has no pending queue material (prior interrupted run); teardown reseed restores it",
      );
    }

    // 2. Tap her card header (selects all her items) and bulk-approve (her 2
    //    seeded) from the sticky action bar.
    await trigger.click();
    const approve = talitaPage
      .getByTestId("pending-action-bar")
      .getByRole("button", { name: /^Aprovar/ });
    await expect(approve).toBeVisible();
    await approve.click();

    // 3. Both approved → her card leaves the queue.
    await expect(
      talitaPage.getByRole("button", { name: QUESIA_NAME }),
    ).toHaveCount(0, { timeout: 15_000 });

    // 4a. Cleanup — Talita impersonation direct-toggle removes the approvals.
    await talitaPage.goto("/escotista");
    await talitaPage
      .getByRole("link", { name: /Ver progressão de Quésia Torres/i })
      .first()
      .click();
    await expect(talitaPage).toHaveURL(/\/escotista\/escoteiro\//);
    await openBloco(talitaPage, BLOCO_ID);
    for (const id of SEEDED_IDS) {
      const cb = talitaPage.locator(`[id="${id}"]`);
      await expect(cb).toHaveAttribute("data-state", "approved");
      await cb.click();
      await expect(cb).toHaveAttribute("data-state", "open"); // deleted
    }

    // 4b. Restore — as Quésia, re-mark the two ações → back to PENDING.
    await quesiaPage.goto("/");
    await openBloco(quesiaPage, BLOCO_ID);
    for (const id of SEEDED_IDS) {
      const cb = quesiaPage.locator(`[id="${id}"]`);
      await expect(cb).toBeVisible();
      if ((await cb.getAttribute("data-state")) === "open") {
        await cb.click();
      }
      await expect(cb).toHaveAttribute("data-state", "pending");
    }
  } finally {
    await talitaCtx.close();
    await quesiaCtx.close();
  }
});
