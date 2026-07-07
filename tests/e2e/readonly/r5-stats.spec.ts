/**
 * R5 · Stats page — exact assertions against the seeded 4-ramo sim troop
 * (PRD #58, story 38 + the story-26 stats-hygiene corollary + story-42 AI-card
 * read-side).
 *
 * The etapa (stage) distribution is PINNED by the seed, so it is asserted
 * exactly. Every expected number is derived below from `SIM_SPECS` in
 * `convex/testing.ts`, applying the "+1 effective bloco when an especialidade is
 * earned/level2" rule (`seedSimRamo`: `effectiveBlocks += 1`) and the etapa
 * thresholds from `progression-rules.ts`:
 *   lobinho/escoteiro → 0/4/8/13 (4 etapas)   senior/pioneiro → 0/6/12 (3 etapas)
 * `getCurrentStage` picks the highest etapa whose threshold ≤ effectiveBlocks.
 *
 * Coverage bars / most-done / gaps / acompanhamento are data-driven aggregates
 * that are tedious to pin per-cell; for those we assert the section renders WITH
 * data (a real row/meter), not exact counts.
 *
 * Read-only: switching ramo tabs is pure client state (no mutation).
 */
import { escotistaTest, approvedTest, adminTest, testAs, expect } from "../../fixtures/auth";

const marinaTest = testAs("sim-escotista-lobinho-1"); // Marina Solano — lobinho only

// Wait for the stats body (post-Suspense) to be mounted for the active ramo.
async function waitForStats(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/escotista\/stats/);
  await expect(page.getByTestId("stats-stage-distribution")).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * Assert a stage cell shows an exact scout count. The cell <div> stacks three
 * <p>: count, etapa name, pct. We anchor on the etapa name (unique per ramo)
 * and match the count with exact text — the pct always carries a "%", so a bare
 * digit never collides with it.
 */
async function expectStage(
  page: import("@playwright/test").Page,
  etapaName: string,
  count: string,
) {
  const dist = page.getByTestId("stats-stage-distribution");
  const cell = dist.getByText(etapaName, { exact: true }).locator("..");
  await expect(cell.getByText(count, { exact: true })).toBeVisible();
}

marinaTest(
  "stats stage distribution is exact for the lobinho cohort",
  async ({ page }) => {
    await page.goto("/escotista/stats");
    await waitForStats(page);

    // Marina accompanies one ramo → the switcher collapses to a heading, no tabs.
    await expect(
      page.getByRole("heading", { name: "Lobinho" }),
    ).toBeVisible();
    await expect(page.getByTestId("stats-ramo-switcher")).toHaveCount(0);

    // Lobinho cohort = 16 SIM_SPECS.lobinho scouts + 1 catalog persona
    // (`escoteiro_lobinho`, name "lobinho", ramo lobinho, 0 blocos) = 17.
    // effectiveBlocks per scout (SIM_SPECS + "+1 bloco when an especialidade is
    // earned/level2"), then etapa (thresholds 0/4/8/13):
    //   Pata Tenra (<4): Alice 0, Bento 1, Cecília 2, Davi 3, Estela 3,
    //                    + catalog "lobinho" 0                                   → 6
    //   Saltador (4–7):  Felipe 4, Gael 5, Helena 6+1(earned)=7, Igor 7          → 4
    //   Rastreador (8–12): Júlia 8, Kaique 9+1(level2)=10, Lara 11               → 3
    //   Caçador (13+): Miguel 13, Nara 15+1(earned)=16, Otto 18, Pilar 18        → 4
    // Story-26 hygiene: Aurora Linhares (a SÊNIOR scout with completed lobinho+
    // escoteiro history) is NOT in this set — coverage/scouts filter by CURRENT
    // ramo (m.ramo === "lobinho"), so her carried-over history never inflates
    // lobinho (she would otherwise push Rastreador to 4). Sum 6+4+3+4 = 17.
    await expectStage(page, "Pata Tenra", "6");
    await expectStage(page, "Saltador", "4");
    await expectStage(page, "Rastreador", "3");
    await expectStage(page, "Caçador", "4");

    // Other sections render WITH data (not just a shell).
    await expect(page.getByTestId("stats-eixo-bars")).toBeVisible();
    await expect(
      page.getByTestId("stats-eixo-bars").getByRole("meter").first(),
    ).toBeVisible();
    await expect(page.getByTestId("stats-most-done")).toBeVisible();
    await expect(
      page.getByTestId("stats-most-done").getByRole("meter").first(),
    ).toBeVisible();
    await expect(page.getByTestId("stats-gap-list")).toBeVisible();
    // Seeded scouts leave real gaps → the "variáveis pouco exploradas" block
    // (neglectedVariable) is populated in the default (all/all) filter.
    await expect(page.getByTestId("stats-gap-variable")).toBeVisible();
    await expect(page.getByTestId("stats-acompanhamento")).toBeVisible();
    // Acompanhamento lists every in-ramo scout by name (spot-check one).
    await expect(
      page.getByTestId("stats-acompanhamento").getByText("Otto Vilela"),
    ).toBeVisible();

    // Story 42 read-side (loose absence contract): the ai_suggestions feature
    // flag has no featureFlags row on this deployment (verified via a one-off
    // query → flags:[]), so AiSuggestionsCard returns null and its testid never
    // mounts. See the skipped "renders" test below for the positive contract.
    await expect(page.getByTestId("stats-ai-suggestions")).toHaveCount(0);
  },
);

