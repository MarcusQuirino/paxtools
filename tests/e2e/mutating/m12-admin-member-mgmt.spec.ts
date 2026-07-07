/**
 * M12 · Admin member management (PRD #58, stories 44–47).
 *
 * The admin drives `/escotista/admin`; every mutation is verified from the
 * TARGET persona's own second browser context, then reverted in a `finally`
 * safety net so the spec is self-cleaning and repeatable under E2E_SKIP_SEED
 * (which shares state across invocations and skips the teardown reseed).
 *
 *   M12a  promote Bruno Valente (escotista) → admin surface appears in his
 *         context (Admin in the "Mais" sheet + /escotista/admin reachable) →
 *         demote → surface gone.
 *   M12b  flip Zeca Amorim escoteiro→escotista → the escotista shell renders in
 *         his context (bounced there as an escoteiro) → flip back.
 *   M12c  ban Eloá Pacheco → gone from Membros + a memberBan event on the
 *         timeline + her own context is locked out. NO unban exists in the UI
 *         (ban is one-way: "Esta ação não pode ser desfeita pela interface"),
 *         so she is left banned and the teardown reseed restores her.
 *   M12d  edit Hugo Tavares' ramos pioneiro → pioneiro+lobinho → a lobinho
 *         scout (Otto Vilela) becomes visible on his painel alongside a
 *         pioneiro scout (Clara Estevão) → restore to [pioneiro].
 *
 * OWNERSHIP: mutates only Bruno, Zeca, Eloá, Hugo. The admin LOGIN is shared
 * with sibling specs (safe); this spec asserts only on its own personas' rows /
 * cards and never on group-wide counts or the group name. Otto Vilela and Clara
 * Estevão are read-only reference personas (reading their names is allowed).
 *
 * RESILIENCE: the suite shares one dev server + Convex deployment; a reseed
 * elsewhere invalidates captured sessions, so `ensureSignedIn` re-authenticates
 * in-context via the hidden test signin form (never a testing:* function; the
 * shared admin.json is left untouched).
 */

import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";

const ADMIN_STATE = "tests/.auth/admin--m12.json";
const BRUNO_STATE = "tests/.auth/sim-escotista-escoteiro-2.json";
const ZECA_STATE = "tests/.auth/sim-troop-senior-11.json";
const ELOA_STATE = "tests/.auth/sim-troop-pioneiro-3.json";
const HUGO_STATE = "tests/.auth/sim-escotista-pioneiro-2.json";

const ADMIN_EMAIL = "admin@test.paxtools.local";
const BRUNO_EMAIL = "sim-escotista-escoteiro-2@test.paxtools.local";
const ZECA_EMAIL = "sim-troop-senior-11@test.paxtools.local";
const HUGO_EMAIL = "sim-escotista-pioneiro-2@test.paxtools.local";
const PASSWORD = "paxtools-test-only";

const BRUNO = "Bruno Valente";
const ZECA = "Zeca Amorim";
const ELOA = "Eloá Pacheco";
const HUGO = "Hugo Tavares";

// One dev server is shared across parallel workers/agents, so first paints can
// be slow under contention — first-load waits are deliberately long.
const LOAD = 45_000;

async function signInForm(page: Page, email: string) {
  await page.getByTestId("test-signin-email").fill(email);
  await page.getByTestId("test-signin-password").fill(PASSWORD);
  await page.getByTestId("test-signin-submit").click();
  await expect(page).not.toHaveURL(/\/signin/, { timeout: LOAD });
}

/**
 * Load a protected URL and confirm `ready` is visible, re-authenticating when a
 * dead/wiped session bounces us to /signin. Races the target content against
 * the signin form (never waits on `networkidle` — Convex holds a live socket so
 * the network is never idle). A reseed can invalidate the session mid-flight, so
 * we retry a few times.
 */
async function loadReady(
  page: Page,
  url: string,
  email: string,
  ready: () => Locator,
) {
  const signin = page.getByTestId("test-signin-email");
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(url);
    try {
      await expect(ready().or(signin).first()).toBeVisible({ timeout: 25_000 });
    } catch {
      continue; // blank/slow load — retry
    }
    if (await signin.isVisible()) {
      await signInForm(page, email).catch(() => {});
      continue;
    }
    await expect(ready()).toBeVisible({ timeout: 20_000 });
    return;
  }
  throw new Error(`loadReady: ${url} never became ready`);
}

