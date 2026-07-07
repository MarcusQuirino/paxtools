/**
 * R5 · Admin lists — read-sides of the membership / member-management stories
 * (PRD #58, stories 43–47) against the seeded sim troop.
 *
 * STRICTLY READ-ONLY: this spec never approves, rejects, promotes, bans, or
 * edits anything. It only asserts what the admin sees. All names/roles/ramos are
 * pinned by `SIM_SPECS` + the catalog in `convex/testing.ts` and were verified
 * against the deployment via a one-off query (2026-07-06).
 *
 * The 8 pending members = 4 sim pending scouts (one per ramo) + 2 sim pending
 * escotistas (lobinho + pioneiro) + the 2 catalog pending personas ("pending"
 * escoteiro, "escotista-pending" escotista).
 *
 * NOTE ON GROUP INFO: `/escotista/admin` renders only the pending + members
 * sections. The group's name/number live on the painel (`/escotista` index
 * `stats.group.name`), so the group-info read-side is asserted there.
 */
import { adminTest, approvedTest, expect } from "../../fixtures/auth";

adminTest(
  "pending memberships list shows exactly the 8 seeded pending members",
  async ({ page }) => {
    await page.goto("/escotista/admin");

    const pendingSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Solicitações pendentes" }),
    });
    await expect(pendingSection).toBeVisible({ timeout: 15_000 });

    // Header badge = pending.length = 8.
    await expect(pendingSection.getByText("8", { exact: true })).toBeVisible();

    // Each seeded pending persona has a card. Sim scouts (one per ramo):
    for (const name of [
      "Théo Barcellos", // pending escoteiro · lobinho
      "Manu Setúbal", // pending escoteiro · escoteiro
      "Ivan Queiroga", // pending escoteiro · senior
      "Bia Frota", // pending escoteiro · pioneiro
      "Olga Ventura", // pending escotista · lobinho
      "Pedro Sabino", // pending escotista · pioneiro
    ]) {
      await expect(pendingSection.getByText(name, { exact: true })).toBeVisible();
    }
    // Catalog pending personas (display names are literally these).
    await expect(
      pendingSection.getByText("pending", { exact: true }),
    ).toBeVisible(); // catalog escoteiro-pending
    await expect(
      pendingSection.getByText("escotista-pending", { exact: true }),
    ).toBeVisible(); // catalog escotista-pending

    // Card sublabels carry role · ramo — spot-check both roles render.
    const theo = pendingSection.locator("li", { hasText: "Théo Barcellos" });
    await expect(theo).toContainText("Escoteiro");
    await expect(theo).toContainText("Lobinho");
    const olga = pendingSection.locator("li", { hasText: "Olga Ventura" });
    await expect(olga).toContainText("Escotista");
    await expect(olga).toContainText("Lobinho");

    // Sanity: no more than the 8 pending cards (exact-count guard).
    await expect(pendingSection.locator("li")).toHaveCount(8);
  },
);

adminTest(
  "members list shows role, ramo, and the admin badge",
  async ({ page }) => {
    await page.goto("/escotista/admin");

    const membersSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Membros" }),
    });
    await expect(membersSection).toBeVisible({ timeout: 15_000 });

    // Admin's own row: the "(você)" marker + the "admin" badge. Only the catalog
    // `admin` is an admin. The name sits in a <p> whose combined text is
    // "admin(você)admin", so the ONLY element with exact text "admin" is the
    // Badge itself → exactly one admin badge in the whole members list.
    const selfRow = membersSection.locator("li", { hasText: "(você)" });
    await expect(selfRow).toHaveCount(1);
    await expect(selfRow).toContainText("Escotista"); // role label
    await expect(membersSection.getByText("admin", { exact: true })).toHaveCount(
      1,
    );

    // An escoteiro member shows role · ramo.
    const otto = membersSection.locator("li", { hasText: "Otto Vilela" });
    await expect(otto).toContainText("Escoteiro");
    await expect(otto).toContainText("Lobinho");

    // A (non-admin) escotista member shows role · ramo without an admin badge.
    const marina = membersSection.locator("li", { hasText: "Marina Solano" });
    await expect(marina).toContainText("Escotista");
    await expect(marina).toContainText("Lobinho");
  },
);

adminTest("group info (name) renders on the painel", async ({ page }) => {
  await page.goto("/escotista");
  // The group card heads the painel with the group name (+ nº).
  await expect(
    page.getByRole("heading", { name: /__TEST__ Grupo QA/ }),
  ).toBeVisible({ timeout: 15_000 });
});

approvedTest("escoteiro is bounced off the admin page", async ({ page }) => {
  await page.goto("/escotista/admin");
  // A non-admin escoteiro hits the guarded route and lands on the restricted
  // notice / gets redirected — either way the admin lists never render.
  await expect(
    page.getByRole("heading", { name: "Solicitações pendentes" }),
  ).toHaveCount(0, { timeout: 10_000 });
});
