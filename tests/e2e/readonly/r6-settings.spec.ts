/**
 * R6 — Settings page (/settings): profile, role, group info, admin-only section.
 *
 * Cluster R6 of issue #58. READ-ONLY: opens /settings for three personas and
 * asserts rendered, seed-derived values. Never submits a form, never renames,
 * never leaves/creates/deletes a group.
 *
 * What /settings actually renders (src/routes/settings.tsx), per role:
 *   - "Seu nome"  → name <input> whose value is the viewer's current name.
 *   - "Seu papel" → a badge reading "Escoteiro" or "Escotista".
 *   - "Grupo"     → the group name text. For an escotista (non-pending) it also
 *                   shows the invite password + "Compartilhe a senha…" helper;
 *                   an escoteiro sees neither.
 *   - "Gerenciar grupo" → admin-only management section, gated by
 *                   `getMyGroup().isAdmin`. Present only for the admin persona.
 *
 * NOT asserted (product facts, see report):
 *   - The viewer's EMAIL is never displayed on this page.
 *   - The group NUMBER (99999) is returned by getMyGroup but never rendered.
 */

import { approvedTest, escotistaTest, adminTest, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";

const GROUP_NAME = "__TEST__ Grupo QA";
const ADMIN_HEADING = "Gerenciar grupo";

/**
 * Wait until the settings page has hydrated (its first section is visible).
 *
 * Self-heals a revoked session: this suite boots 24 fresh contexts from three
 * shared storageState files, and Convex Auth's single-use refresh-token
 * rotation can revoke a session mid-run when boots interleave (concentrated
 * here in CI, where low latency tightens the race). If we land on /signin,
 * re-authenticate via the test form (sign-in only, no data mutation) and
 * continue — the same pattern the mutating specs use.
 */
async function gotoSettings(page: Page, email: string): Promise<void> {
  await page.goto("/settings");
  const heading = page.getByRole("heading", { name: "Seu nome" });
  const signinEmail = page.getByTestId("test-signin-email");
  await expect(heading.or(signinEmail).first()).toBeVisible({
    timeout: 20_000,
  });
  if (await signinEmail.isVisible()) {
    await signinEmail.fill(email);
    await page
      .getByTestId("test-signin-password")
      .fill(process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only");
    await page.getByTestId("test-signin-submit").click();
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 20_000 });
    await page.goto("/settings");
    await expect(heading).toBeVisible({ timeout: 20_000 });
  }
}

// ── Escoteiro persona: escoteiro-approved (name "approved", not admin) ───────
approvedTest.describe("R6 settings — escoteiro (approved)", () => {
  approvedTest.beforeEach(async ({ page }) => {
    await gotoSettings(page, "approved@test.paxtools.local");
  });

  approvedTest("profile shows the signed-in escoteiro's current name", async ({
    page,
  }) => {
    await expect(page.getByPlaceholder("Seu nome")).toHaveValue("approved");
  });

  approvedTest("role section shows the Escoteiro badge", async ({ page }) => {
    const roleSection = page.locator("section", { hasText: "Seu papel" });
    await expect(
      roleSection.getByText("Escoteiro", { exact: true }),
    ).toBeVisible();
  });

  approvedTest("group section shows the group name", async ({ page }) => {
    await expect(page.getByText(GROUP_NAME).first()).toBeVisible();
  });

  approvedTest("escoteiro sees no invite-password share text", async ({
    page,
  }) => {
    // The "Compartilhe a senha…" helper only renders when a password is
    // returned, which happens for escotistas only.
    await expect(page.getByText(/Compartilhe a senha/i)).toHaveCount(0);
  });

  approvedTest("no admin-only management section for a non-admin escoteiro", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: ADMIN_HEADING }),
    ).toHaveCount(0);
  });
});

// ── Escotista persona: escotista (name "escotista", NOT admin) ───────────────
escotistaTest.describe("R6 settings — escotista (non-admin)", () => {
  escotistaTest.beforeEach(async ({ page }) => {
    await gotoSettings(page, "escotista@test.paxtools.local");
  });

  escotistaTest("profile shows the signed-in escotista's current name", async ({
    page,
  }) => {
    await expect(page.getByPlaceholder("Seu nome")).toHaveValue("escotista");
  });

  escotistaTest("role section shows the Escotista badge", async ({ page }) => {
    const roleSection = page.locator("section", { hasText: "Seu papel" });
    await expect(
      roleSection.getByText("Escotista", { exact: true }),
    ).toBeVisible();
  });

  escotistaTest("group section shows the group name and invite share text", async ({
    page,
  }) => {
    await expect(page.getByText(GROUP_NAME).first()).toBeVisible();
    // Escotistas (non-pending) get the invite password + share helper.
    await expect(page.getByText(/Compartilhe a senha/i)).toBeVisible();
  });

  escotistaTest("no admin-only management section for a non-admin escotista", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: ADMIN_HEADING }),
    ).toHaveCount(0);
  });
});

// ── Admin persona: admin (name "admin", role escotista, isAdmin) ─────────────
adminTest.describe("R6 settings — admin", () => {
  adminTest.beforeEach(async ({ page }) => {
    await gotoSettings(page, "admin@test.paxtools.local");
  });

  adminTest("profile shows the signed-in admin's current name", async ({
    page,
  }) => {
    await expect(page.getByPlaceholder("Seu nome")).toHaveValue("admin");
  });

  adminTest("group section shows the group name", async ({ page }) => {
    await expect(page.getByText(GROUP_NAME).first()).toBeVisible();
  });

  adminTest("admin-only management section is present", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: ADMIN_HEADING }),
    ).toBeVisible();
    // The danger-zone delete trigger confirms this is the admin section.
    // Presence only — never clicked.
    await expect(
      page.getByRole("button", { name: /Excluir grupo/i }),
    ).toBeVisible();
  });
});