function membersSection(page: Page) {
  return page.locator("section", {
    has: page.getByRole("heading", { name: "Membros" }),
  });
}

function memberRow(page: Page, name: string) {
  return membersSection(page).locator("li", { hasText: name });
}

/** Open the admin page (re-authing if needed) and wait for the Membros list. */
async function gotoAdmin(page: Page) {
  await loadReady(page, "/escotista/admin", ADMIN_EMAIL, () =>
    page.getByRole("heading", { name: "Membros" }),
  );
}

/** Click a member-row action button then confirm its dialog. */
async function confirmRowAction(
  page: Page,
  name: string,
  buttonName: string,
  confirmLabel: string,
) {
  await memberRow(page, name).getByRole("button", { name: buttonName }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel }).click();
  await expect(dialog).toBeHidden({ timeout: LOAD });
}

/** Whether a member row currently carries the escotista role label. */
async function rowIsEscotista(page: Page, name: string): Promise<boolean> {
  // "Escotista" is not a substring of "Escoteiro", so this discriminates roles.
  return (await memberRow(page, name).getByText("Escotista").count()) > 0;
}

/** Find a timeline row for `subject` with `summary` (that persona's line only). */
async function expectTimelineEvent(
  page: Page,
  subject: string,
  summary: string,
) {
  await page.goto("/escotista/timeline");
  const feed = page.getByTestId("timeline-feed");
  await expect(feed).toBeVisible({ timeout: LOAD });
  const row = feed
    .locator("> div")
    .filter({ hasText: subject })
    .filter({ hasText: summary });
  for (let i = 0; i < 5 && (await row.count()) === 0; i++) {
    const more = page.getByRole("button", { name: "Carregar mais" });
    if ((await more.count()) === 0) break;
    await more.click();
    await page.waitForTimeout(300);
  }
  await expect(row.first()).toBeVisible();
}

// ── M12a — promote to admin ──────────────────────────────────────────────────
test("M12a: promoting Bruno unlocks his admin surface; demote re-locks it", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const adminCtx = await browser.newContext({ storageState: ADMIN_STATE });
  const brunoCtx = await browser.newContext({ storageState: BRUNO_STATE });
  const adminPage = await adminCtx.newPage();
  const brunoPage = await brunoCtx.newPage();

  const openMaisSheet = async () => {
    await loadReady(brunoPage, "/escotista", BRUNO_EMAIL, () =>
      brunoPage.getByTestId("escotista-bottom-nav"),
    );
    await brunoPage.getByRole("button", { name: "Mais" }).click();
  };

  try {
    await gotoAdmin(adminPage);
    await expect(memberRow(adminPage, BRUNO)).toBeVisible({ timeout: LOAD });

    // Promote (idempotent: skip if a previous run left him admin).
    if (
      (await memberRow(adminPage, BRUNO)
        .getByRole("button", { name: "Tornar admin" })
        .count()) > 0
    ) {
      await confirmRowAction(adminPage, BRUNO, "Tornar admin", "Confirmar");
    }
    await expect(
      memberRow(adminPage, BRUNO).getByRole("button", { name: "Remover admin" }),
    ).toBeVisible({ timeout: LOAD });

    // Verify from Bruno's context: Admin appears in the "Mais" sheet and the
    // admin page renders (not the "Acesso restrito" notice).
    await openMaisSheet();
    await expect(
      brunoPage.getByRole("link", { name: "Admin" }),
    ).toBeVisible({ timeout: LOAD });
    await brunoPage.goto("/escotista/admin");
    await expect(
      brunoPage.getByRole("heading", { name: "Solicitações pendentes" }),
    ).toBeVisible({ timeout: LOAD });

    // Demote and confirm the surface is gone.
    await confirmRowAction(adminPage, BRUNO, "Remover admin", "Confirmar");
    await expect(
      memberRow(adminPage, BRUNO).getByRole("button", { name: "Tornar admin" }),
    ).toBeVisible({ timeout: LOAD });

    await brunoPage.goto("/escotista/admin");
    await expect(
      brunoPage.getByRole("heading", { name: "Acesso restrito" }),
    ).toBeVisible({ timeout: LOAD });
    await openMaisSheet();
    await expect(brunoPage.getByRole("link", { name: "Admin" })).toHaveCount(0);
  } finally {
    // Safety net: ensure Bruno ends non-admin.
    try {
      await gotoAdmin(adminPage);
      const demote = memberRow(adminPage, BRUNO).getByRole("button", {
        name: "Remover admin",
      });
      if ((await demote.count()) > 0) {
        await confirmRowAction(adminPage, BRUNO, "Remover admin", "Confirmar");
      }
    } catch {
      // ignore — context tearing down
    }
    await adminCtx.close();
    await brunoCtx.close();
  }
});

