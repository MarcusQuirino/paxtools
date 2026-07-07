/**
 * M20 — Ramo advancement WITHIN the older group: sênior → pioneiro.
 * PRD #58 cluster M20 (stories 49 + 50).
 *
 * The admin flips Vitor Sampaio's ramo (sim-troop-senior-7) from sênior to
 * pioneiro via the member ramo editor on /escotista/admin (setMemberRamo):
 *
 *   1. PROGRESSION NEVER CARRIES. Vitor's dashboard starts fresh on the pioneiro
 *      ramo: 0/18 blocos, pioneiro's initial etapa "Descoberta" (next stage
 *      "Destino"), IRR locked, and NONE of the sênior etapa names bleed in
 *      (Escalada / Conquista / Azimute).
 *   2. ESPECIALIDADES CARRY WITHIN THE GROUP. sênior + pioneiro share the older
 *      catalog, so Vitor's earned OLDER especialidade (Esportes de Aventura, all
 *      three etapas approved → "Conquistada" — see r4-especialidades.spec.ts) is
 *      STILL shown as Conquistada on the pioneiro /especialidades page.
 *   3. VISIBILITY FLIPS. He now appears in a pioneiro escotista's painel (Vera)
 *      and leaves a sênior escotista's painel (Talita).
 *
 * SELF-CLEANING: the advance only flips `ramo`; per-ramo data is retained. The
 * finally block restores Vitor to sênior and verifies his dashboard shows the
 * original sênior progression again (Conquista-era banner, 8/18 blocos).
 * Idempotent on retry.
 *
 * AUTH: see gotoReady — every navigation self-heals a stale/expired storageState
 * via the test-only signin form (no testing:* calls, no foreign auth writes).
 *
 * OWNERSHIP: mutates ONLY Vitor's ramo. Shared admin login as actor; painéis
 * read by NAME presence/absence, never global counts.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const SUFFIX = "@test.paxtools.local";
const PW = process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only";

const ADMIN = { state: "tests/.auth/admin--m20.json", email: `admin${SUFFIX}` };
const VITOR = { state: "tests/.auth/sim-troop-senior-7.json", email: `sim-troop-senior-7${SUFFIX}`, name: "Vitor Sampaio" };
const TALITA = { state: "tests/.auth/sim-escotista-senior-1--m20.json", email: `sim-escotista-senior-1${SUFFIX}` }; // sênior escotista
const VERA = { state: "tests/.auth/sim-escotista-pioneiro-1--m20.json", email: `sim-escotista-pioneiro-1${SUFFIX}` }; // pioneiro escotista

const LOCK_TEXT = /Complete todos os 18 blocos para desbloquear o checklist/;
const SENIOR_ETAPAS = ["Escalada", "Conquista", "Azimute"];

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

/** The scoped OlderSpecialtyCard root (`div.scroll-mt-4`) for a deep-linked card. */
function olderCard(page: Page, name: string): Locator {
  return page.locator("div.scroll-mt-4").filter({ hasText: name });
}

test("M20 admin advances Vitor sênior→pioneiro: fresh progression, older especialidade carries, visibility flips", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const adminCtx = await browser.newContext({ storageState: ADMIN.state });
  const vitorCtx = await browser.newContext({ storageState: VITOR.state });
  const talitaCtx = await browser.newContext({ storageState: TALITA.state });
  const veraCtx = await browser.newContext({ storageState: VERA.state });
  const admin = await adminCtx.newPage();
  const vitor = await vitorCtx.newPage();
  const talita = await talitaCtx.newPage();
  const vera = await veraCtx.newPage();

  try {
    // ── Advance sênior → pioneiro (idempotent on retry) ───────────────────────
    await setScoutRamo(admin, VITOR.name, "Pioneiro");

    // ── Rule 1: dashboard starts FRESH on the pioneiro ramo ───────────────────
    await gotoReady(vitor, "/", vitor.getByText("Etapa Atual"), VITOR.email);
    await expect(
      vitor.getByRole("heading", { name: "Descoberta", exact: true }),
    ).toBeVisible();
    await expect(vitor.getByText("0/18 blocos", { exact: true })).toBeVisible();
    await expect(vitor.getByText(/\+6 blocos para/)).toBeVisible();
    await expect(vitor.getByText("Destino", { exact: true })).toBeVisible();
    await expect(vitor.getByText(LOCK_TEXT)).toBeVisible();
    // No sênior etapa names bleed into the pioneiro dashboard.
    for (const name of SENIOR_ETAPAS) {
      await expect(vitor.getByText(name, { exact: true })).toHaveCount(0);
    }
    await expect(vitor.getByText(/Escoteiro da Pátria/)).toHaveCount(0);

    // ── Rule 2: older especialidade CARRIES (shared older catalog) ────────────
    // Esportes de Aventura stays Conquistada (3/3 etapas) as a pioneiro.
    const card = olderCard(vitor, "Esportes de Aventura");
    await gotoReady(vitor, "/especialidades?specialty=esportes-de-aventura", card, VITOR.email);
    await expect(card).toContainText("3/3 etapas aprovadas");
    await expect(card).toContainText("Conquistada");

    // ── Rule 3: visibility flips sênior → pioneiro escotista ──────────────────
    await gotoPainel(vera, VERA.email);
    await expect(
      vera.getByText(VITOR.name, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await gotoPainel(talita, TALITA.email);
    await expect(
      talita.getByText("Quésia Torres", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(talita.getByText(VITOR.name, { exact: true })).toHaveCount(0);
  } finally {
    // ── Self-clean: restore Vitor to sênior and verify his prior state ────────
    await setScoutRamo(admin, VITOR.name, "Sênior");
    await gotoReady(vitor, "/", vitor.getByText("Etapa Atual"), VITOR.email);
    await expect(
      vitor.getByRole("heading", { name: "Conquista", exact: true }),
    ).toBeVisible();
    await expect(vitor.getByText("8/18 blocos", { exact: true })).toBeVisible();

    await adminCtx.close();
    await vitorCtx.close();
    await talitaCtx.close();
    await veraCtx.close();
  }
});
