/**
 * M17 — Group rename, self-restoring (issue #58, story 48).
 *
 * The admin persona (role escotista, isAdmin) drives the "Gerenciar grupo"
 * admin section on /settings (src/routes/settings.tsx → GroupAdminSection),
 * renaming the group to a marker name. `groups.updateGroup` persists it onto
 * the SHARED group row.
 *
 * OWNERSHIP: this spec is the SOLE owner of the group row's name
 * (tests/utils/personas.ts). No other spec asserts the group name, precisely so
 * this transient rename can't race them. A leaked rename would break R6 and the
 * escotista painel, so restoration is mandatory and verified.
 *
 * Cross-member propagation is checked from a SECOND member context
 * (escoteiro-approved), whose /settings "Grupo" section renders group.name.
 *
 * Seções (#72) replaced the per-ramo unit-name inputs this spec used to drive;
 * they are a separate row per grupo, mutated by their own admin-only mutations,
 * and covered by convex-test in convex/groups.test.ts.
 *
 * finally{} restores the seeded name ("__TEST__ Grupo QA") even on assertion
 * failure, then re-reads to prove restoration succeeded.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";

const test = testAs("admin--m17");

const ORIGINAL_NAME = "__TEST__ Grupo QA";
const RENAMED = "__TEST__ Grupo QA (renomeado)";

const ESCOTEIRO_STATE = "tests/.auth/escoteiro-approved--m17.json";

const ADMIN_HEADING = "Gerenciar grupo";
const nameInput = (p: Page) => p.locator("#admin-group-name");
const saveBtn = (p: Page) =>
  p.getByRole("button", { name: /Salvar alterações/i });

/**
 * Open /settings and wait for the given heading to hydrate. This suite shares
 * the `admin`/`escoteiro-approved` LOGINS with many other specs; when the whole
 * suite runs concurrently, a captured session can be momentarily bounced to
 * /signin while another process refreshes the shared token. A reload re-reads
 * the (still-valid) storageState, so a bounded retry rides out that transient
 * without mutating any auth file (ownership rule: we may not refresh a persona
 * we don't own).
 */
async function gotoSettingsAwait(p: Page, heading: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await p.goto("/settings");
    const target = p.getByRole("heading", { name: heading });
    const signin = p.getByRole("heading", { name: "Bem-vindo de volta" });
    try {
      await expect(target.or(signin).first()).toBeVisible({ timeout: 15_000 });
    } catch {
      continue;
    }
    if (await target.isVisible().catch(() => false)) return;
    await p.waitForTimeout(1_500); // transient signin bounce; retry the load
  }
  await expect(p.getByRole("heading", { name: heading })).toBeVisible({
    timeout: 15_000,
  });
}

/** Open admin /settings and wait for the manage-group section to hydrate. */
async function gotoAdminSettings(p: Page): Promise<void> {
  await gotoSettingsAwait(p, ADMIN_HEADING);
}

/** Rename the group, save, and wait for persistence. */
async function saveGroup(p: Page, name: string): Promise<void> {
  await nameInput(p).fill(name);
  await saveBtn(p).click();
  // The button re-disables once the reactive query catches up (dirty=false).
  await expect(saveBtn(p)).toBeDisabled({ timeout: 15_000 });
}

test("admin renames the group, member sees it, then restores", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);

  try {
    // ── Rename group ─────────────────────────────────────────────────────────
    await gotoAdminSettings(page);
    // Sanity: we start from the seeded name.
    await expect(nameInput(page)).toHaveValue(ORIGINAL_NAME);
    await saveGroup(page, RENAMED);

    // Persisted on the server: a fresh load rehydrates from getMyGroup.
    await gotoAdminSettings(page);
    await expect(nameInput(page)).toHaveValue(RENAMED);

    // ── Cross-member propagation: a second member sees the new group name ─────
    const memberCtx = await browser.newContext({
      storageState: ESCOTEIRO_STATE,
    });
    try {
      const memberPage = await memberCtx.newPage();
      await gotoSettingsAwait(memberPage, "Seu nome");
      // exact:true — RENAMED contains ORIGINAL_NAME as a substring, so a loose
      // match would be ambiguous.
      await expect(
        memberPage.getByText(RENAMED, { exact: true }).first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        memberPage.getByText(ORIGINAL_NAME, { exact: true }),
      ).toHaveCount(0);
    } finally {
      await memberCtx.close();
    }
  } finally {
    // ── Restore seeded state (runs even on assertion failure) ────────────────
    // Fresh load so the form remounts with whatever is currently persisted,
    // then write back the seeded name.
    await gotoAdminSettings(page);
    await saveGroup(page, ORIGINAL_NAME);

    // VERIFY restoration on the server (fresh reload). A leaked rename breaks
    // R6 and the escotista painel, so this must hold.
    await gotoAdminSettings(page);
    await expect(nameInput(page)).toHaveValue(ORIGINAL_NAME);

    // And confirm a member context sees the restored name (no leak downstream).
    const verifyCtx = await browser.newContext({
      storageState: ESCOTEIRO_STATE,
    });
    try {
      const verifyPage = await verifyCtx.newPage();
      await gotoSettingsAwait(verifyPage, "Seu nome");
      await expect(
        verifyPage.getByText(ORIGINAL_NAME, { exact: true }).first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        verifyPage.getByText(RENAMED, { exact: true }),
      ).toHaveCount(0);
    } finally {
      await verifyCtx.close();
    }
  }
});
