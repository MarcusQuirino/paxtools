/**
 * R4 — Especialidades (/especialidades): younger item-based levels and older
 * three-etapa (conhecer → fazer → compartilhar) project states.
 *
 * The page (src/routes/especialidades.tsx) renders one of two UIs by ramo:
 *   - younger (lobinho/escoteiro): eixo sections → SpecialtyCard, whose header
 *     shows a Nível 1 / Nível 2 badge, an "N pendente(s)" badge, and
 *     "{approved}/{total} itemns aprovados" (the "itemns" spelling is the app's
 *     own — see the SUSPECTED PRODUCT BUG note below).
 *   - older (sênior/pioneiro): eixo sections → OlderSpecialtyCard, whose header
 *     shows "{n}/3 etapas aprovadas" and a "Conquistada" trophy badge once all
 *     three approved; each StepCard shows an "Aprovado"/"Pendente" badge.
 *
 * Each card is a `?specialty=<id>` deep-link target (#44): navigating with the
 * seed-derived specialty id auto-opens the containing eixo section AND the card
 * (useDeepLinkHighlight), so the header + step badges are in the DOM without
 * any clicking. The specialty each persona holds is derived by pickTarget in
 * convex/testing.ts — deterministic across reseeds; the ids below are the
 * observed seed values (verified against the dev deployment).
 *
 * SUSPECTED PRODUCT BUG: the younger progress line concatenates
 * `item{totalItems > 1 ? "ns" : ""}` → the app renders "itemns aprovados"
 * (should be "itens"). Assertions match the actual rendered text.
 *
 * Seed state (SIM_SPECS + insertYoungerSpecialty/insertOlderSpecialty):
 *   YOUNGER (lobinho)
 *     lobinho-8  Helena Braga  earned    brasilidades  3/6 approved → Nível 1
 *     lobinho-11 Kaique Neves  level2    nutricao      6/6 approved → Nível 2
 *     lobinho-6  Felipe Duarte inProgress acampamento  3/8 approved, 1 pending
 *                                                       (one short of Nível 1)
 *     lobinho-3  Cecília Moraes pending  meteorologia  0/6, 2 pending
 *   OLDER (sênior)
 *     senior-3   Rafael Bastos  pending    comunicacoes                0/3
 *                                                       conhecer pending
 *     senior-6   Úrsula Mattos  inProgress natureza-e-ciencias-naturais 1/3
 *                                          conhecer approved, fazer pending
 *     senior-7   Vitor Sampaio  earned     esportes-de-aventura        3/3
 *                                          all approved → Conquistada
 *
 * The generous first-assertion timeout absorbs the escoteiro auth handshake: on
 * a cold, fully-parallel load the app briefly bounces through /signin before
 * the gated page renders, and the polling `expect` picks the card up once that
 * settles (same pattern as the r5 authed specs).
 *
 * READ-ONLY: deep-links + reads header/badges only. No checkbox toggles, no
 * step submissions.
 */

import type { Page, TestInfo } from "@playwright/test";
import { testAs, expect } from "../../fixtures/auth";

/**
 * Navigate to a deep-linked especialidade and wait for the card to render.
 *
 * On a cold, fully-parallel load the escoteiro auth handshake can be starved,
 * bouncing the page to /signin. That state does NOT self-heal by waiting — only
 * a fresh navigation re-attempts the handshake — so we re-`goto` until the card
 * appears (re-navigating recovers far more runs than a single long wait).
 */
