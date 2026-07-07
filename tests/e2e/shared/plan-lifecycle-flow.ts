/**
 * M6 (story 29) — Plan star / drag-reorder / unstar lifecycle, parameterized
 * so the desktop (Íris Campos) and mobile (Júlia Sales) specs share one body.
 *
 * The persona starts with a seeded 4-item plano (the `sc.plan` block in
 * `convex/testing.ts seedSimRamo`). The flow:
 *   1. normalize any leftover from a crashed prior run (unstar the item we add),
 *   2. capture the seeded plano's ordered signatures (4 items),
 *   3. STAR a brand-new action (from a bloco NOT in the seeded plano) on the
 *      dashboard and confirm it lands in the plan (5 items),
 *   4. optionally DRAG-swap the first two ordered rows, prove the new order
 *      PERSISTS, then swap back to restore the original order,
 *   5. finally UNSTAR the added item (in `finally`, so a mid-flow failure still
 *      cleans up), leaving the seeded plano exactly as it was.
 *
 * Order strings are read from the DOM (not hard-coded) so every assertion is
 * relative to a signature captured in the same run — self-consistent under
 * back-to-back reruns.
 *
 * NO page.reload(): the test-auth refresh token is single-use and rotates on
 * every full page load, so a second full load per run (or a rerun) logs the
 * session out. After ONE initial load the whole flow navigates client-side via
 * the PlanNav links. Persistence is proven by a client re-mount (Tudo → Plano)
 * that re-reads `api.plan.getMyPlan` from the live Convex subscription — usePlan
 * holds no optimistic state (src/hooks/use-plan.ts), so a re-mount reflects
 * exactly the committed server order.
 *
 * Drag mechanics: @dnd-kit's PointerSensor (activationConstraint distance:5)
 * activates from the synthetic pointer events Playwright's mouse emits — press
 * the grip, nudge past the threshold, glide to the target grip, drop.
 *
 * OWNERSHIP: each caller mutates only its own persona; assertions touch only
 * that persona's plan (never a global count).
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export type PlanFlowParams = {
  /** Raw curriculum action id to star as the NEW plan item (a bloco that is
   *  NOT part of the seeded plano). Its dashboard checkbox uses this id; its
   *  plan-ordered row uses the `action:<id>` itemKey. */
  readonly newItemActionId: string;
  /** Accordion trigger name (regex) for the bloco holding the new item. */
  readonly blocoTrigger: RegExp;
  /** Whether to exercise the drag-reorder leg (desktop always; mobile if the
   *  touch/pointer drag proves reliable on the target device). */
  readonly includeDrag: boolean;
};

/** The ONLY full page load. A cold parallel handshake can bounce to /signin; a
 *  retry re-attempts (a bounce doesn't auth, so it doesn't rotate the on-disk
 *  token — the retry still has a valid token). Once ready, all further nav is
 *  client-side so the single-use refresh token is never re-exchanged. */
async function initialHome(page: Page, blocoTrigger: RegExp): Promise<void> {
  const trigger = page.getByRole("button", { name: blocoTrigger }).first();
  const signin = page.getByRole("button", { name: "Sign in (test)" });
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto("/");
    const outcome = await Promise.race([
      trigger
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "ready" as const)
        .catch(() => "timeout" as const),
      signin
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "signin" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ready") return;
  }
  await trigger.waitFor({ state: "visible", timeout: 12_000 });
}

/** Client-side nav to the dashboard, converging on the target bloco trigger. */
async function toHome(page: Page, blocoTrigger: RegExp): Promise<void> {
  await page.getByRole("link", { name: "Tudo" }).click();
  await expect(page).not.toHaveURL(/\/plan/, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: blocoTrigger }).first()).toBeVisible();
}

/** Client-side nav to the plan page (ViewToggle present ⇒ non-empty plano). */
async function toPlan(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Plano" }).click();
  await expect(page.getByRole("button", { name: "Minha Ordem" })).toBeVisible({
    timeout: 10_000,
  });
}

/** Switch the plan into the "Minha Ordem" (ordered) view and wait for the
 *  sortable rows to mount. `force` bypasses the Radix/Convex stability gate. */
async function switchToOrdered(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: "Minha Ordem" });
  await expect(toggle).toBeVisible();
  await toggle.click({ force: true });
  await expect(
    page.getByRole("button", { name: "Arrastar" }).first(),
  ).toBeVisible();
}

