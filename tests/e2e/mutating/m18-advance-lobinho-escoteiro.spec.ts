/**
 * M18 — Ramo advancement WITHIN the younger group: lobinho → escoteiro.
 * PRD #58 cluster M18 (stories 49 + 50).
 *
 * The admin flips Helena Braga's ramo (sim-troop-lobinho-8) from lobinho to
 * escoteiro via the member ramo editor on /escotista/admin (setMemberRamo).
 * The three domain rules this exercises:
 *
 *   1. PROGRESSION NEVER CARRIES. After advancing, Helena's dashboard starts
 *      fresh on the NEW ramo: 0/18 blocos, escoteiro's initial etapa "Pista",
 *      IRR checklist locked, and NONE of the lobinho etapa names bleed in
 *      (Pata Tenra / Saltador / Rastreador / Caçador). Her lobinho record is
 *      retained (restored at the end) but never shown on the escoteiro dashboard.
 *   2. ESPECIALIDADES CARRY WITHIN THE GROUP. lobinho + escoteiro share the
 *      younger catalog, so Helena's earned younger especialidade (Brasilidades,
 *      Nível 1, 3/6 items — see r4-especialidades.spec.ts) is STILL shown at
 *      its level on the escoteiro /especialidades page.
 *   3. VISIBILITY FLIPS. She now appears in an escoteiro escotista's painel
 *      (Renata) and leaves a lobinho escotista's painel (Marina).
 *
 * SELF-CLEANING: the advance only flips the `ramo` field; per-ramo data is
 * retained. The finally block restores Helena to lobinho and verifies her
 * dashboard shows the original lobinho progression again (Saltador-era banner,
 * 7/18 blocos). Idempotent: re-advancing an already-advanced Helena on a retry
 * is a no-op, so the test proceeds and restores from whatever state it finds.
 *
 * AUTH: this runs against a shared, already-running dev server with siblings in
 * parallel; captured storageStates can be stale/expired. Every navigation is
 * routed through `gotoReady`, which signs the context back in via the test-only
 * signin form (VITE_TEST_AUTH) on demand — it never calls any testing:* function
 * and never writes another persona's auth file.
 *
 * OWNERSHIP: mutates ONLY Helena's ramo. Shared admin login as actor; painéis
 * read by NAME presence/absence (never global counts) — safe under concurrent
 * sibling mutations.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const SUFFIX = "@test.paxtools.local";
const PW = process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only";

const ADMIN = { state: "tests/.auth/admin--m18.json", email: `admin${SUFFIX}` };
const HELENA = { state: "tests/.auth/sim-troop-lobinho-8.json", email: `sim-troop-lobinho-8${SUFFIX}`, name: "Helena Braga" };
const RENATA = { state: "tests/.auth/sim-escotista-escoteiro-1--m18.json", email: `sim-escotista-escoteiro-1${SUFFIX}` }; // escoteiro escotista
const MARINA = { state: "tests/.auth/sim-escotista-lobinho-1--m18.json", email: `sim-escotista-lobinho-1${SUFFIX}` }; // lobinho escotista

const LOCK_TEXT = /Complete todos os 18 blocos para desbloquear o checklist/;
const LOBINHO_ETAPAS = ["Pata Tenra", "Saltador", "Rastreador", "Caçador"];

/**
 * Navigate to `url` and wait for `ready`, recovering from the cold-auth /signin
 * bounce: if the test-only signin form appears, sign `email` back in and retry.
 */
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

/** Load an escotista painel (search box is the readiness signal). */
async function gotoPainel(page: Page, email: string) {
  await gotoReady(page, "/escotista", page.getByPlaceholder("Buscar escoteiro..."), email);
}

/** Flip a scout's ramo via the admin member ramo editor (setMemberRamo). */
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
  // Pick the target ramo (accessible name is "<Label> <age range>").
  await row.getByRole("button", { name: new RegExp(`^${ramoLabel}\\b`) }).click();
  await row.getByRole("button", { name: "Salvar ramo", exact: true }).click();
  // Editor closes on success → the save button unmounts.
  await expect(
    row.getByRole("button", { name: "Salvar ramo", exact: true }),
  ).toHaveCount(0, { timeout: 15_000 });
}

test("M18 admin advances Helena lobinho→escoteiro: fresh progression, younger especialidade carries, visibility flips", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const adminCtx = await browser.newContext({ storageState: ADMIN.state });
  const helenaCtx = await browser.newContext({ storageState: HELENA.state });
  const renataCtx = await browser.newContext({ storageState: RENATA.state });
  const marinaCtx = await browser.newContext({ storageState: MARINA.state });
  const admin = await adminCtx.newPage();
  const helena = await helenaCtx.newPage();
  const renata = await renataCtx.newPage();
  const marina = await marinaCtx.newPage();

  try {
    // ── Advance lobinho → escoteiro (idempotent on retry) ─────────────────────
    await setScoutRamo(admin, HELENA.name, "Escoteiro");

    // ── Rule 1: dashboard starts FRESH on the escoteiro ramo ──────────────────
    await gotoReady(helena, "/", helena.getByText("Etapa Atual"), HELENA.email);
    await expect(
      helena.getByRole("heading", { name: "Pista", exact: true }),
    ).toBeVisible();
    await expect(helena.getByText("0/18 blocos", { exact: true })).toBeVisible();
    await expect(helena.getByText(LOCK_TEXT)).toBeVisible();
    // No lobinho etapa names bleed into the escoteiro dashboard.
    for (const name of LOBINHO_ETAPAS) {
      await expect(helena.getByText(name, { exact: true })).toHaveCount(0);
    }
    // Not maxed: no lobinho IRR trophy leaks in.
    await expect(helena.getByText(/Cruzeiro do Sul/)).toHaveCount(0);

    // ── Rule 2: younger especialidade CARRIES (shared younger catalog) ────────
    // Brasilidades (Nível 1, 3/6) still renders at its level as an escoteiro.
    const card = helena.getByRole("button", { name: /Brasilidades/ });
    await gotoReady(helena, "/especialidades?specialty=brasilidades", card, HELENA.email);
    await expect(card).toContainText("Nível 1");
    await expect(card).toContainText("3/6 itens aprovados");

    // ── Rule 3: visibility flips lobinho → escoteiro escotista ────────────────
    await gotoPainel(renata, RENATA.email);
    await expect(
      renata.getByText(HELENA.name, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await gotoPainel(marina, MARINA.email);
    // Settle Marina's painel on a known lobinho scout, then assert Helena gone.
    await expect(
      marina.getByText("Alice Prado", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(marina.getByText(HELENA.name, { exact: true })).toHaveCount(0);
  } finally {
    // ── Self-clean: restore Helena to lobinho and verify her prior state ──────
    await setScoutRamo(admin, HELENA.name, "Lobinho");
    await gotoReady(helena, "/", helena.getByText("Etapa Atual"), HELENA.email);
    await expect(
      helena.getByRole("heading", { name: "Saltador", exact: true }),
    ).toBeVisible();
    await expect(helena.getByText("7/18 blocos", { exact: true })).toBeVisible();

    await adminCtx.close();
    await helenaCtx.close();
    await renataCtx.close();
    await marinaCtx.close();
  }
});
