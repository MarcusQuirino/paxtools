/**
 * M8 (PRD #58 stories 32/37) — older especialidade three-etapa project →
 * Conquistada. Older especialidades are binary (ADR 0002): the trophy is earned
 * only once ALL THREE steps (conhecer → fazer → compartilhar) are approved.
 *
 * Two roles, two browser contexts:
 *   - Úrsula Mattos (sim-troop-senior-6) owns the older especialidade
 *     "natureza-e-ciencias-naturais", seeded inProgress: conhecer APPROVED,
 *     fazer PENDING, compartilhar NOT submitted.
 *   - Talita Novaes (sim-escotista-senior-1) is the sênior approver — a SHARED
 *     login. We assert ONLY on Úrsula's queue card, never on global counts.
 *
 * Flow:
 *   1. Talita approves Úrsula's pending "fazer" report ("Projetos de
 *      Especialidade" card) → 2/3, still NOT Conquistada.
 *   2. Úrsula submits the "compartilhar" report on /especialidades.
 *   3. Talita approves the compartilhar report → the third approval.
 *   4. Úrsula reloads → the especialidade shows "Conquistada" (3/3).
 * The spec asserts Conquistada is ABSENT after the fazer approval and only
 * PRESENT after the third (compartilhar) approval.
 *
 * IDEMPOTENCY / RETRY-SAFETY (the run uses E2E_SKIP_SEED=1 → no reseed between
 * runs): every step reads current state and drives forward. If already
 * Conquistada on entry, the transition steps are skipped and we assert the
 * end-state directly (so the "absent-then-present" transition is only asserted
 * on the run that actually drives it).
 *
 * CLEANUP: step approvals to Conquistada are forward-only; the run's teardown
 * reseed restores the pristine conhecer-approved/fazer-pending state.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const URSULA_STATE = "tests/.auth/sim-troop-senior-6.json";
const TALITA_STATE = "tests/.auth/sim-escotista-senior-1--m08.json";
const URSULA_NAME = "Úrsula Mattos";
const SPECIALTY_ID = "natureza-e-ciencias-naturais";
const SPECIALTY_NAME = "Natureza e Ciências Naturais";
const COMPARTILHAR_TEXT =
  "Relato da etapa Compartilhar (e2e M8): compartilhei o aprendizado com a tropa.";

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

/** The scoped OlderSpecialtyCard root for the deep-linked specialty. */
const olderCard = (page: Page) =>
  page.locator("div.scroll-mt-4").filter({ hasText: SPECIALTY_NAME });

/** A StepCard (div) inside the older card, scoped by its step label. */
const stepCard = (card: Locator, stepLabel: string) =>
  card.locator("div.border-2.border-black").filter({ hasText: stepLabel });

/** Deep-link Úrsula into her older especialidade card (auto-opens it). */
async function openUrsulaCard(page: Page): Promise<Locator> {
  const card = olderCard(page);
  await gotoStable(page, `/especialidades?specialty=${SPECIALTY_ID}`, card);
  await expect(card).toBeVisible({ timeout: 15_000 });
  return card;
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
    "escotista queue unreachable (Talita's auth state is likely dead) — " +
      "refresh tests/.auth/sim-escotista-senior-1--m08.json via a scratch signin.",
  );
}

/**
 * Approve Úrsula's pending report for a given step, if present in Talita's
 * queue. Returns true if an approval was performed. Auto-waits for the expanded
 * card content to mount (Radix mounts CollapsibleContent asynchronously).
 */
async function approveReport(
  talitaPage: Page,
  stepLabel: string,
): Promise<boolean> {
  await openQueue(talitaPage);
  const card = await scoutCard(talitaPage, URSULA_NAME);
  if (!(await card.count())) return false;
  await talitaPage
    .getByRole("button", { name: new RegExp(URSULA_NAME) })
    .first()
    .click();
  const reportCard = card
    .locator("div.border-2.border-amber-300")
    .filter({ hasText: stepLabel });
  try {
    // Auto-waits for the report card + button to mount; times out (→ false) if
    // Úrsula has no pending report for this step (already approved).
    await reportCard
      .getByRole("button", { name: /^Aprovar/ })
      .click({ timeout: 10_000 });
  } catch {
    return false;
  }
  await expect(reportCard).toHaveCount(0, { timeout: 15_000 });
  return true;
}

test("older especialidade three-etapa approval earns Úrsula Conquistada", async ({
  browser,
}) => {
  test.setTimeout(150_000);

  const ursulaCtx = await browser.newContext({ storageState: URSULA_STATE });
  const talitaCtx = await browser.newContext({ storageState: TALITA_STATE });
  const ursulaPage = await ursulaCtx.newPage();
  const talitaPage = await talitaCtx.newPage();

  try {
    // ── Early exit: already Conquistada from a prior (un-reseeded) run ────────
    let card = await openUrsulaCard(ursulaPage);
    if (await card.getByText("Conquistada").count()) {
      await expect(card).toContainText("3/3 etapas aprovadas");
      await expect(stepCard(card, "Compartilhar")).toContainText("Aprovado");
      return;
    }

    // ── Step 1: Talita approves the pending "fazer" report ────────────────────
    await approveReport(talitaPage, "Fazer");

    // ── Assert: 2/3, NOT Conquistada after the fazer approval ─────────────────
    card = await openUrsulaCard(ursulaPage);
    await expect(card).toContainText("2/3 etapas aprovadas", { timeout: 15_000 });
    await expect(card).not.toContainText("Conquistada");
    await expect(stepCard(card, "Conhecer")).toContainText("Aprovado");
    await expect(stepCard(card, "Fazer")).toContainText("Aprovado");
    await expect(stepCard(card, "Compartilhar")).not.toContainText("Aprovado");

    // ── Step 2: Úrsula submits the "compartilhar" report (if not already) ─────
    const compartilhar = stepCard(card, "Compartilhar");
    const alreadySubmitted =
      (await compartilhar.getByText("Pendente").count()) > 0;
    if (!alreadySubmitted) {
      await compartilhar.locator("textarea").fill(COMPARTILHAR_TEXT);
      await compartilhar
        .getByRole("button", { name: /^(Enviar|Reenviar)$/ })
        .click();
      await expect(compartilhar.getByText("Pendente")).toBeVisible({
        timeout: 15_000,
      });
    }

    // ── Step 3: Talita approves the compartilhar report (third approval) ──────
    await approveReport(talitaPage, "Compartilhar");

    // ── Step 4: Úrsula reloads → Conquistada (3/3) ────────────────────────────
    card = await openUrsulaCard(ursulaPage);
    await expect(card).toContainText("Conquistada", { timeout: 15_000 });
    await expect(card).toContainText("3/3 etapas aprovadas");
    await expect(stepCard(card, "Compartilhar")).toContainText("Aprovado");
  } finally {
    await ursulaCtx.close();
    await talitaCtx.close();
  }
});
