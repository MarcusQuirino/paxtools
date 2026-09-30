/**
 * M2 — Full approval round-trip WITH a level-up crossing (PRD #58 stories 33 +
 * 36, approve side). Parameterized so desktop (Diego Alves / escoteiro /
 * Renata Peçanha, Pista→Trilha) and mobile (Davi Siqueira / lobinho / Marina
 * Solano, Pata Tenra→Saltador) share one implementation.
 *
 * Two browser contexts (the flow spans two roles):
 *   - scout   (the escoteiro) opens the frontier bloco screen (/bloco/<id>,
 *     pushed from its Progressão row) and marks their single missing variable
 *     ação → it becomes a PENDING completion (`data-state="pending"`, clock).
 *   - approver (the escotista) sees the scout's card in /escotista/pending and
 *     APPROVES it via the bulk "Aprovar" button. That approval completes the
 *     scout's 4th bloco, which crosses an etapa boundary → a level-up (a
 *     levelUp event is emitted and the dashboard etapa banner changes).
 *
 * SEED SHAPE (convex/testing.ts seedSimRamo, `partialNext: true`): the scout
 * has 3 completed blocos and a frontier bloco ("Cuidado com o Corpo") whose
 * fixed ações are all approved plus (variableRequired − 1) = 3 of 4 variable
 * ações approved — exactly ONE variable ação short of completing bloco #4.
 * Both ramos land on the same frontier bloco/variable index (derived below).
 *
 * SELF-CLEANING + RETRY-SAFE. The approval leaves an approved+locked row that
 * levels the scout up, so the spec cannot simply re-run. It:
 *   1. resets to the seed state up-front (deletes any leftover pending row as
 *      the scout, or un-approves a leftover approved row as the escotista), and
 *   2. in a guarded finally, un-approves the newly-approved ação via the
 *      escotista's impersonation view (/escotista/escoteiro/<id> → bloco row →
 *      /bloco/<blocoId>?escoteiroId=<id>), which DELETES the approved
 *      actionCompletions row (escotista direct-toggle on an
 *      approved item removes it — convex/progression.ts toggleAction: an
 *      escotista acting with targetUserId resolves status "approved", so an
 *      existing approved row takes the delete branch after the
 *      assertCanRemoveApproved escotista check passes). The scout returns to 3
 *      blocos / the lower etapa — exactly the seed state.
 *
 * OWNERSHIP: mutates ONLY the scout persona's data. The approver login is
 * shared (never asserts the approver's own row, never asserts global queue /
 * painel counts) and we assert only on THIS scout's card/rows.
 */

import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { authFile } from "../../utils/personas";
import { blocoIdOf, openBloco } from "./bloco-nav";

export type RoundtripParams = {
  /** Manifest slug of the escoteiro whose data is mutated. */
  scoutSlug: string;
  /** Display name as rendered in cards/painel/banner. */
  scoutName: string;
  /** Manifest slug of the approver escotista (shared login, row untouched). */
  approverSlug: string;
  /** Frontier bloco display name (the bloco screen's h1). */
  frontierBlocoName: RegExp;
  /**
   * The single missing variable ação that completes bloco #4 and levels the
   * scout up. Derived deterministically from the seed (see spec header).
   */
  missingActionId: string;
  /** Etapa name BEFORE the crossing (3 blocos). */
  lowerEtapa: string;
  /** Etapa name AFTER the crossing (4 blocos). */
  upperEtapa: string;
  /** Context options carrying the project's device (desktop vs mobile). */
  contextOptions?: Parameters<Browser["newContext"]>[0];
};

/** Fresh nav to the scout's own dashboard, then push the frontier bloco screen. */
async function openScoutBloco(page: Page, params: RoundtripParams) {
  await page.goto("/");
  await openBloco(page, blocoIdOf(params.missingActionId));
  await expect(
    page.getByRole("heading", { level: 1, name: params.frontierBlocoName }),
  ).toBeVisible();
}

/**
 * Un-approve the ação via the escotista's impersonation view: search the painel
 * for the scout, open their progression, open the frontier bloco screen, and
 * toggle the (approved, escotista-editable) check OFF — deleting the approved
 * row. Leaves the scout back at the lower etapa. Used by both the up-front
 * reset and the teardown.
 */