escotistaTest(
  "ramo switcher swaps the numbers between the escotista's two ramos",
  async ({ page }) => {
    // The catalog `escotista` accompanies escoteiro + senior (two tabs).
    await page.goto("/escotista/stats");
    await waitForStats(page);

    const switcher = page.getByTestId("stats-ramo-switcher");
    await expect(switcher).toBeVisible();
    await expect(switcher.getByRole("tab")).toHaveCount(2);

    // Default ramo = first selectable = escoteiro. 15 SIM_SPECS.escoteiro scouts
    //   + 2 catalog escoteiros (`escoteiro_approved` 0 blocos, `escoteiro_with_
    //   progression` <4 complete blocos) = 17, both landing in Pista:
    //   Pista (<4): Ana 0, Bruno 1, Carla 2, Diego 3, + 2 catalog               → 6
    //   Trilha (4–7): Elisa 4, Felipe 5, Gabriela 6+1=7, Heitor 7                 → 4
    //   Rumo (8–12): Íris 8, João 9+1=10, Kelly 11                                → 3
    //   Travessia (13+): Lucas 13, Marina 14, Nina 16, Otávio 18                  → 4
    await expect(
      page.getByRole("tab", { name: "Escoteiro", selected: true }),
    ).toBeVisible();
    await expectStage(page, "Pista", "6");

    // Switch to Sênior → the distribution changes shape entirely. 13 senior
    // scouts (3 etapas at 0/6/12):
    //   Escalada (<6): Paulo 0, Quésia 1, Rafael 3, Sofia 4, Tiago 5             → 5
    //   Conquista (6–11): Úrsula 6, Vitor 7+1=8, Wanda 8, Xavier 10, Aurora 9   → 5
    //   Azimute (12+): Yara 12, Zeca 14, Breno 18                                → 3
    // Aurora Linhares appears HERE (senior is her current ramo), never in lobinho.
    await page.getByRole("tab", { name: "Sênior" }).click();
    await expect(
      page.getByRole("tab", { name: "Sênior", selected: true }),
    ).toBeVisible();
    await expectStage(page, "Escalada", "5");
    await expectStage(page, "Azimute", "3");
    // Escoteiro's "Pista" etapa no longer exists on the senior board — proves the
    // numbers truly swapped, not merely re-labelled.
    await expect(
      page.getByTestId("stats-stage-distribution").getByText("Pista", {
        exact: true,
      }),
    ).toHaveCount(0);
  },
);

adminTest(
  "admin can select any of the four ramos and sees each ramo's numbers",
  async ({ page }) => {
    await page.goto("/escotista/stats");
    await waitForStats(page);

    const switcher = page.getByTestId("stats-ramo-switcher");
    await expect(switcher.getByRole("tab")).toHaveCount(4);
    for (const label of ["Lobinho", "Escoteiro", "Sênior", "Pioneiro"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }

    // Admin default ramo = lobinho (allRamos[0]) → same pinned lobinho numbers.
    await expectStage(page, "Pata Tenra", "6");

    // Pioneiro: only 5 scouts (3 etapas at 0/6/12):
    //   Descoberta (<6): Dante 2, Eloá 5                                         → 2
    //   Destino (6–11): Clara 7 (3-ramo history — counts only in pioneiro)       → 1
    //   Horizonte (12+): Fábio 12+1(earned)=13, Gilda 18                         → 2
    await page.getByRole("tab", { name: "Pioneiro" }).click();
    await expect(
      page.getByRole("tab", { name: "Pioneiro", selected: true }),
    ).toBeVisible();
    await expectStage(page, "Descoberta", "2");
    await expectStage(page, "Destino", "1");
    await expectStage(page, "Horizonte", "2");
  },
);

// Story 42 (positive read-side contract) — the AI suggestions card RENDERS in
// its idle state. SKIPPED: the `ai_suggestions` feature flag is OFF on this
// deployment (no featureFlags row; verified 2026-07-06), so AiSuggestionsCard
// returns null and `stats-ai-suggestions` never mounts. Positively asserting the
// idle card would require enabling the flag (a mutation, out of scope for a
// read-only spec). The loose absence contract is covered in the Marina test
// above. Enable the flag on the test deployment to un-skip.
marinaTest.skip(
  "AI suggestions card renders idle (flag ai_suggestions is OFF here)",
  async ({ page }) => {
    await page.goto("/escotista/stats");
    await expect(page.getByTestId("stats-ai-suggestions")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Gerar sugestões/ }),
    ).toBeVisible();
  },
);

approvedTest("escoteiro is redirected away from the stats page", async ({
  page,
}) => {
  await page.goto("/escotista/stats");
  await expect(page).not.toHaveURL(/\/escotista\/stats/, { timeout: 10_000 });
});
