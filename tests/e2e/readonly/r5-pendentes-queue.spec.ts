/**
 * R5 — Pending approvals queue read side. PRD stories 35 (read), 37 (read).
 *
 * `/escotista/pending` (`getPendingForGroup`) renders one always-expanded card
 * per visible escoteiro who has ≥1 pending item, scoped to the escotista's
 * ramos (admins see all). Every pending row — ação, IRR, personalizada,
 * younger especialidade item, older especialidade relato — is one selectable
 * row with a context line ("Especialidade X · item N", "Relato · X · Etapa")
 * feeding the one sticky Aprovar/Rejeitar bar (story 37).
 *
 * Empirically-derived card counts (escoteiros with totalPending > 0):
 *   lobinho 6 · escoteiro 6 · senior 5 · pioneiro 2 · all four 19.
 * (escoteiro includes the catalog `progression` user's 2 seeded pendings.)
 *
 * READ-ONLY: never selects a row, approves, or rejects.
 */

import { adminTest, escotistaTest, testAs, expect } from "../../fixtures/auth";

const marinaTest = testAs("sim-escotista-lobinho-1"); // single-ramo lobinho
const veraTest = testAs("sim-escotista-pioneiro-1"); // single-ramo pioneiro

/** Each card header carries exactly one "N pendente(s)" pill — the row unit. */
const pendingCards = (page: import("@playwright/test").Page) =>
  page.getByText(/^\d+ pendentes?$/);

// ── Queue is scoped to the escotista's ramos ─────────────────────────────────

marinaTest("lobinho escotista queue shows only lobinho pendings", async ({
  page,
}) => {
  await page.goto("/escotista/pending");

  await expect(
    page.getByRole("button", { name: /Bento Farias/ }),
  ).toBeVisible({ timeout: 10_000 });

  await expect(pendingCards(page)).toHaveCount(6);

  // A known lobinho pending is present; a senior pending is not.
  await expect(page.getByText("Bento Farias", { exact: true })).toBeVisible();
  await expect(page.getByText("Quésia Torres", { exact: true })).toHaveCount(0);
});

escotistaTest(
  "multi-ramo escotista queue shows escoteiro + senior pendings",
  async ({ page }) => {
    await page.goto("/escotista/pending");

    await expect(
      page.getByRole("button", { name: /Bruno Sá/ }),
    ).toBeVisible({ timeout: 10_000 });

    // escoteiro (6) + senior (5) = 11.
    await expect(pendingCards(page)).toHaveCount(11);

    await expect(page.getByText("Bruno Sá", { exact: true })).toBeVisible(); // escoteiro
    await expect(page.getByText("Quésia Torres", { exact: true })).toBeVisible(); // senior
    await expect(page.getByText("Bento Farias", { exact: true })).toHaveCount(0); // lobinho absent
  },
);

adminTest("admin queue shows every ramo's pendings", async ({ page }) => {
  await page.goto("/escotista/pending");

  await expect(
    page.getByRole("button", { name: /Bento Farias/ }),
  ).toBeVisible({ timeout: 10_000 });

  // 6 + 6 + 5 + 2 = 19 escoteiros with pending items.
  await expect(pendingCards(page)).toHaveCount(19);
});

// ── Card composition: younger especialidade items vs older project reports ───

marinaTest(
  "younger especialidade items render as selectable item rows",
  async ({ page }) => {
    await page.goto("/escotista/pending");

    // Cecília Moraes has 2 pending younger especialidade items (#42).
    const card = page.getByTestId("pending-person").filter({ hasText: "Cecília Moraes" });
    await expect(card).toBeVisible({ timeout: 10_000 });

    const specRows = card.locator('[data-testid="pending-item"][data-kind="specItem"]');
    await expect(specRows).toHaveCount(2);
    await expect(specRows.first()).toContainText(/Especialidade .+ · item \d+/i);
    // Unselected by default — nothing is approved by a stray tap on the bar.
    await expect(specRows.first().getByRole("checkbox")).not.toBeChecked();
  },
);

escotistaTest(
  "older especialidade project reports render as relato rows",
  async ({ page }) => {
    await page.goto("/escotista/pending");

    // Rafael Bastos (senior) has a pending older especialidade step report (#43).
    const card = page.getByTestId("pending-person").filter({ hasText: "Rafael Bastos" });
    await expect(card).toBeVisible({ timeout: 10_000 });

    const report = card.locator('[data-testid="pending-item"][data-kind="report"]');
    await expect(report.first()).toContainText(/Relato · /i);
    // The seeded report body confirms the relato text itself rendered.
    await expect(card.getByText(/dados de demonstração/)).toBeVisible();
  },
);

veraTest("pioneiro escotista queue scoped and renders a report card", async ({
  page,
}) => {
  await page.goto("/escotista/pending");

  const trigger = page.getByRole("button", { name: /Dante Meireles/ });
  await expect(trigger).toBeVisible({ timeout: 10_000 });

  await expect(pendingCards(page)).toHaveCount(2);

  // Eloá Pacheco has a pending older especialidade report.
  const eloa = page.getByTestId("pending-person").filter({ hasText: "Eloá Pacheco" });
  await expect(
    eloa.locator('[data-testid="pending-item"][data-kind="report"]').first(),
  ).toBeVisible();
});