// ── M12b — change role ───────────────────────────────────────────────────────
test("M12b: flipping Zeca to escotista swaps his shell; revert restores it", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const adminCtx = await browser.newContext({ storageState: ADMIN_STATE });
  const zecaCtx = await browser.newContext({ storageState: ZECA_STATE });
  const adminPage = await adminCtx.newPage();
  const zecaPage = await zecaCtx.newPage();

  // Escoteiro-only nav link vs escotista-only shell testid: orthogonal,
  // role-exclusive surface signals (each retries through a reseed/dead session).
  const expectEscoteiroShell = () =>
    loadReady(zecaPage, "/", ZECA_EMAIL, () =>
      zecaPage.getByRole("link", { name: "Plano" }),
    );
  const expectEscotistaShell = () =>
    loadReady(zecaPage, "/escotista", ZECA_EMAIL, () =>
      zecaPage.getByTestId("escotista-bottom-nav"),
    );

  try {
    await gotoAdmin(adminPage);
    await expect(memberRow(adminPage, ZECA)).toBeVisible({ timeout: LOAD });

    // Normalize: ensure Zeca starts as an escoteiro (a prior failed run may have
    // left him flipped), so the "before" surface is deterministic.
    if (await rowIsEscotista(adminPage, ZECA)) {
      await confirmRowAction(adminPage, ZECA, "Trocar papel", "Confirmar");
      await expect(memberRow(adminPage, ZECA)).toContainText("Escoteiro", {
        timeout: LOAD,
      });
    }

    // Before: his context is the escoteiro shell (Plano nav link present).
    await expectEscoteiroShell();

    // Flip to escotista.
    await confirmRowAction(adminPage, ZECA, "Trocar papel", "Confirmar");
    await expect(memberRow(adminPage, ZECA)).toContainText("Escotista", {
      timeout: LOAD,
    });

    // His context now renders the escotista shell (bottom nav + Pendentes tab).
    await expectEscotistaShell();
    await expect(
      zecaPage.getByRole("link", { name: "Pendentes" }),
    ).toBeVisible();

    // Flip back to escoteiro → the escoteiro shell returns.
    await confirmRowAction(adminPage, ZECA, "Trocar papel", "Confirmar");
    await expect(memberRow(adminPage, ZECA)).toContainText("Escoteiro", {
      timeout: LOAD,
    });
    await expectEscoteiroShell();
  } finally {
    // Safety net: ensure Zeca ends as an escoteiro.
    try {
      await gotoAdmin(adminPage);
      if (await rowIsEscotista(adminPage, ZECA)) {
        await confirmRowAction(adminPage, ZECA, "Trocar papel", "Confirmar");
      }
    } catch {
      // ignore
    }
    await adminCtx.close();
    await zecaCtx.close();
  }
});

