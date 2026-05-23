/**
 * P0 — Admin sees pending escotista join request on `/escotista/admin`.
 *
 * The seeded `escotista-pending` user is in the same group with
 * membershipStatus="pending". Admin should see them under "Solicitações
 * pendentes" with an approve (✓) action.
 *
 * READ-ONLY: this spec intentionally does NOT click approve, to avoid
 * mutating shared seeded state between specs. The approve-membership
 * mutation path is exercised in a separate cleanup-bracketed spec.
 */

import { adminTest as test, expect } from "../../fixtures/auth";

const PENDING_USER_NAME = "escotista-pending";

test("admin sees pending escotista in Solicitações pendentes", async ({
  page,
}) => {
  await page.goto("/escotista/admin");

  await expect(
    page.getByRole("heading", { name: "Solicitações pendentes" }),
  ).toBeVisible();

  // Pending entry is rendered with the seeded display name.
  await expect(
    page.getByText(PENDING_USER_NAME, { exact: false }).first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("admin sees Admin tab in escotista nav", async ({ page }) => {
  await page.goto("/escotista");
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});