async function openCard(
  page: Page,
  testInfo: TestInfo,
  specialtyId: string,
  card: import("@playwright/test").Locator,
): Promise<void> {
  testInfo.setTimeout(90_000);
  const signin = page.getByRole("button", { name: "Sign in (test)" });
  const url = `/especialidades?specialty=${specialtyId}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url);
    const outcome = await Promise.race([
      card
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "ready" as const)
        .catch(() => "timeout" as const),
      signin
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => "signin" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ready") return;
  }
  await card.waitFor({ state: "visible", timeout: 12_000 });
}

// ── Younger: item-count-driven levels ──────────────────────────────────────

testAs("sim-troop-lobinho-8")(
  "younger earned especialidade shows Nível 1 at half the items approved",
  async ({ page }, testInfo) => {
    const card = page.getByRole("button", { name: /Brasilidades/ });
    await openCard(page, testInfo, "brasilidades", card);
    await expect(card).toContainText("Nível 1");
    await expect(card).not.toContainText("Nível 2");
    await expect(card).toContainText("3/6 itemns aprovados");
  },
);

testAs("sim-troop-lobinho-11")(
  "younger level2 especialidade shows Nível 2 with every item approved",
  async ({ page }, testInfo) => {
    const card = page.getByRole("button", { name: /Nutrição/ });
    await openCard(page, testInfo, "nutricao", card);
    await expect(card).toContainText("Nível 2");
    await expect(card).toContainText("6/6 itemns aprovados");
  },
);

testAs("sim-troop-lobinho-6")(
  "younger in-progress especialidade is one item short of Nível 1 with a pending item",
  async ({ page }, testInfo) => {
    const card = page.getByRole("button", { name: /Acampamento/ });
    await openCard(page, testInfo, "acampamento", card);
    // 3/8 approved: below the 4-item Nível 1 threshold → no level badge yet.
    await expect(card).not.toContainText("Nível");
    await expect(card).toContainText("3/8 itemns aprovados");
    await expect(card).toContainText("1 pendente");
  },
);

testAs("sim-troop-lobinho-3")(
  "younger pending especialidade shows zero approved and two pending items",
  async ({ page }, testInfo) => {
    const card = page.getByRole("button", { name: /Meteorologia/ });
    await openCard(page, testInfo, "meteorologia", card);
    await expect(card).not.toContainText("Nível");
    await expect(card).toContainText("0/6 itemns aprovados");
    await expect(card).toContainText("2 pendentes");
  },
);

// ── Older: three-etapa project states ───────────────────────────────────────

/** The scoped OlderSpecialtyCard root (`div.scroll-mt-4` wrapping trigger +
 * step cards) for the deep-linked, auto-opened specialty. */
function olderCard(page: Page, name: string) {
  return page.locator("div.scroll-mt-4").filter({ hasText: name });
}
/** A StepCard's header row (`div.flex.items-center.gap-2.mb-2`) for a step. */
function stepHeader(card: ReturnType<typeof olderCard>, stepLabel: string) {
  return card
    .locator("div.flex.items-center.gap-2.mb-2")
    .filter({ hasText: stepLabel });
}

testAs("sim-troop-senior-3")(
  "older pending especialidade: conhecer pending, nothing approved, not Conquistada",
  async ({ page }, testInfo) => {
    const card = olderCard(page, "Comunicações");
    await openCard(page, testInfo, "comunicacoes", card);
    await expect(card).toContainText("0/3 etapas aprovadas");
    await expect(card).not.toContainText("Conquistada");

    await expect(stepHeader(card, "Conhecer")).toContainText("Pendente");
    // fazer / compartilhar have no report yet → no state badge.
    await expect(stepHeader(card, "Fazer")).not.toContainText("Aprovado");
    await expect(stepHeader(card, "Fazer")).not.toContainText("Pendente");
    await expect(stepHeader(card, "Compartilhar")).not.toContainText("Aprovado");
    await expect(stepHeader(card, "Compartilhar")).not.toContainText("Pendente");
  },
);

testAs("sim-troop-senior-6")(
  "older in-progress especialidade: conhecer approved, fazer pending, not Conquistada",
  async ({ page }, testInfo) => {
    const card = olderCard(page, "Natureza e Ciências Naturais");
    await openCard(page, testInfo, "natureza-e-ciencias-naturais", card);
    await expect(card).toContainText("1/3 etapas aprovadas");
    await expect(card).not.toContainText("Conquistada");

    await expect(stepHeader(card, "Conhecer")).toContainText("Aprovado");
    await expect(stepHeader(card, "Fazer")).toContainText("Pendente");
    await expect(stepHeader(card, "Compartilhar")).not.toContainText("Aprovado");
    await expect(stepHeader(card, "Compartilhar")).not.toContainText("Pendente");
  },
);

testAs("sim-troop-senior-7")(
  "older earned especialidade: all three etapas approved → Conquistada",
  async ({ page }, testInfo) => {
    const card = olderCard(page, "Esportes de Aventura");
    await openCard(page, testInfo, "esportes-de-aventura", card);
    await expect(card).toContainText("3/3 etapas aprovadas");
    await expect(card).toContainText("Conquistada");

    await expect(stepHeader(card, "Conhecer")).toContainText("Aprovado");
    await expect(stepHeader(card, "Fazer")).toContainText("Aprovado");
    await expect(stepHeader(card, "Compartilhar")).toContainText("Aprovado");
    // No etapa is left pending.
    await expect(card.getByText("Pendente", { exact: true })).toHaveCount(0);
  },
);
