/**
 * M21 · Seções: lifecycle, placement, and the observed-seção filter (#72, #73).
 *
 * The seed creates NO seções (convex/testing.ts), so the whole feature is
 * invisible in pristine data and only a mutating spec can reach it. This one
 * drives the full path end to end and puts everything back:
 *
 *   1. /settings → "Seções" (the section #72 renamed from "Unidades") lists
 *      nothing, then gains TWO seções of the SAME ramo — the case
 *      `groups.ramoNames` could not express and the reason #72 exists.
 *   2. A seção renames in place.
 *   3. /escotista/admin → João Mendes is placed in seção A.
 *   4. /escotista → the observed-seção picker filters the list of jovens:
 *      João shows under A and is GONE under B.
 *
 * Why B must hide him: `filterBySection` (convex/lib/sections.ts) keeps a scout
 * when `!e.sectionId || e.sectionId === sectionId`, so an UNPLACED scout shows
 * under every seção by design. Selecting a seção he isn't in is therefore the
 * only assertion that proves filtering rather than just rendering.
 *
 * OWNERSHIP (tests/utils/personas.ts): sole owner of the group's seções, of
 * `observedSectionId` on the shared admin row, and of João Mendes' `sectionId`.
 * Only the admin's own painel is asserted — never a group-wide count, never the
 * group name (m17 owns that).
 *
 * CLEANUP is mandatory and ordered: `groups.removeSection` REFUSES to delete a
 * seção that still has members, and a leaked `observedSectionId` would silently
 * filter the escotista painel for every later spec using the admin login. So:
 * unplace João → clear the picker → remove both seções, all in `finally`, then
 * verified.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Locator, Page } from "@playwright/test";

const test = testAs("admin--m21");

const SECTION_A = "__TEST__ Tropa M21 Alfa";
const SECTION_A_RENAMED = "__TEST__ Tropa M21 Alfa II";
const SECTION_B = "__TEST__ Tropa M21 Beta";

/** Escoteiro ramo — the admin's only ramo, so both seções must match it. */
const RAMO_LABEL = "Escoteiro";
const SCOUT = "João Mendes";

const ADMIN_EMAIL = "admin@test.paxtools.local";
const PW = process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only";

/** exact:true throughout — "Alfa" is a substring of "Alfa II", and getByLabel
 *  matches a case-insensitive substring by default. */
const sectionNameInput = (p: Page, name: string) =>
  p.getByLabel(`Nome da seção ${name}`, { exact: true });

/**
 * Navigate and wait for `ready`, recovering from the cold-auth /signin bounce.
 *
 * The suite shares one Convex deployment, and a reseed elsewhere (or another
 * context spending the single-use refresh token) can strand a captured session
 * on /signin. Every sibling spec that drives a shared login carries some form
 * of this — m12's ensureSignedIn, m17's gotoSettingsAwait, m18's gotoReady.
 * Re-authenticating in-context via the test-only form never touches the
 * captured auth file, so the ownership rules still hold.
 */
async function gotoReady(p: Page, url: string, ready: Locator): Promise<void> {
  const submit = p.getByTestId("test-signin-submit");
  for (let attempt = 0; attempt < 4; attempt++) {
    await p.goto(url);
    const outcome = await Promise.race([
      ready
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "ready" as const)
        .catch(() => "x" as const),
      submit
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "signin" as const)
        .catch(() => "x" as const),
    ]);
    if (outcome === "ready") return;
    if (outcome === "signin") {
      await p.getByTestId("test-signin-email").fill(ADMIN_EMAIL);
      await p.getByTestId("test-signin-password").fill(PW);
      await submit.click();
      await p
        .waitForURL((u) => !/\/signin/.test(u.pathname), { timeout: 20_000 })
        .catch(() => {});
    }
  }
  await ready.waitFor({ state: "visible", timeout: 12_000 });
}

async function gotoSettings(p: Page): Promise<void> {
  await gotoReady(p, "/settings", p.getByRole("heading", { name: "Seções" }));
}

async function addSection(p: Page, name: string): Promise<void> {
  await gotoSettings(p);
  // exact:true is required, not tidiness — getByLabel matches a case-insensitive
  // SUBSTRING, so a bare "Nova seção" also matches the "Ramo da nova seção"
  // select and resolves to two elements.
  await p.getByLabel("Nova seção", { exact: true }).fill(name);
  await p.getByLabel("Ramo da nova seção").selectOption({ label: RAMO_LABEL });
  await p.getByRole("button", { name: "Adicionar" }).click();
  await expect(sectionNameInput(p, name)).toBeVisible({ timeout: 15_000 });
}

