/**
 * P0 — Non-admin escotista ramo-scoped visibility.
 *
 * `escotista` fixture has `escotistaRamos: ["escoteiro", "senior"]` and is NOT
 * admin. The seed group `__TEST__ Grupo QA` contains an `escoteiro-lobinho`
 * test user whose ramo is `lobinho`. That user MUST NOT surface in the
 * non-admin escotista's dashboard list (covers the `getGroupStats` filter).
 *
 * Three Convex queries each filter independently by `escotistaRamos`:
 *   - `getGroupStats` (dashboard tile / escoteiro list)
 *   - `getPendingForGroup` (pending tab)
 *   - `getGroupMembers` (admin page, but that page is gated for non-admins)
 *
 * This spec covers the most user-visible site: the dashboard list.
 */

import { escotistaTest as test, expect } from "../../fixtures/auth";

const LOBINHO_DISPLAY_NAME = "lobinho";
const ESCOTEIRO_DISPLAY_NAME = "progression";

test("non-admin escotista does NOT see lobinho-ramo escoteiros on dashboard", async ({
  page,
}) => {
  await page.goto("/escotista");

  // Wait for the dashboard to settle: the in-ramo escoteiro should render.
  // `escoteiro-with-progression` has display name "progression" per seed.
  await expect(
    page.getByText(ESCOTEIRO_DISPLAY_NAME, { exact: false }).first(),
  ).toBeVisible({ timeout: 10_000 });

  // The lobinho escoteiro must NOT appear anywhere.
  await expect(
    page.getByText(LOBINHO_DISPLAY_NAME, { exact: false }),
  ).toHaveCount(0);
});
