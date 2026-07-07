/**
 * M7 (PRD #58 stories 31/37) — younger especialidade item approval → level-up.
 *
 * Two roles, two browser contexts:
 *   - Felipe Duarte (sim-troop-lobinho-6) owns the younger especialidade
 *     "acampamento", seeded inProgress: 3/8 items approved + 1 PENDING item
 *     (one short of the 4-item Nível 1 threshold).
 *   - Marina Solano (sim-escotista-lobinho-1) is the lobinho approver — a SHARED
 *     login. We assert ONLY on Felipe's queue card, never on global counts or on
 *     any other scout's card.
 *
 * Flow:
 *   1. Marina approves Felipe's pending "acampamento" item in her queue
 *      ("Itens de Especialidade" section) → Felipe's /especialidades shows the
 *      especialidade at Nível 1 with 4/8 aprovados.
 *   2. (self-cleaning demo) Felipe marks one more item → it appears PENDING in
 *      Marina's queue → Marina REJECTS it → the pending row is deleted, leaving
 *      Felipe back at 4/8 with no pending item.
 *
 * IDEMPOTENCY / RETRY-SAFETY (the run uses E2E_SKIP_SEED=1 → no reseed between
 * runs): every step detects current state and drives it forward. If the seeded
 * item is already approved (Felipe already at Nível 1, no queue card), step 1 is
 * skipped and we assert the end-state directly. The self-cleaning demo removes
 * any stray pending item it created (and any left by a prior aborted run).
 *
 * CLEANUP: step 1's approval (pending → approved) is not cleanly reversible via
 * the escoteiro UI, so it is forward-only idempotent; the run's teardown reseed
 * restores the pristine 3/8+1-pending state. Step 2 is fully self-cleaning.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const FELIPE_STATE = "tests/.auth/sim-troop-lobinho-6.json";
const MARINA_STATE = "tests/.auth/sim-escotista-lobinho-1--m07.json";
const FELIPE_NAME = "Felipe Duarte";
const SPECIALTY_ID = "acampamento";
const SPECIALTY_NAME = "Acampamento";

const signinButton = (p: Page) =>
  p.getByRole("button", { name: "Sign in (test)" });

/**
 * Navigate a gated escoteiro/escotista page, retrying the goto if the cold auth
 * handshake bounces through /signin (same failure mode the r4 specs absorb).
 */
async function gotoStable(page: Page, url: string, ready: Locator): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url);
    const outcome = await Promise.race([
      ready
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "ready" as const)
        .catch(() => "timeout" as const),
      signinButton(page)
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "signin" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ready") return;
  }
  await ready.waitFor({ state: "visible", timeout: 12_000 });
}

/** The Acampamento SpecialtyCard trigger on Felipe's /especialidades. */
const acampamentoCard = (page: Page) =>
  page.getByRole("button", { name: new RegExp(SPECIALTY_NAME) });

/** Deep-link Felipe into his Acampamento card (auto-opens it). */
async function openFelipeCard(page: Page): Promise<Locator> {
  const card = acampamentoCard(page);
  await gotoStable(page, `/especialidades?specialty=${SPECIALTY_ID}`, card);
  return card;
}

/** One escoteiro's pending-queue card, scoped by name (never global). */
const queueCard = (page: Page, name: string) =>
  page.locator("div.border-2.border-black").filter({ hasText: name }).first();

/**
 * Resolve a scout's queue card, tolerating the reactive-query load race: the
 * page can render a skeleton before the real cards arrive, so we wait for the
 * named card to appear. If it never does (nothing pending → already approved),
 * the wait lapses and the caller treats it as absent.
 */
async function scoutCard(page: Page, name: string): Promise<Locator> {
  const card = queueCard(page, name);
  await card.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
  return card;
}

/** Open Marina's pending queue, waiting for either cards or the empty state. */
async function openQueue(page: Page): Promise<void> {
  const anyCard = page.locator("div.border-2.border-black").first();
  const empty = page.getByText("Tudo em dia!");
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto("/escotista/pending");
    const outcome = await Promise.race([
      anyCard
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "ready" as const)
        .catch(() => "timeout" as const),
      empty
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "ready" as const)
        .catch(() => "timeout" as const),
      signinButton(page)
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "signin" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ready") return;
  }
  throw new Error(
    "escotista queue unreachable (Marina's auth state is likely dead) — " +
      "refresh tests/.auth/sim-escotista-lobinho-1--m07.json via a scratch signin.",
  );
}

test("younger especialidade item approval levels Felipe up to Nível 1", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const felipeCtx = await browser.newContext({ storageState: FELIPE_STATE });
  const marinaCtx = await browser.newContext({ storageState: MARINA_STATE });
  const felipePage = await felipeCtx.newPage();
  const marinaPage = await marinaCtx.newPage();

  try {
    // ── Step 1: Marina approves Felipe's seeded pending "acampamento" item ────
    await openQueue(marinaPage);
    const felipeCard = await scoutCard(marinaPage, FELIPE_NAME);

    if (await felipeCard.count()) {
      // Expand Felipe's card and approve his Acampamento item(s).
      await marinaPage
        .getByRole("button", { name: new RegExp(FELIPE_NAME) })
        .first()
        .click();
      const specSection = felipeCard
        .locator("div.border-2.border-amber-300")
        .filter({ hasText: SPECIALTY_NAME });
      await expect(specSection).toBeVisible({ timeout: 15_000 });
      await specSection.getByRole("button", { name: /Aprovar/ }).click();
      // Felipe had exactly one pending item → his card leaves the queue.
      await expect(felipeCard).toHaveCount(0, { timeout: 15_000 });
    }

    // ── Assert: Felipe's especialidade is now Nível 1 with 4/8 aprovados ──────
    let card = await openFelipeCard(felipePage);
    await expect(card).toContainText("Nível 1", { timeout: 15_000 });
    await expect(card).toContainText("4/8 itens aprovados");

    // ── Step 2: self-cleaning demo — mark one more item, then Marina rejects ──
    // Mark the first still-unstarted item (enabled + unchecked) → pending.
    const unstarted = card
      .locator('button[role="checkbox"][data-state="unchecked"]:not([disabled])')
      .first();
    if (await unstarted.count()) {
      await unstarted.click();
      await expect(card).toContainText("1 pendente", { timeout: 15_000 });
    }

    // Marina finds the freshly pending item and REJECTS it (deletes the row).
    await openQueue(marinaPage);
    const felipeCard2 = await scoutCard(marinaPage, FELIPE_NAME);
    if (await felipeCard2.count()) {
      await marinaPage
        .getByRole("button", { name: new RegExp(FELIPE_NAME) })
        .first()
        .click();
      const specSection2 = felipeCard2
        .locator("div.border-2.border-amber-300")
        .filter({ hasText: SPECIALTY_NAME });
      await expect(specSection2).toBeVisible({ timeout: 15_000 });
      await specSection2.getByRole("button", { name: /Rejeitar/ }).click();
      await expect(felipeCard2).toHaveCount(0, { timeout: 15_000 });
    }

    // ── Assert: back to the clean 4/8 Nível 1 state, no pending item ──────────
    card = await openFelipeCard(felipePage);
    await expect(card).toContainText("Nível 1", { timeout: 15_000 });
    await expect(card).toContainText("4/8 itens aprovados");
    await expect(card).not.toContainText("pendente");
  } finally {
    await felipeCtx.close();
    await marinaCtx.close();
  }
});
