/**
 * M17 — Group rename + per-ramo unit rename, self-restoring (issue #58, story 48).
 *
 * The admin persona (role escotista, isAdmin) drives the "Gerenciar grupo"
 * admin section on /settings (src/routes/settings.tsx → GroupAdminSection):
 *   - renames the group to a marker name, and
 *   - sets the Escoteiro unit name (ramoNames.escoteiro) to a marker.
 * `groups.updateGroup` persists both onto the SHARED group row.
 *
 * OWNERSHIP: this spec is the SOLE owner of the group row's name/ramoNames
 * (tests/utils/personas.ts). No other spec asserts the group name, precisely so
 * this transient rename can't race them. A leaked rename would break R6 and the
 * escotista painel, so restoration is mandatory and verified.
 *
 * Cross-member propagation is checked from a SECOND member context
 * (escoteiro-approved), whose /settings "Grupo" section renders group.name.
 *
 * Unit-name propagation: `unitLabel` (src/lib/ramos.ts) is defined but rendered
 * NOWHERE in the product UI — the per-ramo unit name never surfaces to members
 * (see report). So the only observable it has is the round-trip back through
 * getMyGroup → the admin form's own input value; we verify persistence there.
 *
 * finally{} restores the seeded state (name "__TEST__ Grupo QA", ramoNames {})
 * even on assertion failure, then re-reads to prove restoration succeeded.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";

const test = testAs("admin--m17");

const ORIGINAL_NAME = "__TEST__ Grupo QA";
const RENAMED = "__TEST__ Grupo QA (renomeado)";
const UNIT_MARKER = "__TEST__ Tropa QA";

const ESCOTEIRO_STATE = "tests/.auth/escoteiro-approved--m17.json";

const ADMIN_HEADING = "Gerenciar grupo";
const nameInput = (p: Page) => p.locator("#admin-group-name");
const unitInput = (p: Page) => p.locator("#ramo-name-escoteiro");
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

/** Rename + set the escoteiro unit name, save, and wait for persistence. */
async function saveGroup(
  p: Page,
  name: string,
  unit: string | null,
): Promise<void> {
  await nameInput(p).fill(name);
  // Empty string clears ramoNames.escoteiro (RamoNamesInputs deletes the key).
  await unitInput(p).fill(unit ?? "");
  await saveBtn(p).click();
  // The button re-disables once the reactive query catches up (dirty=false).
  await expect(saveBtn(p)).toBeDisabled({ timeout: 15_000 });
}

test("admin renames group + escoteiro unit, member sees it, then restores", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);

  try {
    // ── Rename group + set escoteiro unit name ───────────────────────────────
    await gotoAdminSettings(page);
    // Sanity: we start from the seeded name.
    await expect(nameInput(page)).toHaveValue(ORIGINAL_NAME);
    await saveGroup(page, RENAMED, UNIT_MARKER);

    // Persisted on the server: a fresh load rehydrates from getMyGroup.
    await gotoAdminSettings(page);
    await expect(nameInput(page)).toHaveValue(RENAMED);
    // Unit-name round-trip (the only observable — unitLabel renders nowhere).
    await expect(unitInput(page)).toHaveValue(UNIT_MARKER);

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
    // then write back the seeded name + empty ramoNames.
    await gotoAdminSettings(page);
    await saveGroup(page, ORIGINAL_NAME, null);

    // VERIFY restoration on the server (fresh reload). A leaked rename breaks
    // R6 and the escotista painel, so this must hold.
    await gotoAdminSettings(page);
    await expect(nameInput(page)).toHaveValue(ORIGINAL_NAME);
    await expect(unitInput(page)).toHaveValue("");

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