async function unapproveViaImpersonation(
  approverPage: Page,
  params: RoundtripParams,
) {
  await approverPage.goto("/escotista");
  await approverPage
    .getByPlaceholder(/Buscar escoteiro/i)
    .fill(params.scoutName);
  const verProgressao = approverPage.getByRole("link", {
    name: "Ver progressão",
  });
  await expect(verProgressao).toHaveCount(1);
  await verProgressao.click();
  await expect(approverPage).toHaveURL(/\/escotista\/escoteiro\//);

  await openBloco(approverPage, blocoIdOf(params.missingActionId));
  const checkbox = approverPage.locator(`[id="${params.missingActionId}"]`);
  await expect(checkbox).toBeVisible();
  if ((await checkbox.getAttribute("data-state")) !== "open") {
    await checkbox.click(); // escotista toggle on an approved item → delete row
    await expect(checkbox).toHaveAttribute("data-state", "open");
  }
  // Back to the impersonation body — it reuses the scout's Dashboard, so the
  // etapa hero reflects the target. After un-approval the scout is back below
  // the crossing.
  await approverPage.getByRole("button", { name: "Voltar" }).click();
  await expect(approverPage).toHaveURL(/\/escotista\/escoteiro\//);
  await expect(
    approverPage.getByRole("heading", { name: params.lowerEtapa, exact: true }),
  ).toBeVisible();
}

/**
 * Bring the scout back to the seed state before acting: the missing ação must
 * be un-marked and unapproved (3 blocos, lower etapa). Handles both leftover
 * states from an interrupted prior run.
 */
async function resetToSeed(
  scoutPage: Page,
  approverPage: Page,
  params: RoundtripParams,
) {
  await openScoutBloco(scoutPage, params);
  const checkbox = scoutPage.locator(`[id="${params.missingActionId}"]`);
  await expect(checkbox).toBeVisible();

  const state = await checkbox.getAttribute("data-state");
  if (state === "open") return;

  if (state === "pending") {
    // Leftover PENDING (self-owned, not yet approved) → the scout can delete it.
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "open");
  } else {
    // Leftover APPROVED+locked (a prior run levelled the scout) → only the
    // escotista can undo it. The reload stays on the bloco screen.
    await unapproveViaImpersonation(approverPage, params);
    await scoutPage.reload();
    await expect(checkbox).toHaveAttribute("data-state", "open");
  }
}

export async function runApprovalRoundtrip(
  browser: Browser,
  params: RoundtripParams,
): Promise<void> {
  let scoutCtx: BrowserContext | undefined;
  let approverCtx: BrowserContext | undefined;

  try {
    scoutCtx = await browser.newContext({
      ...params.contextOptions,
      storageState: authFile(params.scoutSlug),
    });
    approverCtx = await browser.newContext({
      ...params.contextOptions,
      storageState: authFile(params.approverSlug),
    });
    const scoutPage = await scoutCtx.newPage();
    const approverPage = await approverCtx.newPage();
    const checkbox = scoutPage.locator(`[id="${params.missingActionId}"]`);

    // 0. Normalize to the seed state (retry-safety).
    await resetToSeed(scoutPage, approverPage, params);

    // 1. Scout marks the single missing variable ação → PENDING (clock,
    //    still enabled because a self-mark is not yet locked).
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("data-state", "pending");
    await expect(checkbox).toBeEnabled();
    await expect(checkbox.locator("svg.lucide-clock")).toBeVisible();

    // 2. Approver sees THIS scout's card in the pending queue and approves it.
    await approverPage.goto("/escotista/pending");
    const card = approverPage.getByRole("button", {
      name: new RegExp(params.scoutName, "i"),
    });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // The queue is a live Convex query with several seeded cards; on slower
    // (mobile) runs a reactive re-render can detach the bulk button mid-click.
    // Retry the whole expand→approve→verify — a repeat "Aprovar" is a no-op
    // (bulkAction skips already-approved rows), so this stays scoped to THIS
    // scout and idempotent. Only the expanded card contributes a visible
    // "Aprovar (n)" (collapsed cards are hidden from the a11y tree).
    const approveBtn = approverPage.getByRole("button", { name: /^Aprovar \(/ });
    await expect(async () => {
      if ((await approveBtn.count()) === 0) {
        await card.click(); // expand only this scout's card
      }
      await expect(approveBtn).toHaveCount(1, { timeout: 2_000 });
      await approveBtn.click({ timeout: 2_000 });
      // Card leaves the queue once the scout has no more pending items.
      await expect(card).toHaveCount(0, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });

    // 3. Scout reloads the bloco screen: the ação is approved + LOCKED and the
    //    bloco head shows "Completo". Back on Progressão the bloco row is
    //    Completo and the etapa hero shows the crossed-into etapa (level-up).
    await scoutPage.reload();
    await expect(checkbox).toHaveAttribute("data-state", "approved");
    await expect(checkbox).toBeDisabled();
    await expect(scoutPage.getByTestId("bloco-head")).toContainText("Completo");

    await scoutPage.getByRole("link", { name: "Progressão", exact: true }).click();
    await expect(scoutPage).not.toHaveURL(/\/bloco\//);
    const blocoRow = scoutPage.getByTestId(
      `bloco-row-${blocoIdOf(params.missingActionId)}`,
    );
    await expect(blocoRow).toHaveAttribute("data-state", "full");
    await expect(blocoRow).toContainText(/Completo/i);

    await expect(
      scoutPage.getByRole("heading", { name: params.upperEtapa, exact: true }),
    ).toBeVisible();

    // 3b. Optional, best-effort timeline check (never fails the test — the
    //     shared feed is concurrent with sibling specs). Verify a levelUp line
    //     for THIS scout appears; if not found quickly, just annotate.
    try {
      await approverPage.goto("/escotista/timeline");
      const levelUpRow = approverPage
        .locator("div")
        .filter({ hasText: new RegExp(params.scoutName, "i") })
        .filter({ hasText: new RegExp(`Subiu para ${params.upperEtapa}`, "i") });
      await expect(levelUpRow.first()).toBeVisible({ timeout: 5_000 });
    } catch {
      // Feed may have paged past it under concurrency — non-fatal.
    }
  } finally {
    // 4. Teardown: un-approve the ação so the scout is back at the seed state
    //    (3 blocos, lower etapa). Guarded so a teardown hiccup never masks a
    //    real failure above.
    try {
      if (approverCtx) {
        const approverPage = approverCtx.pages()[0] ?? (await approverCtx.newPage());
        await unapproveViaImpersonation(approverPage, params);
      }
    } catch {
      // If un-approval is impossible (e.g. context already tearing down), the
      // global teardown reseed restores the target.
    }
    await scoutCtx?.close();
    await approverCtx?.close();
  }
}
