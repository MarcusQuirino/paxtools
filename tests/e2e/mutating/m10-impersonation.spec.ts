/**
 * M10 — Escotista impersonation auto-approval (PRD #58, story 40 write side).
 *
 * An escotista opening an escoteiro's read/act view
 * (`/escotista/escoteiro/<id>`, `Dashboard` with `targetUserId`) can toggle a
 * progression ação on the escoteiro's behalf. Unlike the escoteiro self-marking
 * (which creates a PENDING completion), an escotista toggling in impersonation
 * records the ação as APPROVED immediately (`toggleAction` with a targetUserId —
 * see convex/progression.ts). Toggling it OFF again deletes the row.
 *
 * Both directions are asserted, which is also what makes the spec self-cleaning:
 * it ends with the ação unchecked, exactly as the seed left it.
 *
 * Ownership (tests/utils/personas.ts): this spec owns Dante Meireles
 * (sim-troop-pioneiro-2) and mutates only his row. Vera Lacerda
 * (sim-escotista-pioneiro-1) is the impersonator — a SHARED login, never
 * mutated; no group/painel counts are asserted.
 *
 * ACTION_ID `pioneiro:autonomia-lideranca:fixed:0` is deterministically UNCHECKED
 * for Dante: his seed (blocks:2, idx 1) completes `aprendizagem-continua` +
 * `comunidade` and leaves one pending ação in `consumo-responsavel`; the
 * `autonomia-lideranca` bloco is untouched.
 *
 * Two contexts: Vera acts via impersonation, Dante confirms he sees the ação
 * approved (on his own dashboard an approved item is checked AND locked/disabled,
 * which a merely-pending item would not be — the approval proof).
 */

import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";

const VERA_SLUG = "sim-escotista-pioneiro-1--m10";
const DANTE_SLUG = "sim-troop-pioneiro-2";
const VERA_STATE = `tests/.auth/${VERA_SLUG}.json`;
const DANTE_STATE = `tests/.auth/${DANTE_SLUG}.json`;
const VERA_EMAIL = "sim-escotista-pioneiro-1@test.paxtools.local";
const DANTE_EMAIL = `${DANTE_SLUG}@test.paxtools.local`;
const DANTE_NAME = "Dante Meireles";
const ACTION_ID = "pioneiro:autonomia-lideranca:fixed:0";
const BLOCO_TRIGGER = /Autonomia e Liderança/i;

/**
 * Dead storageState guard (PRD #58 hard rule): captured sessions can expire.
 * The auth redirect to /signin is client-side (fires a tick AFTER `goto`
 * resolves), so we race the signin form against a `ready` locator instead of
 * checking immediately. If signin wins, re-login via the dev-only test form and
 * refresh this persona's own auth file — no `testing:*` call.
 */
async function gotoAs(
  page: Page,
  url: string,
  email: string,
  slug: string,
  ready: Locator,
) {
  await page.goto(url);
  const emailField = page.getByTestId("test-signin-email");
  await expect(emailField.or(ready).first()).toBeVisible({ timeout: 25_000 });
  if (await emailField.isVisible()) {
    await signInHere(page, email);
    await page.context().storageState({ path: `tests/.auth/${slug}.json` });
    await page.goto(url);
    await expect(ready.first()).toBeVisible({ timeout: 25_000 });
  }
}

/**
 * Submit the dev-only test signin form, retry-tolerant: under the parallel
 * cold-start storm the first submit can be dropped or the auth round-trip can
 * lag, so re-submit until we leave /signin.
 */
