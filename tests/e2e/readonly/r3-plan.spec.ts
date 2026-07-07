/**
 * R3 — Plan (/plan): empty state + a seeded plano rendered in BOTH views.
 *
 * The plan page (src/routes/plan.tsx) has two view modes toggled by
 * `ViewToggle`: "Por Área" (byArea, the default — grouped in eixo/bloco
 * accordions) and "Minha Ordem" (ordered, a flat position-sorted list).
 *
 * Seed facts (convex/testing.ts):
 *   - `escoteiro-approved` (approvedTest) has ZERO plannedItems → the empty
 *     state pre-empts the whole dashboard (the `items.length === 0` early
 *     return renders <EmptyState/> BEFORE the ViewToggle), so an empty plan
 *     has no per-view toggle at all — it is a single, view-independent state.
 *   - `sim-troop-senior-9` (Xavier Dutra, sênior) has a seeded plano of four
 *     items at positions 0..3 (the `sc.plan` block in seedSimRamo):
 *       0  action:senior:criatividade-inovacao:variable:2  (frontier variable)
 *       1  action:senior:criatividade-inovacao:fixed:0      (frontier fixed)
 *       2  specialty:heranca-cultural:Cultura e Arte         (especialidade)
 *       3  custom:<id>  ("Projeto pessoal: ... criatividade e inovação ...")
 *     Frontier bloco = "Criatividade e Inovação" (criatividade-inovacao);
 *     the especialidade lives in "Herança Cultural" (heranca-cultural).
 *     The custom ação personalizada is approved (custom "approved").
 *
 * The generous first-assertion timeout absorbs the escoteiro auth handshake: on
 * a cold, fully-parallel load the app briefly bounces through /signin before
 * the gated page renders, and the polling `expect` picks the content up once
 * that settles (same pattern as the r5 authed specs).
 *
 * READ-ONLY: opens views/blocos only. No toggling checkboxes/stars, no drag.
 */

import type { Page, TestInfo, Locator } from "@playwright/test";
import { approvedTest, testAs, expect } from "../../fixtures/auth";

const xavierTest = testAs("sim-troop-senior-9");

/**
 * Navigate to /plan and wait for the dashboard to render.
 *
 * On a cold, fully-parallel load the escoteiro auth handshake can be starved,
 * bouncing the page to /signin. That state does NOT self-heal by waiting — only
 * a fresh navigation re-attempts the handshake — so we re-`goto` until `ready`
 * (present only once authed AND the plan dashboard has rendered) appears.
 */
async function openPlan(
  page: Page,
  testInfo: TestInfo,
  ready: Locator,
): Promise<void> {
  testInfo.setTimeout(90_000);
  const signin = page.getByRole("button", { name: "Sign in (test)" });
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto("/plan");
    const outcome = await Promise.race([
      ready
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
  await ready.waitFor({ state: "visible", timeout: 12_000 });
}

// Xavier's four plan items. byArea renders ActionItem `id` as the raw action
// id; the ordered view renders it as the plan itemKey (`action:<id>`).
const RAW_VARIABLE = "senior:criatividade-inovacao:variable:2";
const RAW_FIXED = "senior:criatividade-inovacao:fixed:0";
const KEY_VARIABLE = "action:senior:criatividade-inovacao:variable:2";
const KEY_FIXED = "action:senior:criatividade-inovacao:fixed:0";
const SPECIALTY_NAME = "Cultura e Arte";
const CUSTOM_TEXT =
  "Projeto pessoal: organizar uma atividade de criatividade e inovação para a seção";

/**
 * Open a byArea bloco accordion, converging on the expanded state. Radix
 * animations plus Convex live re-renders make these triggers "unstable" under
 * load, so we `force`-click (bypassing the stability gate) and re-check
 * `aria-expanded` rather than trusting a single click.
 */
async function expandBloco(page: Page, name: RegExp): Promise<void> {
  const trigger = page.getByRole("button", { name });
  await expect(trigger).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if ((await trigger.getAttribute("aria-expanded")) === "true") return;
    await trigger.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

approvedTest("empty plan shows the empty state and no view toggle", async ({
  page,
}, testInfo) => {
  const emptyState = page.getByText("Seu plano está vazio");
  await openPlan(page, testInfo, emptyState);

  // The empty-state copy renders (also the authed-ready anchor).
  await expect(emptyState).toBeVisible();

  // With an empty plan the ViewToggle is never mounted — there is no
  // "Por Área"/"Minha Ordem" split to switch between.
  await expect(page.getByRole("button", { name: "Por Área" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Minha Ordem" }),
  ).toHaveCount(0);
});

xavierTest("seeded plano renders all four items in the 'Por Área' view", async ({
  page,
}, testInfo) => {
  // The frontier bloco's accordion trigger is the authed-ready anchor.
  const frontier = page.getByRole("button", { name: /Criatividade e Inovação/i });
  await openPlan(page, testInfo, frontier);
  // Default view is byArea — no toggle click needed.

  // Frontier bloco with the two planned ações + the approved custom.
  await expandBloco(page, /Criatividade e Inovação/i);
  await expect(page.locator(`[id="${RAW_VARIABLE}"]`)).toBeVisible();
  await expect(page.locator(`[id="${RAW_FIXED}"]`)).toBeVisible();
  await expect(page.getByText(CUSTOM_TEXT)).toBeVisible();

  // The especialidade item lives in a different bloco/eixo.
  await expandBloco(page, /Herança Cultural/i);
  await expect(page.getByText(SPECIALTY_NAME)).toBeVisible();
});

xavierTest("seeded plano renders in position order in the 'Minha Ordem' view", async ({
  page,
}, testInfo) => {
  const orderedToggle = page.getByRole("button", { name: "Minha Ordem" });
  await openPlan(page, testInfo, orderedToggle);

  // `force` bypasses Playwright's stability gate (Radix/Convex re-renders keep
  // the toggle "unstable" under load); a view switch is safe to dispatch.
  await orderedToggle.click({ force: true });

  // All four items present (ordered view renders itemKeys / plain text).
  const variable = page.locator(`[id="${KEY_VARIABLE}"]`);
  const fixed = page.locator(`[id="${KEY_FIXED}"]`);
  const specialty = page.getByText(SPECIALTY_NAME);
  const custom = page.getByText(CUSTOM_TEXT);
  await expect(variable).toBeVisible();
  await expect(fixed).toBeVisible();
  await expect(specialty).toBeVisible();
  await expect(custom).toBeVisible();

  // Seeded positions 0..3 must render top-to-bottom in that order. The custom
  // is approved (checked) → still last both by seed position and by
  // sortForLinearView's open-before-done rule.
  const topY = async (l: Locator): Promise<number> => {
    const box = await l.boundingBox();
    if (!box) throw new Error("plan item not laid out");
    return box.y;
  };
  const yVariable = await topY(variable);
  const yFixed = await topY(fixed);
  const ySpecialty = await topY(specialty);
  const yCustom = await topY(custom);
  expect(yVariable).toBeLessThan(yFixed);
  expect(yFixed).toBeLessThan(ySpecialty);
  expect(ySpecialty).toBeLessThan(yCustom);
});
