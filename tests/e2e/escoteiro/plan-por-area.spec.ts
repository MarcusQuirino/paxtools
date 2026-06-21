/**
 * P1 — Plan "Por Área" view only renders starred items.
 *
 * `escoteiro_with_progression` has one starred plannedItem with key
 * `action:escoteiro:aprendizagem-continua:variable:2`. Expanding the bloco in
 * the "Por Área" view must surface ONLY that action — neither sibling variable
 * actions (e.g. `variable:0`, `variable:3`) nor the fixed actions (which
 * are not starred) should be rendered, even though `escoteiro_with_progression`
 * has approved completions on `escoteiro:aprendizagem-continua:fixed:0` and `:fixed:1`.
 *
 * Server contract under test: `usePlan` → `api.plan.getMyPlan` returns only
 * starred plannedItems, and `ActionChecklist` filters by `planOnly`.
 */

import { progressionTest as test, expect } from "../../fixtures/auth";

const PLANNED_ACTION_ID = "escoteiro:aprendizagem-continua:variable:2";
const UNSTARRED_VARIABLE = "escoteiro:aprendizagem-continua:variable:0";
const UNSTARRED_VARIABLE_OTHER = "escoteiro:aprendizagem-continua:variable:3";
const UNSTARRED_FIXED = "escoteiro:aprendizagem-continua:fixed:0";

test("'Por Área' view shows only starred actions for the bloco", async ({
  page,
}) => {
  await page.goto("/plan");

  // The toggle defaults to "Por Área"; click it anyway to make the contract
  // explicit and survive a default-mode flip.
  await page.getByRole("button", { name: "Por Área" }).click();

  // The bloco with the starred item should be present.
  await page
    .getByRole("button", { name: /Aprendizagem Contínua/i })
    .first()
    .click();

  // Starred item visible.
  await expect(
    page.locator(`[id="${PLANNED_ACTION_ID}"]`),
  ).toBeVisible();

  // Non-starred siblings MUST NOT render (planOnly filter).
  await expect(
    page.locator(`[id="${UNSTARRED_VARIABLE}"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(`[id="${UNSTARRED_VARIABLE_OTHER}"]`),
  ).toHaveCount(0);
  await expect(page.locator(`[id="${UNSTARRED_FIXED}"]`)).toHaveCount(0);
});
