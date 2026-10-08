/**
 * M24 (mobile, #141) — Revisão rápida end to end, through the four buttons.
 *
 *   1. Lara Fontes (escoteira) opens Revisão rápida from the home card and
 *      uses → já fiz, ↑ pro plano, ← não fiz, then ↓ desfazer (reverts the ←).
 *   2. Leaving early shows the summary: 1 enviada, 1 no plano, 0 não feitas.
 *      Home card count drops by one (the ↑ card is not a conclusão).
 *   3. The → ação lands in her escotista's Pendentes queue; the ↑ ação is in
 *      her Plano.
 *   4. Marina Solano opens Lara's deck from the painel 🃏 button and marks one
 *      ação (approved at once); the painel count drops by one.
 *
 * The deck order is random (Lara has an empty Plano), so the spec reads card
 * texts instead of hard-coding ações. That also makes it retry-safe: a rerun
 * just draws from the still-unmarked ações. Lara has 11 complete blocos and an
 * untouched frontier bloco, so one extra ação never completes a bloco.
 *
 * Ownership (tests/utils/personas.ts): owns Lara Fontes (sim-troop-lobinho-12).
 * Marina (sim-escotista-lobinho-1, own session alias --m24m) is a shared login,
 * never mutated; only Lara's rows/cards are asserted.
 */