/** Remove a seção if it is present; tolerates it never having been created. */
async function removeSection(p: Page, name: string): Promise<void> {
  await gotoSettings(p);
  const remove = p.getByLabel(`Remover ${name}`);
  if ((await remove.count()) === 0) return;
  await remove.click();
  await p
    .getByRole("button", { name: "Remover", exact: true })
    .last()
    .click();
  await expect(sectionNameInput(p, name)).toHaveCount(0, { timeout: 15_000 });
}

/** Open the admin row editor for a scout and place them in `sectionName`. */
async function placeScout(p: Page, sectionName: string | null): Promise<void> {
  await gotoReady(
    p,
    "/escotista/admin",
    p.getByRole("heading", { name: "Membros", exact: true }),
  );

  const row = p.getByRole("listitem").filter({ hasText: SCOUT });
  await expect(row).toBeVisible({ timeout: 15_000 });

  const select = row.getByLabel("Seção", { exact: true });
  if ((await select.count()) === 0) {
    await row
      .getByRole("button", { name: "Editar ramo e seção do escoteiro" })
      .click();
  }
  // The select writes through on change (groups.setMemberSection) — there is no
  // separate save button, so the reactive value coming back IS the confirmation.
  await select.selectOption(
    sectionName === null ? { label: "Sem seção" } : { label: sectionName },
  );
  await expect(select).toHaveValue(sectionName === null ? "" : /.+/, {
    timeout: 15_000,
  });
}

/** Select an observed seção on the painel; `null` = "Todas as seções". */
async function observe(p: Page, sectionName: string | null): Promise<void> {
  await gotoReady(p, "/escotista", p.getByPlaceholder("Buscar escoteiro..."));
  await p
    .getByLabel("Seção", { exact: true })
    .selectOption(
      sectionName === null
        ? { label: "Todas as seções" }
        : { label: sectionName },
    );
}

test("M21 seções: create two in one ramo, rename, place a scout, filter the painel", async ({
  page,
}) => {
  test.setTimeout(120_000);

  try {
    // ── 1. Two seções of the SAME ramo — impossible under the old ramoNames ──
    await addSection(page, SECTION_A);
    await addSection(page, SECTION_B);

    // Both survive a reload: they are rows on the server, not local state.
    await gotoSettings(page);
    await expect(sectionNameInput(page, SECTION_A)).toBeVisible();
    await expect(sectionNameInput(page, SECTION_B)).toBeVisible();

    // ── 2. Rename in place ───────────────────────────────────────────────────
    await sectionNameInput(page, SECTION_A).fill(SECTION_A_RENAMED);
    // Scoped to the seção's own row: /settings has other save buttons, and the
    // row's "Salvar" only mounts while that input is dirty.
    await page
      .getByRole("listitem")
      .filter({ has: sectionNameInput(page, SECTION_A) })
      .getByRole("button", { name: "Salvar", exact: true })
      .click();
    // Wait for the row's aria-label to flip BEFORE navigating. The reactive
    // query pushing the new name back down is the only signal the mutation
    // landed; reloading first races it and drops the rename.
    await expect(sectionNameInput(page, SECTION_A_RENAMED)).toBeVisible({
      timeout: 15_000,
    });
    // Then reload, to prove it persisted rather than just re-rendered.
    await gotoSettings(page);
    await expect(sectionNameInput(page, SECTION_A_RENAMED)).toBeVisible({
      timeout: 15_000,
    });

    // ── 3. Place the scout in A ──────────────────────────────────────────────
    await placeScout(page, SECTION_A_RENAMED);

    // ── 4. The painel filters by observed seção ──────────────────────────────
    await observe(page, SECTION_A_RENAMED);
    await expect(page.getByText(SCOUT).first()).toBeVisible({
      timeout: 15_000,
    });

    // The real assertion: he is placed in A, so B must not show him. An
    // unplaced scout would still appear here — that is why the placement above
    // has to happen first.
    await observe(page, SECTION_B);
    await expect(page.getByText(SCOUT)).toHaveCount(0, { timeout: 15_000 });

    // Back to "Todas as seções" and he returns.
    await observe(page, null);
    await expect(page.getByText(SCOUT).first()).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    // Order matters: removeSection throws while a member is still placed.
    await placeScout(page, null).catch(() => {});
    await observe(page, null).catch(() => {});
    await removeSection(page, SECTION_A_RENAMED).catch(() => {});
    await removeSection(page, SECTION_A).catch(() => {});
    await removeSection(page, SECTION_B).catch(() => {});

    // VERIFY the group is back to its seed state — no seção, so no later spec
    // sees a picker that pristine data says should not exist.
    await gotoSettings(page);
    await expect(page.getByLabel(/^Remover __TEST__ Tropa M21/)).toHaveCount(0);
  }
});
