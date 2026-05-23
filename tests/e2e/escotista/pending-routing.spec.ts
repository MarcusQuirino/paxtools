/**
 * P0 — Pending escotista routing.
 *
 * A user with role=escotista, groupId set, membershipStatus="pending" must:
 *   - See `PendingApprovalScreen` on `/escotista`.
 *   - NOT see the Painel/Pendentes/Admin nav tabs.
 *   - NOT have the group password leaked anywhere on the page
 *     (the seed group password is `TESTQA`).
 *
 * Server contract under test: `getMyGroup` returns `password: null` for
 * pending escotistas; `getGroupStats` returns null; route-level gate.
 */

import { escotistaPendingTest as test, expect } from "../../fixtures/auth";

test("pending escotista sees waiting screen, no nav tabs, no password leak", async ({
  page,
}) => {
  await page.goto("/escotista");

  // Pending screen is visible.
  await expect(
    page.getByRole("heading", { name: "Aguardando aprovação" }),
  ).toBeVisible();

  // Cancel-request button (calls leaveGroup) is offered.
  await expect(
    page.getByRole("button", { name: /Cancelar solicitação/i }),
  ).toBeVisible();

  // No dashboard nav tabs render while pending.
  await expect(page.getByRole("link", { name: "Painel" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pendentes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

  // The seeded group password MUST NOT appear in the DOM for a pending user.
  // `TESTQA` is set in convex/testing.ts; this catches a future regression
  // where `getMyGroup` stops nulling password for pending status.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("TESTQA");
});