import { devices, expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { authFile, personaBySlug } from "../../utils/personas";
import { SCOUT_SIGNIN_ID } from "../../utils/selectors";
import { submitSignIn } from "../../utils/signin";

const LARA = "Lara Fontes";
const LARA_SLUG = "sim-troop-lobinho-12";
const MARINA_SLUG = "sim-escotista-lobinho-1--m24m";

/** First load hydrates for a few seconds before anything renders. */
const HYDRATE = { timeout: 20_000 };

/**
 * First navigation of a context. Captured sessions are single-use (refresh
 * token rotation), so rerunning this spec without a fresh setup lands on
 * /signin: re-login through the real form and refresh the persona's own auth
 * file (same guard as m10-impersonation).
 */
async function gotoAs(page: Page, url: string, slug: string, ready: Locator) {
  await page.goto(url);
  const idField = page.getByTestId(SCOUT_SIGNIN_ID);
  await expect(idField.or(ready).first()).toBeVisible({ timeout: 25_000 });
  if (!(await idField.isVisible())) return;
  await expect(async () => {
    if (/\/signin/.test(page.url())) await submitSignIn(page, personaBySlug(slug).scoutId);
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
  await page.context().storageState({ path: authFile(slug) });
  await page.goto(url);
  await expect(ready).toBeVisible(HYDRATE);
}

const countIn =async (el: Locator): Promise<number> => {
  const m = /(\d+)/.exec(await el.innerText());
  if (!m) throw new Error(`no count in "${await el.innerText()}"`);
  return Number(m[1]);
};

/** The number shown on a summary stat row. */
const statValue = (page: Page, testId: string) =>
  page.getByTestId(testId).locator("span").first();

/** Swipe the top card with a button and wait for the next card to land. */
async function press(page: Page, button: string, total: number, nextPos: number) {
  await page.getByTestId(button).click();
  await expect(page.getByTestId("revisao-counter")).toHaveText(
    `${nextPos} / ${total}`,
  );
}

const cardText = (page: Page) => page.getByTestId("revisao-card-text").innerText();

/** Marina's painel filtered down to Lara's row. */
async function openPainelRow(page: Page): Promise<Locator> {
  await page.goto("/escotista");
  const search = page.getByPlaceholder(/Buscar escoteiro/i);
  await expect(search).toBeVisible(HYDRATE);
  await search.fill(LARA);
  const row = page.locator('[data-tour="escoteiro-card"]', { hasText: LARA });
  await expect(row).toHaveCount(1);
  return row;
}

test("escoteiro reviews with the deck buttons; escotista sees it pending and marks from the painel", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const device = devices["Pixel 7"];
  const laraCtx = await browser.newContext({ ...device, storageState: authFile(LARA_SLUG) });
  const marinaCtx = await browser.newContext({ ...device, storageState: authFile(MARINA_SLUG) });

  try {
    const lara = await laraCtx.newPage();
    const marina = await marinaCtx.newPage();

    // ── 1. Escoteira: home card → deck, → ↑ ← ↓ ─────────────────────────────
    const homeCard = lara.getByTestId("revisao-rapida-card");
    await gotoAs(lara, "/", LARA_SLUG, homeCard);
    const before = await countIn(homeCard);
    expect(before).toBeGreaterThan(3);

    await homeCard.click();
    await expect(lara).toHaveURL(/\/revisao-rapida$/);
    await expect(lara.getByTestId("revisao-counter")).toHaveText(`1 / ${before}`, HYDRATE);

    const doneText = await cardText(lara);
    await press(lara, "revisao-done", before, 2);
    const planText = await cardText(lara);
    await press(lara, "revisao-plan", before, 3);
    const skipText = await cardText(lara);
    await press(lara, "revisao-skip", before, 4);
    await press(lara, "revisao-undo", before, 3);
    // ↓ put the ← card back on top.
    await expect(lara.getByTestId("revisao-card-text")).toHaveText(skipText);

    // ── 2. Summary on early exit ───────────────────────────────────────────
    await lara.getByTestId("revisao-exit").click();
    await expect(lara.getByTestId("revisao-summary")).toBeVisible();
    await expect(statValue(lara, "revisao-summary-done")).toHaveText("1");
    await expect(statValue(lara, "revisao-summary-plan")).toHaveText("1");
    await expect(statValue(lara, "revisao-summary-skip")).toHaveText("0");
    await expect(statValue(lara, "revisao-summary-unseen")).toHaveText(String(before - 2));

    await lara.getByTestId("revisao-summary-exit").click();
    await expect(lara).toHaveURL(/\/$/);
    // Only the → mark is a conclusão; the ↑ card stays in the deck.
    await expect(homeCard).toContainText(`${before - 1} ações`, HYDRATE);

    // "Minha Ordem" is the flat list ("Por Área" starts collapsed).
    await lara.goto("/plan");
    const ordered = lara.getByRole("button", { name: "Minha Ordem" });
    await expect(ordered).toBeVisible(HYDRATE);
    await ordered.click({ force: true });
    await expect(lara.getByText(planText, { exact: true }).first()).toBeVisible();

    // ── 3. Escotista: the → ação is in Pendentes ───────────────────────────
    const laraCard = marina.getByRole("button", { name: new RegExp(LARA, "i") });
    await gotoAs(marina, "/escotista/pending", MARINA_SLUG, laraCard);
    await laraCard.click();
    await expect(marina.getByText(doneText, { exact: true }).first()).toBeVisible();

    // ── 4. Escotista marks for Lara from the painel 🃏 button ───────────────
    let row = await openPainelRow(marina);
    const entry = row.getByTestId("revisao-rapida-entry");
    const painelCount = await countIn(entry);
    expect(painelCount).toBe(before - 1);

    await entry.click();
    await expect(marina).toHaveURL(/\/revisao-rapida\?escoteiroId=/);
    await expect(marina.getByTestId("revisao-target")).toHaveText(
      `Marcando por: ${LARA}`,
      HYDRATE,
    );
    await expect(marina.getByTestId("revisao-counter")).toHaveText(`1 / ${painelCount}`);
    await expect(marina.getByTestId("revisao-plan")).toBeDisabled();

    await press(marina, "revisao-done", painelCount, 2);
    await marina.getByTestId("revisao-exit").click();
    await expect(statValue(marina, "revisao-summary-done")).toHaveText("1");
    await expect(marina.getByTestId("revisao-summary-done")).toContainText("já aprovadas");

    await marina.getByTestId("revisao-summary-exit").click();
    await expect(marina).toHaveURL(/\/escotista$/);
    row = await openPainelRow(marina);
    await expect(row.getByTestId("revisao-rapida-entry")).toHaveText(
      new RegExp(`(^|\\D)${painelCount - 1}$`),
      HYDRATE,
    );
  } finally {
    await laraCtx.close();
    await marinaCtx.close();
  }
});
