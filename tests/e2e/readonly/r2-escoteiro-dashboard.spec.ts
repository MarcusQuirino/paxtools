/**
 * R2 — Escoteiro dashboard renders each persona's per-ramo progression exactly.
 *
 * The dashboard (src/routes/index.tsx → StageBanner / OverallProgress /
 * EixoSection / RecognitionSection) is ramo-scoped: it must show ONLY the
 * viewing escoteiro's current-ramo etapa, block count, per-eixo progress, and
 * that ramo's IRR — never a past ramo's completed record, and never another
 * ramo's etapa/IRR names.
 *
 * Every assertion is pinned to the deterministic sim-troop seed
 * (convex/testing.ts SIM_SPECS + seedSimRamo). Block counts, etapa names and
 * IRR names are computed from src/data/progression-rules + the troop-order
 * arithmetic in seedSimRamo, so they are exact, not fuzzy.
 *
 * PRD #58 stories 22–26 + 30 (cluster R2). READ-ONLY: expands accordions and
 * follows a deep-link; never toggles a checkbox or submits a form.
 *
 * Note: r2-approved-locked.spec.ts covers the "approved conclusão is locked"
 * contract for this cluster; this file covers the render contracts.
 */

import { expect } from "@playwright/test";
import { testAs } from "../../fixtures/auth";

// ── Persona fixtures (all in the manifest; auth states pre-captured) ─────────
const escoteiroEmpty = testAs("sim-troop-escoteiro-1"); // Ana Lima, 0 blocos
const escoteiroPending = testAs("sim-troop-escoteiro-2"); // Bruno Sá, 1 + 2 pending
const seniorMid = testAs("sim-troop-senior-9"); // Xavier Dutra, 10 blocos
const escoteiroMax = testAs("sim-troop-escoteiro-15"); // Otávio Freitas, 18 + IRR
const lobinhoMax = testAs("sim-troop-lobinho-15"); // Otto Vilela, 18 + IRR
const lobinhoPartial = testAs("sim-troop-lobinho-16"); // Pilar Antunes, 18 + IRR partial
const seniorHistory = testAs("sim-troop-senior-12"); // Aurora Linhares, 9, past ramos
const pioneiroHistory = testAs("sim-troop-pioneiro-1"); // Clara Estevão, 7, 3-ramo history

const LOCK_TEXT = /Complete todos os 18 blocos para desbloquear o checklist/;

