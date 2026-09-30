/**
 * R4 — Especialidades (/especialidades): younger item-based levels and older
 * three-etapa (conhecer → fazer → compartilhar) project states.
 *
 * The page (src/routes/especialidades.tsx) is a hub (KPIs, search, eixo
 * chips, Em andamento / Conquistadas / Explorar) and a pushed detail screen,
 * opened by `?specialty=<id>` (#44 deep link from bloco cards):
 *   - younger (lobinho/escoteiro): detail head `esp-detail-head` shows
 *     "{approved} de {total} itens", "{n} aguardando aprovação" when pending,
 *     and level boxes `level-box-1` / `level-box-2` with `data-reached`.
 *     Items are `ficha-item-{i}` with `data-state` open|pending|approved.
 *   - older (sênior/pioneiro): head shows `esp-older-status` ("{n} de 3
 *     etapas…" / "Conquistada · 3 etapas aprovadas") and a "Conquistada" pill;
 *     each etapa is `ficha-step-{step}` with `data-state` open|pending|approved
 *     and an "Aprovado"/"Pendente" pill in its header.
 *
 * Seed state (SIM_SPECS + insertYoungerSpecialty/insertOlderSpecialty):
 *   YOUNGER (lobinho)
 *     lobinho-8  Helena Braga  earned    brasilidades  3/6 approved → Nível 1
 *     lobinho-11 Kaique Neves  level2    nutricao      6/6 approved → Nível 2
 *     lobinho-6  Felipe Duarte inProgress acampamento  3/8 approved, 1 pending
 *     lobinho-3  Cecília Moraes pending  meteorologia  0/6, 2 pending
 *   OLDER (sênior)
 *     senior-3   Rafael Bastos  pending    comunicacoes                0/3, conhecer pending
 *     senior-6   Úrsula Mattos  inProgress natureza-e-ciencias-naturais 1/3
 *     senior-7   Vitor Sampaio  earned     esportes-de-aventura        3/3 → Conquistada
 *
 * READ-ONLY: deep-links + reads the head/pills only. No item toggles, no
 * step submissions.
 */

import type { Locator, Page, TestInfo } from "@playwright/test";
import { testAs, expect } from "../../fixtures/auth";

/**
 * Navigate to a deep-linked especialidade and wait for the detail to render.
 * On a cold, fully-parallel load the escoteiro auth handshake can be starved,
 * bouncing the page to /signin; re-`goto` until the detail head appears.
 */
async function openDetail(page: Page, testInfo: TestInfo, specialtyId: string): Promise<Locator> {
  testInfo.setTimeout(90_000);
  const head = page.getByTestId("esp-detail-head");
  const signin = page.getByRole("button", { name: "Sign in (test)" });
  const url = `/especialidades?specialty=${specialtyId}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url);
    const outcome = await Promise.race([
      head.waitFor({ state: "visible", timeout: 12_000 }).then(() => "ready" as const).catch(() => "timeout" as const),
      signin.waitFor({ state: "visible", timeout: 12_000 }).then(() => "signin" as const).catch(() => "timeout" as const),
    ]);
    if (outcome === "ready") return head;
  }
  await head.waitFor({ state: "visible", timeout: 12_000 });
  return head;
}

const levelBox = (page: Page, level: 1 | 2) => page.getByTestId(`level-box-${level}`);
const step = (page: Page, s: "conhecer" | "fazer" | "compartilhar") => page.getByTestId(`ficha-step-${s}`);

// ── Younger: item-count-driven levels ──────────────────────────────────────

testAs("sim-troop-lobinho-8")(
  "younger earned especialidade shows Nível 1 at half the items approved",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "brasilidades");
    await expect(head).toContainText("3 de 6 itens");
    await expect(levelBox(page, 1)).toHaveAttribute("data-reached", "true");
    await expect(levelBox(page, 2)).toHaveAttribute("data-reached", "false");
    await expect(page.locator('[data-testid^="ficha-item-"][data-state="approved"]')).toHaveCount(3);
  },
);

testAs("sim-troop-lobinho-11")(
  "younger level2 especialidade shows Nível 2 with every item approved",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "nutricao");
    await expect(head).toContainText("6 de 6 itens");
    await expect(levelBox(page, 2)).toHaveAttribute("data-reached", "true");
    await expect(page.locator('[data-testid^="ficha-item-"][data-state="approved"]')).toHaveCount(6);
  },
);

testAs("sim-troop-lobinho-6")(
  "younger in-progress especialidade is one item short of Nível 1 with a pending item",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "acampamento");
    await expect(head).toContainText("3 de 8 itens");
    await expect(head).toContainText("1 aguardando aprovação");
    // 3/8 approved: below the 4-item Nível 1 threshold.
    await expect(levelBox(page, 1)).toHaveAttribute("data-reached", "false");
    await expect(levelBox(page, 1)).toContainText("falta 1 item");
    await expect(page.locator('[data-testid^="ficha-item-"][data-state="pending"]')).toHaveCount(1);
  },
);

testAs("sim-troop-lobinho-3")(
  "younger pending especialidade shows zero approved and two pending items",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "meteorologia");
    await expect(head).toContainText("0 de 6 itens");
    await expect(head).toContainText("2 aguardando aprovação");
    await expect(levelBox(page, 1)).toHaveAttribute("data-reached", "false");
    await expect(page.locator('[data-testid^="ficha-item-"][data-state="pending"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="ficha-item-"][data-state="approved"]')).toHaveCount(0);
  },
);

// ── Older: three-etapa project states ───────────────────────────────────────

testAs("sim-troop-senior-3")(
  "older pending especialidade: conhecer pending, nothing approved, not Conquistada",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "comunicacoes");
    await expect(page.getByTestId("esp-older-status")).toContainText("0 de 3 etapas");
    await expect(head).not.toContainText("Conquistada");

    await expect(step(page, "conhecer")).toHaveAttribute("data-state", "pending");
    await expect(step(page, "conhecer")).toContainText("Pendente");
    // fazer / compartilhar have no report yet → no state pill.
    await expect(step(page, "fazer")).toHaveAttribute("data-state", "open");
    await expect(step(page, "compartilhar")).toHaveAttribute("data-state", "open");
  },
);

testAs("sim-troop-senior-6")(
  "older in-progress especialidade: conhecer approved, fazer pending, not Conquistada",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "natureza-e-ciencias-naturais");
    await expect(page.getByTestId("esp-older-status")).toContainText("1 de 3 etapas");
    await expect(head).not.toContainText("Conquistada");

    await expect(step(page, "conhecer")).toHaveAttribute("data-state", "approved");
    await expect(step(page, "conhecer")).toContainText("Aprovado");
    await expect(step(page, "fazer")).toHaveAttribute("data-state", "pending");
    await expect(step(page, "fazer")).toContainText("Pendente");
    await expect(step(page, "compartilhar")).toHaveAttribute("data-state", "open");
  },
);

testAs("sim-troop-senior-7")(
  "older earned especialidade: all three etapas approved → Conquistada",
  async ({ page }, testInfo) => {
    const head = await openDetail(page, testInfo, "esportes-de-aventura");
    await expect(page.getByTestId("esp-older-status")).toContainText("3 etapas aprovadas");
    await expect(head).toContainText("Conquistada");

    for (const s of ["conhecer", "fazer", "compartilhar"] as const) {
      await expect(step(page, s)).toHaveAttribute("data-state", "approved");
    }
    await expect(page.getByText("Pendente", { exact: true })).toHaveCount(0);
  },
);
