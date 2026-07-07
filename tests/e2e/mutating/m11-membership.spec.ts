/**
 * M11 · Membership approve / reject (PRD #58, story 43).
 *
 * The admin drives `/escotista/admin`:
 *   - approve Ivan Queiroga (sim-pending-senior-1): his card leaves the pending
 *     section, he shows up in the Membros list, and a memberJoin ("Entrou no
 *     grupo") event for him lands on the timeline.
 *   - reject Manu Setúbal (sim-pending-escoteiro-1): her card leaves the pending
 *     section and she NEVER appears in the Membros list.
 *
 * OWNERSHIP: this spec mutates only Ivan and Manu (both owned here per the
 * manifest). It asserts on THEIR cards/rows only — never on the pending-queue
 * length or member counts, which sibling mutating specs change concurrently.
 *
 * RESILIENCE: the suite shares one dev server + one Convex deployment across
 * parallel workers/agents. A reseed elsewhere invalidates captured sessions, so
 * `ensureSignedIn` re-authenticates the admin in-context via the hidden test
 * signin form (never a testing:* function; the shared admin.json is left
 * untouched). Neither approve nor reject is reversible in the UI and
 * E2E_SKIP_SEED shares state across runs, so both tests are idempotent: if the
 * target is no longer pending, the mutation is skipped and the same end-state is
 * asserted. The global teardown reseed restores the pending queue.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";

const test = testAs("admin--m11");

const IVAN = "Ivan Queiroga";
const MANU = "Manu Setúbal";
const ADMIN_EMAIL = "admin@test.paxtools.local";
const PASSWORD = "paxtools-test-only";
// First paints can be slow under cross-worker/agent contention.
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
  ready: () => ReturnType<Page["getByRole"]>,
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

function pendingSection(page: Page) {
  return page.locator("section", {
    has: page.getByRole("heading", { name: "Solicitações pendentes" }),
  });
}

function membersSection(page: Page) {
  return page.locator("section", {
    has: page.getByRole("heading", { name: "Membros" }),
  });
}

/** Open the admin page (re-authing if needed) and wait for both lists. */
async function gotoAdmin(page: Page) {
  await loadReady(page, "/escotista/admin", ADMIN_EMAIL, () =>
    page.getByRole("heading", { name: "Membros" }),
  );
  await expect(
    page.getByRole("heading", { name: "Solicitações pendentes" }),
  ).toBeVisible({ timeout: LOAD });
}

/** Assert a timeline row exists for `subject` with `summary` (his line only). */
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
  // The event we just created is among the newest → first page. Chase a few
  // extra pages only if a burst of sibling events pushed it down.
  for (let i = 0; i < 5 && (await row.count()) === 0; i++) {
    const more = page.getByRole("button", { name: "Carregar mais" });
    if ((await more.count()) === 0) break;
    await more.click();
    await page.waitForTimeout(300);
  }
  await expect(row.first()).toBeVisible();
}

test("approve Ivan → leaves pending, joins members, timeline records the join", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await gotoAdmin(page);
  const pending = pendingSection(page);
  const ivanCard = pending.locator("li", { hasText: IVAN });

  if ((await ivanCard.count()) > 0) {
    // Pending card buttons are icon-only (no accessible name): approve is the
    // first (emerald check), reject the second (destructive X).
    await ivanCard.getByRole("button").first().click();
    await expect(ivanCard).toHaveCount(0, { timeout: LOAD });
  }

  // End-state: Ivan is an approved member. Reload for a fresh members query
  // rather than depend on the reactive push landing under load.
  await page.reload();
  await expect(
    membersSection(page).locator("li", { hasText: IVAN }),
  ).toBeVisible({ timeout: LOAD });

  // ...and the join was recorded on the timeline (his line only).
  await expectTimelineEvent(page, IVAN, "Entrou no grupo");
});

test("reject Manu → leaves pending and never appears in members", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await gotoAdmin(page);
  const pending = pendingSection(page);
  const manuCard = pending.locator("li", { hasText: MANU });

  if ((await manuCard.count()) > 0) {
    // Reject is the second (destructive X) button on the pending card.
    await manuCard.getByRole("button").nth(1).click();
    await expect(manuCard).toHaveCount(0, { timeout: LOAD });
  }

  // End-state: rejection clears her group membership → not pending, not a member.
  await page.reload();
  await expect(pendingSection(page)).toBeVisible({ timeout: LOAD });
  await expect(pending.locator("li", { hasText: MANU })).toHaveCount(0);
  await expect(
    membersSection(page).getByText(MANU, { exact: true }),
  ).toHaveCount(0);
});
