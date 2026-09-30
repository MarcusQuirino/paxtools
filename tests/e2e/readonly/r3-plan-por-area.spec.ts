/**
 * P1 — Plan "Por área" view only renders starred items.
 *
 * `escoteiro_with_progression` has one starred plannedItem with key
 * `action:escoteiro:aprendizagem-continua:variable:2`. The bloco's group in
 * the "Por área" view (`plan-group-aprendizagem-continua`, items listed
 * directly — no accordion) must surface ONLY that action — neither sibling
 * variable actions (e.g. `variable:0`, `variable:3`) nor the fixed actions
 * (which are not starred) should be rendered, even though
 * `escoteiro_with_progression` has approved completions on
 * `escoteiro:aprendizagem-continua:fixed:0` and `:fixed:1`.
 *
 * Server contract under test: `usePlan` → `api.plan.getMyPlan` returns only
 * starred plannedItems, and the plan page renders only resolved plan items.
 */

import { progressionTest as test, expect } from "../../fixtures/auth";

const PLANNED_ACTION_ID = "escoteiro:aprendizagem-continua:variable:2";
const UNSTARRED_VARIABLE = "escoteiro:aprendizagem-continua:variable:0";
const UNSTARRED_VARIABLE_OTHER = "escoteiro:aprendizagem-continua:variable:3";
const UNSTARRED_FIXED = "escoteiro:aprendizagem-continua:fixed:0";

test("'Por área' view shows only starred actions for the bloco", async ({
  page,
}) => {
  await page.goto("/plan");

  // The view defaults to "Por área"; click it anyway to make the contract
  // explicit and survive a default-mode flip.
  await page.getByRole("tab", { name: "Por área" }).click();

  // The bloco group with the starred item should be present.
  const group = page.getByTestId("plan-group-aprendizagem-continua");
  await expect(group).toBeVisible();

  // Starred item visible.
  await expect(group.locator(`[id="${PLANNED_ACTION_ID}"]`)).toBeVisible();

  // Non-starred siblings MUST NOT render (plan-only).
  await expect(
    page.locator(`[id="${UNSTARRED_VARIABLE}"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(`[id="${UNSTARRED_VARIABLE_OTHER}"]`),
  ).toHaveCount(0);
  await expect(page.locator(`[id="${UNSTARRED_FIXED}"]`)).toHaveCount(0);
});
