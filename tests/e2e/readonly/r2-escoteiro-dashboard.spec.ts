/**
 * R2 — Escoteiro dashboard renders each persona's per-ramo progression exactly.
 *
 * The dashboard (src/routes/index.tsx → StageBanner (`stage-hero`, meta line
 * `stage-meta`) / EixoSection bloco rows / RecognitionSection) is ramo-scoped:
 * it must show ONLY the viewing escoteiro's current-ramo etapa track, block
 * count, per-eixo progress, and that ramo's IRR — never a past ramo's
 * completed record, and never another ramo's etapa/IRR names. Ações live on
 * the pushed bloco screen (/bloco/<blocoId>, tapped from a bloco row).
 *
 * Every assertion is pinned to the deterministic sim-troop seed
 * (convex/testing.ts SIM_SPECS + seedSimRamo). Block counts, etapa names and
 * IRR names are computed from src/data/progression-rules + the troop-order
 * arithmetic in seedSimRamo, so they are exact, not fuzzy.
 *
 * PRD #58 stories 22–26 + 30 (cluster R2). READ-ONLY: opens bloco screens and
 * follows a deep-link; never toggles a checkbox or submits a form.
 *
 * Note: r2-approved-locked.spec.ts covers the "approved conclusão is locked"
 * contract for this cluster; this file covers the render contracts.
 */

import { expect } from "@playwright/test";
import { testAs } from "../../fixtures/auth";
import { openBloco } from "../shared/bloco-nav";

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

  // Initial etapa hero: escoteiro starts at Pista, next stage Trilha.
  const hero = page.getByTestId("stage-hero");
  await expect(hero.getByText("Etapa atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pista", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    "0 de 18 blocos concluídos",
  );
  await expect(hero.getByText(/Faltam 4 blocos para Trilha/)).toBeVisible();

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

  const hero = page.getByTestId("stage-hero");
  await expect(hero.getByText("Etapa atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conquista", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    /^10 de 18 blocos concluídos/,
  );
  await expect(hero.getByText(/Faltam 2 blocos para Azimute/)).toBeVisible();

  // Every eixo renders as a collapsible section of bloco rows.
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
  await expect(page.getByText("Etapa atual")).toHaveCount(0);

  // Recognition section heading carries the "Completo" pill.
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
  await expect(page.getByText("Etapa atual")).toHaveCount(0);
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

  // Not maxed: normal hero, last lobinho etapa (Caçador), 18/18 blocos.
  await expect(page.getByText("Etapa atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Caçador", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    /^18 de 18 blocos concluídos/,
  );
  await expect(page.getByText("Cruzeiro do Sul!")).toHaveCount(0);

  const recognition = page.locator("section", {
    hasText: "Reconhecimento de Ramo",
  });
  // Unlocked: the lock hint is gone.
  await expect(page.getByText(LOCK_TEXT)).toHaveCount(0);
  // Not yet earned: 3/5 approved + 1 pending, no "Completo" pill.
  await expect(recognition.getByTestId("irr-checklist")).toBeVisible();
  await expect(
    recognition.getByText(/3\/5 requisitos · 1 aguardando/),
  ).toBeVisible();
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

  // Hero: 1 bloco done → still Pista.
  await expect(
    page.getByRole("heading", { name: "Pista", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    /^1 de 18 blocos concluídos/,
  );

  // Open the frontier bloco screen that holds the two pending ações.
  await openBloco(page, "consumo-responsavel");

  for (const actionId of [PENDING_ACTION_A, PENDING_ACTION_B]) {
    const checkbox = page.locator(`[id="${actionId}"]`);
    await expect(checkbox).toBeVisible();
    // Self-marked → pending, not approved-locked, so still enabled.
    await expect(checkbox).toHaveAttribute("data-state", "pending");
    await expect(checkbox).toBeEnabled();
    // Awaiting-approval clock sits inside the check; status line under text.
    await expect(checkbox.locator("svg.lucide-clock")).toBeVisible();
    await expect(
      page.locator(`[data-action-row="${actionId}"]`),
    ).toContainText("Aguardando aprovação");
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
  await expect(page.getByText("Etapa atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conquista", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    /^9 de 18 blocos concluídos/,
  );

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

  await expect(page.getByText("Etapa atual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Destino", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("stage-meta")).toHaveText(
    /^7 de 18 blocos concluídos/,
  );

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
// Story 30 — Especialidade deep-link: a bloco screen's especialidade chip
// links into /especialidades, opening that especialidade's pushed detail.
// (Navigation only — any escoteiro works; uses the empty persona.)
// ─────────────────────────────────────────────────────────────────────────────
escoteiroEmpty("bloco especialidade 'ver' link deep-links into the matching card", async ({
  page,
}) => {
  await page.goto("/");

  // "Autonomia e Liderança" lists especialidades (incl. Empreendedorismo) as an
  // alternative completion. Open its bloco screen and follow the chip's "ver"
  // deep-link.
  await openBloco(page, "autonomia-lideranca");
  const verEmpreendedorismo = page.getByRole("link", {
    name: "ver Empreendedorismo",
  });
  await expect(async () => {
    if (/\/bloco\//.test(page.url())) {
      await verEmpreendedorismo.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(
      /\/especialidades\?.*specialty=empreendedorismo/,
      { timeout: 2_000 },
    );
  }).toPass();
  // The especialidade detail is a pushed screen titled with its name.
  await expect(
    page.getByRole("heading", { level: 1, name: "Empreendedorismo", exact: true }),
  ).toBeVisible();

  // The matching especialidade opened: its (unique) description is visible.
  await expect(
    page.getByText(/transformar ideias em soluções criativas/),
  ).toBeVisible();
});