/** Ordered-view row signatures, top-to-bottom (bloco name + item text). */
async function readOrder(page: Page): Promise<string[]> {
  const grips = page.getByRole("button", { name: "Arrastar" });
  await expect(grips.first()).toBeVisible();
  const n = await grips.count();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const row = grips.nth(i).locator("xpath=..");
    out.push((await row.innerText()).replace(/\s+/g, " ").trim());
  }
  return out;
}

/** Drag the row at `from` onto the row at `to` via its grip handle. Dragging
 *  index 0 onto index 1 swaps the first two rows (and swapping again restores
 *  them). Mouse events carry pointerType "mouse", which activates dnd-kit's
 *  PointerSensor even on a touch-capable device. */
async function dragRow(page: Page, from: number, to: number): Promise<void> {
  const grips = page.getByRole("button", { name: "Arrastar" });
  const s = await grips.nth(from).boundingBox();
  const t = await grips.nth(to).boundingBox();
  if (!s || !t) throw new Error("grip handle not laid out");
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  // Nudge past the 5px activation threshold, glide to the target, settle.
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2 + 10, { steps: 3 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2 + 3, { steps: 3 });
  await page.mouse.up();
  // Let the reorderPlan mutation round-trip before the next read/re-mount.
  await page.waitForTimeout(800);
}

/** Set the new item's star to `desired` from the dashboard (assumes we are
 *  already on the authed dashboard). Idempotent — used to normalize leftover
 *  state at the start and to clean up at the end. */
async function setStar(
  page: Page,
  actionId: string,
  blocoTrigger: RegExp,
  desired: boolean,
): Promise<void> {
  const trigger = page.getByRole("button", { name: blocoTrigger }).first();
  await expect(trigger).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if ((await trigger.getAttribute("aria-expanded")) === "true") break;
    await trigger.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  const star = page
    .locator(`label:has([id="${actionId}"])`)
    .getByRole("button", { name: /plano/i });
  await expect(star).toBeVisible();
  // Converge on the desired pressed state: Convex live re-renders can drop a
  // single click under parallel load, so retry until aria-pressed settles.
  for (let i = 0; i < 5; i++) {
    if (((await star.getAttribute("aria-pressed")) === "true") === desired) return;
    await star.click();
    await page.waitForTimeout(500);
  }
  await expect(star).toHaveAttribute("aria-pressed", String(desired));
}

export async function runPlanLifecycleFlow(
  page: Page,
  { newItemActionId, blocoTrigger, includeDrag }: PlanFlowParams,
): Promise<void> {
  const newKey = `action:${newItemActionId}`;
  const newAnchor = page.locator(`[id="${newKey}"]`);

  await initialHome(page, blocoTrigger);

  // 1. Normalize: a crashed prior run may have left the new item starred.
  await setStar(page, newItemActionId, blocoTrigger, false);

  // 2. Seeded plano baseline (this persona has a 4-item seeded plan).
  await toPlan(page);
  await switchToOrdered(page);
  const baseline = await readOrder(page);
  expect(baseline).toHaveLength(4);

  try {
    // 3. Star a brand-new item and confirm it lands in the plan.
    await toHome(page, blocoTrigger);
    await setStar(page, newItemActionId, blocoTrigger, true);
    await toPlan(page);
    await switchToOrdered(page);
    await expect(newAnchor).toBeVisible();
    const withAdded = await readOrder(page);
    expect(withAdded).toHaveLength(5);
    for (const sig of baseline) expect(withAdded).toContain(sig);

    // 4. Drag-reorder: swap the first two rows, prove it persists, restore.
    if (includeDrag) {
      const expectedSwap = [withAdded[1]!, withAdded[0]!, ...withAdded.slice(2)];

      await dragRow(page, 0, 1);
      // Re-mount from server state (see file header — no full reload).
      await toHome(page, blocoTrigger);
      await toPlan(page);
      await switchToOrdered(page);
      expect(await readOrder(page)).toEqual(expectedSwap);

      // Swapping the first two again restores the pre-drag order.
      await dragRow(page, 0, 1);
      await toHome(page, blocoTrigger);
      await toPlan(page);
      await switchToOrdered(page);
      expect(await readOrder(page)).toEqual(withAdded);
    }
  } finally {
    // 5. Unstar the added item — cleanup runs even on a mid-flow failure.
    await toHome(page, blocoTrigger);
    await setStar(page, newItemActionId, blocoTrigger, false);
  }

  // The seeded plano is back to exactly its 4 items.
  await toPlan(page);
  await switchToOrdered(page);
  await expect(newAnchor).toHaveCount(0);
  expect(await readOrder(page)).toHaveLength(4);
}