// ─────────────────────────────────────────────────────────────────────────────
// Story 22 — EMPTY dashboard: initial etapa, zero progress, IRR locked.
// ─────────────────────────────────────────────────────────────────────────────
escoteiroEmpty("empty escoteiro shows Pista, 0/18, IRR checklist locked", async ({
  page,
}) => {
  await page.goto("/");

  // Initial etapa banner: escoteiro starts at Pista, next stage Trilha.
  await expect(page.getByText("Etapa Atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pista", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0/18 blocos", { exact: true })).toBeVisible();
  await expect(page.getByText(/\+4 blocos para/)).toBeVisible();
  await expect(page.getByText("Trilha", { exact: true })).toBeVisible();

  // IRR / Reconhecimento de Ramo is locked until all 18 blocos are done.
  const recognition = page.locator("section", {
    hasText: "Reconhecimento de Ramo",
  });
  await expect(recognition.getByText(LOCK_TEXT)).toBeVisible();

  // Not maxed: no trophy banner.
  await expect(page.getByText("Lis de Ouro!")).toHaveCount(0);
  await expect(
    page.getByText(/Reconhecimento de Ramo completo/),
  ).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 23 — MID progression, per-ramo correctness (sênior).
// Xavier has 10 blocos → sênior stage "Conquista" (6–11), next "Azimute" (12).
// ─────────────────────────────────────────────────────────────────────────────
seniorMid("mid sênior shows Conquista 10/18 and sênior eixos, no escoteiro names", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Etapa Atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conquista", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("10/18 blocos", { exact: true })).toBeVisible();
  await expect(page.getByText(/\+2 blocos para/)).toBeVisible();
  await expect(page.getByText("Azimute", { exact: true })).toBeVisible();

  // Per-eixo progress grid renders all four eixos with block counts.
  for (const eixo of [
    "Habilidades para a Vida",
    "Meio Ambiente",
    "Paz e Desenvolvimento",
    "Saúde e Bem-estar",
  ]) {
    await expect(page.getByText(eixo).first()).toBeVisible();
  }

  // No escoteiro-ramo etapa names leak into a sênior dashboard.
  await expect(page.getByText("Pista", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Trilha", { exact: true })).toHaveCount(0);

  // 10 < 18 → IRR still locked.
  await expect(page.getByText(LOCK_TEXT)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 24 — MAXED: IRR trophy banner with the ramo's own IRR name.
// ─────────────────────────────────────────────────────────────────────────────
escoteiroMax("maxed escoteiro shows the Lis de Ouro trophy banner", async ({
  page,
}) => {
  await page.goto("/");

  // irrComplete → trophy replaces the normal etapa banner.
  await expect(page.getByText("Lis de Ouro!")).toBeVisible();
  await expect(
    page.getByText(/Parabéns! Reconhecimento de Ramo completo/),
  ).toBeVisible();
  await expect(page.getByText("Etapa Atual")).toHaveCount(0);

  // Recognition section marked Completo.
  const recognition = page.locator("section", {
    hasText: "Reconhecimento de Ramo",
  });
  await expect(recognition.getByText("Completo", { exact: true })).toBeVisible();
});

lobinhoMax("maxed lobinho shows the Cruzeiro do Sul trophy banner", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Cruzeiro do Sul!")).toBeVisible();
  await expect(
    page.getByText(/Parabéns! Reconhecimento de Ramo completo/),
  ).toBeVisible();
  await expect(page.getByText("Etapa Atual")).toHaveCount(0);
  // Escoteiro's IRR name must NOT appear on a lobinho dashboard.
  await expect(page.getByText(/Lis de Ouro/)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 25 — PARTIAL IRR: all 18 blocos, IRR unlocked but not yet earned.
// Pilar: 2 of the first 3 manual IRR items approved, 1 pending. With the auto
// (18-blocos) item that is 3/5 requisitos approved, 1 pending.
// ─────────────────────────────────────────────────────────────────────────────
lobinhoPartial("partial-IRR lobinho: unlocked, 3/5 requisitos, one pending", async ({
  page,
}) => {
  await page.goto("/");

  // Not maxed: normal banner, last lobinho etapa (Caçador), 18/18 blocos.
  await expect(page.getByText("Etapa Atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Caçador", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("18/18 blocos", { exact: true })).toBeVisible();
  await expect(page.getByText("Cruzeiro do Sul!")).toHaveCount(0);

  const recognition = page.locator("section", {
    hasText: "Reconhecimento de Ramo",
  });
  // Unlocked: the lock hint is gone.
  await expect(page.getByText(LOCK_TEXT)).toHaveCount(0);
  // Not yet earned: 3/5 approved + 1 pending, no "Completo" badge.
  await expect(recognition.getByText(/3\/5 requisitos \(\+1\)/)).toBeVisible();
  await expect(recognition.getByText("Completo", { exact: true })).toHaveCount(0);
  // The single pending IRR item renders in the awaiting-approval state (clock).
  await expect(recognition.locator("svg.lucide-clock")).toHaveCount(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 26 — PENDING conclusões render as awaiting approval.
// Bruno: 1 approved bloco (Aprendizagem Contínua…), frontier "Consumo
// Responsável" carries 2 pending fixed ações (consumo-responsavel:fixed:0/1).
// ─────────────────────────────────────────────────────────────────────────────
const PENDING_ACTION_A = "escoteiro:consumo-responsavel:fixed:0";
const PENDING_ACTION_B = "escoteiro:consumo-responsavel:fixed:1";

escoteiroPending("pending ações render checked with the awaiting-approval clock", async ({
  page,
}) => {
  await page.goto("/");

  // Banner: 1 bloco done → still Pista.
  await expect(
    page.getByRole("heading", { name: "Pista", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1/18 blocos", { exact: true })).toBeVisible();

  // Expand the frontier bloco that holds the two pending ações.
  await page
    .getByRole("button", { name: /Consumo Responsável/i })
    .first()
    .click();

  for (const actionId of [PENDING_ACTION_A, PENDING_ACTION_B]) {
    const checkbox = page.locator(`[id="${actionId}"]`);
    await expect(checkbox).toBeVisible();
    // Checked (self-marked) but pending — not approved-locked, so still enabled.
    await expect(checkbox).toHaveAttribute("data-state", "checked");
    // Awaiting-approval clock sits in the same row as the checkbox.
    const row = page.locator("label", {
      has: page.locator(`[id="${actionId}"]`),
    });
    await expect(row.locator("svg.lucide-clock")).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 27/28 — MULTI-RAMO no-bleed: only the CURRENT ramo's progression shows.
// ─────────────────────────────────────────────────────────────────────────────
seniorHistory("sênior with completed lobinho+escoteiro history shows only 9/18 sênior", async ({
  page,
}) => {
  await page.goto("/");

  // Current sênior ramo only: 9 blocos → Conquista. NOT an 18/18 maxed view.
  await expect(page.getByText("Etapa Atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conquista", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("9/18 blocos", { exact: true })).toBeVisible();
  await expect(page.getByText("18/18 blocos", { exact: true })).toHaveCount(0);

  // Past-ramo etapa/IRR names must NOT bleed in.
  for (const leak of [
    "Caçador",
    "Travessia",
    "Cruzeiro do Sul",
    "Lis de Ouro",
    "Reconhecimento de Ramo completo",
  ]) {
    await expect(page.getByText(leak)).toHaveCount(0);
  }

  // 9 < 18 → sênior IRR still locked.
  await expect(page.getByText(LOCK_TEXT)).toBeVisible();
});

pioneiroHistory("pioneiro with 3-ramo history shows only 7/18 pioneiro (Destino)", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Etapa Atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Destino", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("7/18 blocos", { exact: true })).toBeVisible();
  await expect(page.getByText("18/18 blocos", { exact: true })).toHaveCount(0);

  // No lower-ramo etapa/IRR names.
  for (const leak of [
    "Travessia",
    "Caçador",
    "Azimute",
    "Escoteiro da Pátria",
    "Reconhecimento de Ramo completo",
  ]) {
    await expect(page.getByText(leak)).toHaveCount(0);
  }

  await expect(page.getByText(LOCK_TEXT)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Story 30 — Especialidade deep-link: a dashboard bloco's alternative row
// links into /especialidades with the matching card auto-opened.
// (Navigation only — any escoteiro works; uses the empty persona.)
// ─────────────────────────────────────────────────────────────────────────────
escoteiroEmpty("bloco especialidade 'ver' link deep-links into the matching card", async ({
  page,
}) => {
  await page.goto("/");

  // "Autonomia e Liderança" lists especialidades (incl. Empreendedorismo) as an
  // alternative completion. Expand it to reveal the "ver" deep-link, then click
  // it. Wrapped in toPass: under parallel load the Radix accordion's expand
  // animation can detach/re-render the row mid-click, swallowing the
  // navigation — re-drive the expand+click until the URL actually changes.
  const empreendedorismoRow = page.locator("label", {
    hasText: "Empreendedorismo",
  });
  await expect(async () => {
    if (!(await empreendedorismoRow.isVisible())) {
      await page
        .getByRole("button", { name: /Autonomia e Liderança/i })
        .first()
        .click();
      await expect(empreendedorismoRow).toBeVisible({ timeout: 2_000 });
    }
    await empreendedorismoRow.getByRole("link", { name: /ver/i }).click();
    await expect(page).toHaveURL(
      /\/especialidades\?.*specialty=empreendedorismo/,
      { timeout: 2_000 },
    );
  }).toPass();
  await expect(
    page.getByRole("heading", { name: "Especialidades", exact: true }),
  ).toBeVisible();

  // The matching card auto-opened: its (unique) description is visible.
  await expect(
    page.getByText(/transformar ideias em soluções criativas/),
  ).toBeVisible();
});