// ── M12c — ban ───────────────────────────────────────────────────────────────
test("M12c: banning Eloá removes her, logs a memberBan event, and locks her out", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const adminCtx = await browser.newContext({ storageState: ADMIN_STATE });
  const eloaCtx = await browser.newContext({ storageState: ELOA_STATE });
  const adminPage = await adminCtx.newPage();
  const eloaPage = await eloaCtx.newPage();

  try {
    await gotoAdmin(adminPage);

    // Ban (idempotent: a prior run under E2E_SKIP_SEED may have already banned
    // her, in which case her row is simply gone).
    const eloaRow = memberRow(adminPage, ELOA);
    if ((await eloaRow.count()) > 0) {
      await confirmRowAction(adminPage, ELOA, "Banir do grupo", "Banir");
      await expect(eloaRow).toHaveCount(0, { timeout: LOAD });
    }

    // End-state: no longer a member.
    await expect(memberRow(adminPage, ELOA)).toHaveCount(0);

    // A memberBan event for her sits on the timeline (her line only).
    await expectTimelineEvent(adminPage, ELOA, "Foi removido do grupo");

    // Her own context is locked out: viewer() returns null for a banned user
    // (equivalently, a dead session redirects to /signin) — either way the
    // escoteiro dashboard never hydrates.
    await eloaPage.goto("/");
    // Give the shell a beat to attempt hydration; a banned viewer stays on the
    // skeleton (no dashboard) and a dead session sits on /signin — both blocked.
    await eloaPage.waitForTimeout(3_000);
    await expect(eloaPage.getByText("ETAPA ATUAL")).toHaveCount(0);
    await expect(eloaPage.getByRole("link", { name: "Plano" })).toHaveCount(0);
    await expect(eloaPage.getByTestId("escotista-bottom-nav")).toHaveCount(0);
  } finally {
    // No unban affordance exists (ban is one-way in the UI). Eloá is left
    // banned; the global teardown reseed restores her for the next full run.
    await adminCtx.close();
    await eloaCtx.close();
  }
});

// ── M12d — edit ramos ────────────────────────────────────────────────────────
test("M12d: adding lobinho to Hugo expands his painel visibility; revert restores it", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const adminCtx = await browser.newContext({ storageState: ADMIN_STATE });
  const hugoCtx = await browser.newContext({ storageState: HUGO_STATE });
  const adminPage = await adminCtx.newPage();
  const hugoPage = await hugoCtx.newPage();

  const OTTO = "Otto Vilela"; // lobinho scout (read-only reference persona)
  const CLARA = "Clara Estevão"; // pioneiro scout (read-only reference persona)

  const hasLobinho = async () =>
    (await memberRow(adminPage, HUGO).getByText("Lobinho").count()) > 0;

  const addLobinho = async () => {
    const row = memberRow(adminPage, HUGO);
    await row.getByRole("button", { name: "Editar ramos atribuídos" }).click();
    await row.getByRole("button", { name: "Lobinho" }).click();
    await row.getByRole("button", { name: /^Salvar ramos/ }).click();
    await expect(memberRow(adminPage, HUGO)).toContainText("Lobinho", {
      timeout: LOAD,
    });
  };

  const removeLobinho = async () => {
    const row = memberRow(adminPage, HUGO);
    await row.getByRole("button", { name: "Editar ramos atribuídos" }).click();
    await row.getByRole("button", { name: "Lobinho" }).click(); // deselect
    await row.getByRole("button", { name: /^Salvar ramos/ }).click();
  };

  const loadHugoPainel = async () => {
    await loadReady(hugoPage, "/escotista", HUGO_EMAIL, () =>
      hugoPage.getByText(CLARA),
    );
  };

  try {
    await gotoAdmin(adminPage);
    await expect(memberRow(adminPage, HUGO)).toBeVisible({ timeout: LOAD });

    // Baseline: as a pioneiro-only escotista, Hugo sees the pioneiro scout but
    // NOT the lobinho one.
    await loadHugoPainel();
    await expect(hugoPage.getByText(OTTO)).toHaveCount(0);

    // Add lobinho (idempotent: skip if already present from a prior run).
    if (!(await hasLobinho())) {
      await addLobinho();
    }

    // His painel now surfaces the lobinho scout alongside the pioneiro one.
    await hugoPage.reload();
    await expect(hugoPage.getByText(OTTO)).toBeVisible({ timeout: LOAD });
    await expect(hugoPage.getByText(CLARA)).toBeVisible();

    // Revert to [pioneiro] and confirm the lobinho scout disappears again.
    await removeLobinho();
    await expect(memberRow(adminPage, HUGO)).not.toContainText("Lobinho", {
      timeout: LOAD,
    });
    await hugoPage.reload();
    await expect(hugoPage.getByText(CLARA)).toBeVisible({ timeout: LOAD });
    await expect(hugoPage.getByText(OTTO)).toHaveCount(0);
  } finally {
    // Safety net: ensure Hugo ends with lobinho removed.
    try {
      await gotoAdmin(adminPage);
      if (await hasLobinho()) {
        await removeLobinho();
      }
    } catch {
      // ignore
    }
    await adminCtx.close();
    await hugoCtx.close();
  }
});
