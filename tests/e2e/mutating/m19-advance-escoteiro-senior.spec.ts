/**
 * M19 — Ramo advancement ACROSS the group boundary: escoteiro → sênior.
 * PRD #58 cluster M19 (stories 49 + 51).
 *
 * The admin flips Gabriela Pinto's ramo (sim-troop-escoteiro-7) from escoteiro
 * to sênior via the member ramo editor on /escotista/admin (setMemberRamo).
 * Crossing the younger/older boundary is the trickiest rule in the domain:
 *
 *   1. PROGRESSION NEVER CARRIES. Gabriela's dashboard starts fresh on the
 *      sênior ramo: 0/18 blocos, sênior's initial etapa "Escalada", the
 *      three-etapa shape (next stage "Conquista"), IRR locked, and NONE of the
 *      escoteiro etapa names bleed in (Pista / Trilha / Rumo / Travessia).
 *   2. ESPECIALIDADES START FRESH ACROSS THE BOUNDARY. escoteiro is younger,
 *      sênior is older — a different catalog. Her earned YOUNGER especialidade
 *      record is retained but NEVER shown in the older group. The older
 *      /especialidades page (three-etapa project UI) must render with NO
 *      younger-only signals at all: no "Nível 1/2" level badge and no "itens
 *      aprovados" progress line anywhere. (A raw name-absence check is avoided
 *      on purpose — a few names, e.g. "Comunicações", exist in BOTH the younger
 *      and older catalogs, so the older catalog legitimately shows them; the
 *      younger-signal assertions below are the name-agnostic, bug-catching form
 *      of "her younger especialidade is not shown".)
 *   3. VISIBILITY FLIPS. She now appears in a sênior escotista's painel (Talita)
 *      and leaves an escoteiro escotista's painel (Renata).
 *
 * SELF-CLEANING: the advance only flips `ramo`; per-ramo data is retained. The
 * finally block restores Gabriela to escoteiro and verifies her dashboard shows
 * the original escoteiro progression again (Trilha-era banner, 7/18 blocos) and
 * that especialidades is back to the younger UI. Idempotent on retry.
 *
 * AUTH: see gotoReady — every navigation self-heals a stale/expired storageState
 * via the test-only signin form (no testing:* calls, no foreign auth writes).
 *
 * OWNERSHIP: mutates ONLY Gabriela's ramo. Shared admin login as actor; painéis
 * read by NAME presence/absence, never global counts.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const SUFFIX = "@test.paxtools.local";
const PW = process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only";

const ADMIN = { state: "tests/.auth/admin--m19.json", email: `admin${SUFFIX}` };
const GABRIELA = { state: "tests/.auth/sim-troop-escoteiro-7.json", email: `sim-troop-escoteiro-7${SUFFIX}`, name: "Gabriela Pinto" };
const RENATA = { state: "tests/.auth/sim-escotista-escoteiro-1--m19.json", email: `sim-escotista-escoteiro-1${SUFFIX}` }; // escoteiro escotista
const TALITA = { state: "tests/.auth/sim-escotista-senior-1--m19.json", email: `sim-escotista-senior-1${SUFFIX}` }; // sênior escotista

const LOCK_TEXT = /Complete todos os 18 blocos para desbloquear o checklist/;
const ESCOTEIRO_ETAPAS = ["Pista", "Trilha", "Rumo", "Travessia"];
const OLDER_INTRO = /Cada especialidade é um projeto em três etapas/;

async function gotoReady(page: Page, url: string, ready: Locator, email: string) {
  const submit = page.getByTestId("test-signin-submit");
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url);
    const outcome = await Promise.race([
      ready.waitFor({ state: "visible", timeout: 10_000 }).then(() => "ready" as const).catch(() => "x" as const),
      submit.waitFor({ state: "visible", timeout: 10_000 }).then(() => "signin" as const).catch(() => "x" as const),
    ]);
    if (outcome === "ready") return;
    if (outcome === "signin") {
      await page.getByTestId("test-signin-email").fill(email);
      await page.getByTestId("test-signin-password").fill(PW);
      await submit.click();
      await page.waitForURL((u) => !/\/signin/.test(u.pathname), { timeout: 20_000 }).catch(() => {});
    }
  }
  await ready.waitFor({ state: "visible", timeout: 12_000 });
}

async function gotoPainel(page: Page, email: string) {
  await gotoReady(page, "/escotista", page.getByPlaceholder("Buscar escoteiro..."), email);
}

async function setScoutRamo(admin: Page, scoutName: string, ramoLabel: string) {
  await gotoReady(
    admin,
    "/escotista/admin",
    admin.getByRole("heading", { name: "Membros", exact: true }),
    ADMIN.email,
  );
  const row = admin.getByRole("listitem").filter({ hasText: scoutName });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: "Editar ramo do escoteiro" }).click();
  await row.getByRole("button", { name: new RegExp(`^${ramoLabel}\\b`) }).click();
  await row.getByRole("button", { name: "Salvar ramo", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Salvar ramo", exact: true }),
  ).toHaveCount(0, { timeout: 15_000 });
}

test("M19 admin advances Gabriela escoteiro→sênior: fresh progression, especialidades start fresh across the boundary, visibility flips", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const adminCtx = await browser.newContext({ storageState: ADMIN.state });
  const gabrielaCtx = await browser.newContext({ storageState: GABRIELA.state });
  const renataCtx = await browser.newContext({ storageState: RENATA.state });
  const talitaCtx = await browser.newContext({ storageState: TALITA.state });
  const admin = await adminCtx.newPage();
  const gabriela = await gabrielaCtx.newPage();
  const renata = await renataCtx.newPage();
  const talita = await talitaCtx.newPage();

  try {
    // ── Advance escoteiro → sênior (idempotent on retry) ──────────────────────
    await setScoutRamo(admin, GABRIELA.name, "Sênior");

    // ── Rule 1: dashboard starts FRESH on the sênior ramo (3-etapa shape) ─────
    await gotoReady(gabriela, "/", gabriela.getByText("Etapa Atual"), GABRIELA.email);
    await expect(
      gabriela.getByRole("heading", { name: "Escalada", exact: true }),
    ).toBeVisible();
    await expect(gabriela.getByText("0/18 blocos", { exact: true })).toBeVisible();
    // Three-etapa progression: first threshold is +6 blocos to Conquista.
    await expect(gabriela.getByText(/\+6 blocos para/)).toBeVisible();
    await expect(gabriela.getByText("Conquista", { exact: true })).toBeVisible();
    await expect(gabriela.getByText(LOCK_TEXT)).toBeVisible();
    // No escoteiro etapa names bleed into the sênior dashboard.
    for (const name of ESCOTEIRO_ETAPAS) {
      await expect(gabriela.getByText(name, { exact: true })).toHaveCount(0);
    }
    await expect(gabriela.getByText(/Lis de Ouro/)).toHaveCount(0);

    // ── Rule 2: especialidades START FRESH — older UI, no younger signals ─────
    await gotoReady(gabriela, "/especialidades", gabriela.getByText(OLDER_INTRO), GABRIELA.email);
    // The three-etapa project intro means the OLDER catalog is rendered — the
    // page can only reach it when user.ramo is in the older group. Had the cross
    // failed to re-group her, this would be the younger item-checklist page (no
    // intro) and the ready gate above would never have passed.
    await expect(gabriela.getByText(OLDER_INTRO)).toBeVisible();
    // Her younger record is retained but NEVER shown here: no younger card, no
    // younger level badge, no younger item-progress line.
    await expect(gabriela.getByText(/Nível [12]/)).toHaveCount(0);
    await expect(gabriela.getByText(/itens aprovados/)).toHaveCount(0);

    // ── Rule 3: visibility flips escoteiro → sênior escotista ─────────────────
    await gotoPainel(talita, TALITA.email);
    await expect(
      talita.getByText(GABRIELA.name, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await gotoPainel(renata, RENATA.email);
    await expect(
      renata.getByText("Ana Lima", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(renata.getByText(GABRIELA.name, { exact: true })).toHaveCount(0);
  } finally {
    // ── Self-clean: restore Gabriela to escoteiro and verify her prior state ──
    await setScoutRamo(admin, GABRIELA.name, "Escoteiro");
    await gotoReady(gabriela, "/", gabriela.getByText("Etapa Atual"), GABRIELA.email);
    await expect(
      gabriela.getByRole("heading", { name: "Trilha", exact: true }),
    ).toBeVisible();
    await expect(gabriela.getByText("7/18 blocos", { exact: true })).toBeVisible();
    // Especialidades back to the younger (item-checklist) UI.
    await gotoReady(
      gabriela,
      "/especialidades",
      gabriela.getByRole("heading", { name: "Especialidades", exact: true }),
      GABRIELA.email,
    );
    await expect(gabriela.getByText(OLDER_INTRO)).toHaveCount(0);

    await adminCtx.close();
    await gabrielaCtx.close();
    await renataCtx.close();
    await talitaCtx.close();
  }
});
