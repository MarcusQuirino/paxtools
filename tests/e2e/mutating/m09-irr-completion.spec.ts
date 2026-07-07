/**
 * M9 (PRD #58 story 33, IRR side) — completing a ramo's IRR (Reconhecimento de
 * Ramo) earns the trophy banner.
 *
 * Two roles, two browser contexts:
 *   - Pilar Antunes (sim-troop-lobinho-16) owns the partial lobinho IRR: 18/18
 *     blocos (checklist unlocked), the first manual requisitos seeded 2 approved
 *     + 1 PENDING, and the remaining manual requisito(s) NOT started.
 *   - Marina Solano (sim-escotista-lobinho-1) is the lobinho approver — a SHARED
 *     login. We assert ONLY on Pilar's queue card, never on global counts.
 *
 * Flow:
 *   1. Pilar (on /) marks every remaining unstarted manual IRR requisito →
 *      each becomes pending.
 *   2. Marina bulk-approves ALL of Pilar's pending IRR rows in her queue card.
 *   3. Pilar reloads → the "Cruzeiro do Sul!" trophy banner (IRR complete),
 *      mirroring the r2 maxed-persona assertions (Otto Vilela).
 *
 * IDEMPOTENCY / RETRY-SAFETY (the run uses E2E_SKIP_SEED=1 → no reseed between
 * runs): each step reads current state and drives forward. If the IRR is already
 * complete on entry, the transition steps are skipped and we assert the trophy
 * directly; marking is a no-op when nothing is left unstarted.
 *
 * CLEANUP: approving the IRR to completion is forward-only; the run's teardown
 * reseed restores the pristine partial-IRR state.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const PILAR_STATE = "tests/.auth/sim-troop-lobinho-16.json";
const MARINA_STATE = "tests/.auth/sim-escotista-lobinho-1--m09.json";
const PILAR_NAME = "Pilar Antunes";

const signinButton = (p: Page) =>
  p.getByRole("button", { name: "Sign in (test)" });

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

/** Load Pilar's dashboard, waiting for the always-present recognition section. */
async function openDashboard(page: Page): Promise<void> {
  await gotoStable(
    page,
    "/",
    page.getByRole("heading", { name: "Reconhecimento de Ramo" }),
  );
}

const queueCard = (page: Page, name: string) =>
  page.locator("div.border-2.border-black").filter({ hasText: name }).first();

/**
 * Resolve a scout's queue card, tolerating the reactive-query load race (a
 * skeleton can render before the real cards arrive). If the card never appears
 * (nothing pending), the wait lapses and the caller treats it as absent.
 */
async function scoutCard(page: Page, name: string): Promise<Locator> {
  const card = queueCard(page, name);
  await card.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
  return card;
}

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
      "refresh tests/.auth/sim-escotista-lobinho-1--m09.json via a scratch signin.",
  );
}

test("completing the manual IRR requisitos earns Pilar the Cruzeiro do Sul trophy", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const pilarCtx = await browser.newContext({ storageState: PILAR_STATE });
  const marinaCtx = await browser.newContext({ storageState: MARINA_STATE });
  const pilarPage = await pilarCtx.newPage();
  const marinaPage = await marinaCtx.newPage();

  const assertTrophy = async () => {
    await expect(pilarPage.getByText("Cruzeiro do Sul!")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      pilarPage.getByText(/Parabéns! Reconhecimento de Ramo completo/),
    ).toBeVisible();
    await expect(pilarPage.getByText("Etapa Atual")).toHaveCount(0);
  };

  try {
    // ── Early exit: IRR already complete from a prior (un-reseeded) run ───────
    await openDashboard(pilarPage);
    if (await pilarPage.getByText("Cruzeiro do Sul!").count()) {
      await assertTrophy();
      return;
    }

    // ── Step 1: Pilar marks every remaining unstarted manual requisito ────────
    const recognition = pilarPage.locator("section", {
      hasText: "Reconhecimento de Ramo",
    });
    // Sanity: checklist unlocked (18/18 blocos) — no lock hint.
    await expect(
      recognition.getByText(/Complete todos os 18 blocos/),
    ).toHaveCount(0);

    const uncheckedEnabled = recognition.locator(
      'button[role="checkbox"][data-state="unchecked"]:not([disabled])',
    );
    for (let guard = 0; guard < 10; guard++) {
      const n = await uncheckedEnabled.count();
      if (n === 0) break;
      await uncheckedEnabled.first().click();
      await expect(uncheckedEnabled).toHaveCount(n - 1, { timeout: 10_000 });
    }

    // ── Step 2: Marina bulk-approves all of Pilar's pending IRR rows ──────────
    await openQueue(marinaPage);
    const pilarCard = await scoutCard(marinaPage, PILAR_NAME);
    if (await pilarCard.count()) {
      await marinaPage
        .getByRole("button", { name: new RegExp(PILAR_NAME) })
        .first()
        .click();
      await pilarCard
        .getByRole("button", { name: /^Aprovar \(\d+\)/ })
        .click();
      // All of Pilar's pending items approved → her card leaves the queue.
      await expect(pilarCard).toHaveCount(0, { timeout: 15_000 });
    }

    // ── Step 3: Pilar reloads → Cruzeiro do Sul! trophy banner ────────────────
    await openDashboard(pilarPage);
    await assertTrophy();
  } finally {
    await pilarCtx.close();
    await marinaCtx.close();
  }
});
