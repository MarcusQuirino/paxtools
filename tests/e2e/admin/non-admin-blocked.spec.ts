/**
 * P0 — Non-admin escotista cannot reach `/escotista/admin`.
 *
 * Route renders an "Acesso restrito" panel when the viewer is not admin
 * (driven by `myGroup.isAdmin` from `getMyGroup`). The Admin nav tab must
 * also be absent on the layout (covers UX leakage path).
 */

import { escotistaTest as test, expect } from "../../fixtures/auth";

test("non-admin escotista hits Acesso restrito on /escotista/admin", async ({
  page,
}) => {
  await page.goto("/escotista/admin");

  await expect(
    page.getByRole("heading", { name: "Acesso restrito" }),
  ).toBeVisible();

  // No leaked pending-membership section appears.
  await expect(
    page.getByRole("heading", { name: "Solicitações pendentes" }),
  ).toHaveCount(0);

  // Back-to-dashboard CTA is the only path forward.
  await expect(
    page.getByRole("button", { name: /Voltar ao painel/i }),
  ).toBeVisible();
});

test("non-admin escotista does not see Admin tab in escotista nav", async ({
  page,
}) => {
  await page.goto("/escotista");
  await expect(page.getByRole("link", { name: "Painel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
});
