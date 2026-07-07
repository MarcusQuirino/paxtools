/**
 * R5 — Escotista painel (dashboard) read side. PRD stories 34, 40 (read),
 * 19-adjacent.
 *
 * The painel (`/escotista`, `getGroupStats`) lists EXACTLY the escoteiros in
 * the escotista's accompanied ramos (admins see all). Each escoteiro card
 * carries a favorite control and a "Ver progressão" link into the read-only
 * impersonation view (`/escotista/escoteiro/<id>`, story 40 read side).
 *
 * Empirically-derived approved-escoteiro counts in `__TEST__ Grupo QA`
 * (sim troop + catalog, pending members excluded, no ramo-less escoteiros):
 *   lobinho 17 · escoteiro 17 · senior 13 · pioneiro 5 · all four 52.
 *
 * READ-ONLY: never toggles a favorite (toggleFavoriteEscoteiro persists),
 * never approves/rejects. Search typing only.
 */

import { adminTest, escotistaTest, testAs, expect } from "../../fixtures/auth";

const marinaTest = testAs("sim-escotista-lobinho-1"); // single-ramo lobinho
const veraTest = testAs("sim-escotista-pioneiro-1"); // single-ramo pioneiro

/** One "Ver progressão" link renders per escoteiro card — the countable row. */
const memberCards = (page: import("@playwright/test").Page) =>
  page.getByRole("link", { name: "Ver progressão" });

// ── Painel is scoped to the escotista's ramos ────────────────────────────────

marinaTest(
  "single-ramo escotista painel shows exactly her lobinho cohort",
  async ({ page }) => {
    await page.goto("/escotista");

    // A known lobinho scout renders (settles the query).
    await expect(
      page.getByText("Bento Farias", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // Exactly the 17 approved lobinho escoteiros — pending members excluded.
    await expect(memberCards(page)).toHaveCount(17);

    // Cross-ramo scouts must never surface.
    await expect(page.getByText("Ana Lima", { exact: true })).toHaveCount(0); // escoteiro
    await expect(page.getByText("Quésia Torres", { exact: true })).toHaveCount(0); // senior
  },
);

escotistaTest(
  "multi-ramo escotista painel shows escoteiro + senior, not lobinho",
  async ({ page }) => {
    await page.goto("/escotista");

    await expect(
      page.getByText("Bruno Sá", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // 17 escoteiro + 13 senior = 30. No lobinho, no pioneiro.
    await expect(memberCards(page)).toHaveCount(30);

    await expect(page.getByText("Quésia Torres", { exact: true })).toHaveCount(1); // senior present
    await expect(page.getByText("Alice Prado", { exact: true })).toHaveCount(0); // lobinho absent
    await expect(page.getByText("Clara Estevão", { exact: true })).toHaveCount(0); // pioneiro absent
  },
);

adminTest("admin painel shows all four ramos", async ({ page }) => {
  await page.goto("/escotista");

  await expect(
    page.getByText("Alice Prado", { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  // 17 + 17 + 13 + 5 = 52 approved escoteiros across every ramo.
  await expect(memberCards(page)).toHaveCount(52);

  // One representative name from each ramo.
  await expect(page.getByText("Alice Prado", { exact: true })).toHaveCount(1); // lobinho
  await expect(page.getByText("Ana Lima", { exact: true })).toHaveCount(1); // escoteiro
  await expect(page.getByText("Paulo Vidal", { exact: true })).toHaveCount(1); // senior
  await expect(page.getByText("Clara Estevão", { exact: true })).toHaveCount(1); // pioneiro
});

veraTest("single-ramo pioneiro escotista painel shows only pioneiro", async ({
  page,
}) => {
  await page.goto("/escotista");

  await expect(
    page.getByText("Clara Estevão", { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  await expect(memberCards(page)).toHaveCount(5);
  await expect(page.getByText("Ana Lima", { exact: true })).toHaveCount(0); // escoteiro absent
});

// ── Search ───────────────────────────────────────────────────────────────────

adminTest("search filters the painel to the matching escoteiro", async ({
  page,
}) => {
  await page.goto("/escotista");
  await expect(memberCards(page).first()).toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder("Buscar escoteiro...").fill("Aurora");

  await expect(memberCards(page)).toHaveCount(1);
  await expect(page.getByText("Aurora Linhares", { exact: true })).toBeVisible();
});

marinaTest("searching a cross-ramo name yields no results", async ({ page }) => {
  await page.goto("/escotista");
  await expect(memberCards(page).first()).toBeVisible({ timeout: 10_000 });

  // "Ana Lima" is an escoteiro-ramo scout — invisible to a lobinho escotista.
  await page.getByPlaceholder("Buscar escoteiro...").fill("Ana Lima");

  await expect(memberCards(page)).toHaveCount(0);
  await expect(page.getByText("Nenhum escoteiro encontrado")).toBeVisible();
});

// ── Favorites: control exists, never toggled (mutation persists) ─────────────

marinaTest("escoteiro cards expose a favorite control", async ({ page }) => {
  await page.goto("/escotista");
  await expect(memberCards(page).first()).toBeVisible({ timeout: 10_000 });

  // Assert the affordance only; toggling toggleFavoriteEscoteiro would persist.
  await expect(page.getByRole("button", { name: "Favoritar" }).first()).toBeVisible();
});

// ── Impersonation read view (story 40 read side) ─────────────────────────────

adminTest(
  "admin opens an escoteiro's read-only progression view",
  async ({ page }) => {
    await page.goto("/escotista");
    await expect(memberCards(page).first()).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("Buscar escoteiro...").fill("Kelly Faria");
    await expect(memberCards(page)).toHaveCount(1);
    await memberCards(page).click();

    // Impersonation banner names the scout and marks the read-as-escotista mode.
    await expect(
      page.getByText("Kelly Faria", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Visualizando como escotista/),
    ).toBeVisible();

    // The scout's own progression renders (stage banner + eixo sections).
    await expect(page.getByText("Etapa Atual")).toBeVisible();
    await expect(
      page.getByText("Habilidades para a Vida", { exact: true }).first(),
    ).toBeVisible();
  },
);

marinaTest(
  "in-ramo escotista opens a lobinho scout's progression view",
  async ({ page }) => {
    await page.goto("/escotista");
    await expect(memberCards(page).first()).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("Buscar escoteiro...").fill("Bento Farias");
    await expect(memberCards(page)).toHaveCount(1);
    await memberCards(page).click();

    await expect(
      page.getByText("Bento Farias", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Visualizando como escotista/)).toBeVisible();
    await expect(page.getByText("Etapa Atual")).toBeVisible();
  },
);