async function signInHere(page: Page, email: string) {
  await expect(async () => {
    if (/\/signin/.test(page.url())) {
      await page.getByTestId("test-signin-email").fill(email);
      await page.getByTestId("test-signin-password").fill("paxtools-test-only");
      await page.getByTestId("test-signin-submit").click();
    }
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
}

test("escotista impersonation auto-approves an ação, then removes it", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const veraCtx = await browser.newContext({ storageState: VERA_STATE });
  const danteCtx = await browser.newContext({ storageState: DANTE_STATE });
  const veraPage = await veraCtx.newPage();
  const dantePage = await danteCtx.newPage();
  const veraCheckbox = veraPage.locator(`[id="${ACTION_ID}"]`);
  const danteCheckbox = dantePage.locator(`[id="${ACTION_ID}"]`);

  // Open Dante's impersonation view from Vera's painel (no raw id needed).
  const openDanteDetail = async () => {
    await gotoAs(
      veraPage,
      "/escotista",
      VERA_EMAIL,
      VERA_SLUG,
      veraPage.getByPlaceholder("Buscar escoteiro..."),
    );
    await veraPage.getByPlaceholder("Buscar escoteiro...").fill("Dante");
    const link = veraPage.getByRole("link", { name: "Ver progressão" });
    await expect(link).toHaveCount(1);
    // Retry-tolerant navigation: under parallel load the click can be dropped.
    // Gate on the impersonation URL, not on Dante's name (which also renders on
    // the painel search card and would match prematurely).
    await expect(async () => {
      if (!/\/escotista\/escoteiro\//.test(veraPage.url())) {
        await link.click();
      }
      await expect(veraPage).toHaveURL(/\/escotista\/escoteiro\//, {
        timeout: 8_000,
      });
    }).toPass({ timeout: 40_000 });
    // Banner text renders only once the impersonation view's getGroupMembers
    // query resolves; under the shared-deployment storm that query can stall on
    // the Suspense skeleton, so reload-retry until the banner appears.
    const banner = veraPage.getByText(/Visualizando como escotista/);
    await expect(async () => {
      if (!(await banner.isVisible().catch(() => false))) {
        await veraPage.reload();
      }
      await expect(banner).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 70_000 });
    await expect(
      veraPage.getByText(DANTE_NAME, { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  };
  const expandVera = () =>
    veraPage.getByRole("button", { name: BLOCO_TRIGGER }).first().click();
  const expandDante = () =>
    dantePage.getByRole("button", { name: BLOCO_TRIGGER }).first().click();

  // Auth-resilient reloads (stale storageState can bounce a reload to /signin
  // when the suite runs without the setup phase). Re-navigate + re-expand.
  let detailUrl = "";
  const reloadVera = async () => {
    await gotoAs(
      veraPage,
      detailUrl,
      VERA_EMAIL,
      VERA_SLUG,
      veraPage.getByText(/Visualizando como escotista/),
    );
    await expandVera();
  };
  const reloadDante = async () => {
    await gotoAs(
      dantePage,
      "/",
      DANTE_EMAIL,
      DANTE_SLUG,
      dantePage.getByRole("button", { name: BLOCO_TRIGGER }).first(),
    );
    await expandDante();
  };

  try {
    await openDanteDetail();
    detailUrl = veraPage.url();
    await expandVera();
    await expect(veraCheckbox).toBeVisible({ timeout: 15_000 });

    // Reset any leftover from an interrupted run so the flow starts clean.
    if ((await veraCheckbox.getAttribute("data-state")) === "checked") {
      await veraCheckbox.click();
      await expect(veraCheckbox).toHaveAttribute("data-state", "unchecked");
    }

    // 1. Toggle ON via impersonation → recorded APPROVED (not pending).
    await veraCheckbox.click();
    await expect(veraCheckbox).toHaveAttribute("data-state", "checked");
    // Approved renders immediately — no pending Clock icon in the ação row.
    await expect(
      veraPage.locator(`label[for="${ACTION_ID}"] svg.lucide-clock`),
    ).toHaveCount(0);

    // 2. Persisted across a fresh query (reload).
    await reloadVera();
    await expect(veraCheckbox).toHaveAttribute("data-state", "checked", {
      timeout: 10_000,
    });

    // 3. Dante sees it approved on his own dashboard: checked AND locked
    //    (an approved item can't be un-checked by the escoteiro; a pending one
    //    would stay enabled — this disabled state is the auto-approval proof).
    await reloadDante();
    await expect(danteCheckbox).toHaveAttribute("data-state", "checked", {
      timeout: 10_000,
    });
    await expect(danteCheckbox).toBeDisabled();

    // 4. Toggle OFF via impersonation → row deleted.
    await veraCheckbox.click();
    await expect(veraCheckbox).toHaveAttribute("data-state", "unchecked");
    await reloadVera();
    await expect(veraCheckbox).toHaveAttribute("data-state", "unchecked", {
      timeout: 10_000,
    });

    // 5. Gone for Dante too.
    await reloadDante();
    await expect(danteCheckbox).toHaveAttribute("data-state", "unchecked", {
      timeout: 10_000,
    });
  } finally {
    // Safety net: leave the ação unchecked (seed baseline) whatever happened.
    try {
      await openDanteDetail();
      await expandVera();
      if ((await veraCheckbox.getAttribute("data-state")) === "checked") {
        await veraCheckbox.click();
      }
    } catch {
      // contexts may be tearing down; ignore.
    }
    await veraCtx.close();
    await danteCtx.close();
  }
});
