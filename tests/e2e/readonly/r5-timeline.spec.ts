/**
 * R5 · Histórico timeline — event scoping + pagination against the seeded
 * synthetic feed (PRD #58, story 39).
 *
 * Synthetic events per ramo (seedSimRamo tail): 2 memberJoin (group scope) +
 * up to 4 levelUp + 1 lisDeOuro per irr:"full" scout + up to 3 approval +
 * 1 rejection (all four latter types are ramo scope). Derived + verified via a
 * one-off query (2026-07-06):
 *   lobinho 11, escoteiro 11, senior 11, pioneiro 9  → 42 total
 *   by scope: group 8 (memberJoin), ramo 34
 * Events are created ramo-by-ramo (lobinho → escoteiro → senior → pioneiro), so
 * newest-first the lobinho events are OLDEST.
 *
 * Visibility (convex/events.ts listTimeline):
 *   - a plain escotista sees only scope:"ramo" events for their own ramos;
 *   - an admin sees every event in the group.
 *
 * Read-only: "Carregar mais" is client-side pagination (no mutation).
 */
import { adminTest, approvedTest, testAs, expect } from "../../fixtures/auth";

const marinaTest = testAs("sim-escotista-lobinho-1"); // Marina Solano — lobinho only

marinaTest(
  "timeline is scoped to the escotista's own ramo (lobinho only)",
  async ({ page }) => {
    await page.goto("/escotista/timeline");
    await expect(page).toHaveURL(/\/escotista\/timeline/);

    // Marina's 9 lobinho ramo events sit on the OLDEST page; the route auto-
    // advances past the empty newer-ramo pages, so wait for the feed to settle
    // on the known lobinho conquest line (Otto Vilela — Cruzeiro do Sul).
    await expect(page.getByTestId("timeline-feed")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Conquistou a Cruzeiro do Sul"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Otto Vilela")).toBeVisible();

    // An escoteiro-ramo conquest (Otávio Freitas — Lis de Ouro) must NOT leak
    // into a lobinho escotista's feed.
    await expect(page.getByText("Conquistou a Lis de Ouro")).toHaveCount(0);
    // 9 ramo-scoped lobinho events (< 25) → no pagination control.
    await expect(page.getByRole("button", { name: "Carregar mais" })).toHaveCount(
      0,
    );
  },
);

adminTest(
  "admin sees every ramo's events and can paginate to older ones",
  async ({ page }) => {
    await page.goto("/escotista/timeline");
    await expect(page.getByTestId("timeline-feed")).toBeVisible({
      timeout: 15_000,
    });

    // 42 events > initialNumItems (25) → a "Carregar mais" control is present.
    const loadMore = page.getByRole("button", { name: "Carregar mais" });
    await expect(loadMore).toBeVisible();

    // First page (25 newest) reaches the escoteiro block, so Otávio's Lis de
    // Ouro (created 25th-from-newest) shows immediately; Otto's lobinho Cruzeiro
    // do Sul (7th-oldest) does NOT — it lives on a later page.
    await expect(page.getByText("Conquistou a Lis de Ouro")).toBeVisible();
    await expect(
      page.getByText("Conquistou a Cruzeiro do Sul"),
    ).toHaveCount(0);

    const feed = page.getByTestId("timeline-feed");
    const before = await feed.locator(":scope > div").count();

    // Loading more reveals older rows, including the lobinho conquest.
    await loadMore.click();
    await expect(
      page.getByText("Conquistou a Cruzeiro do Sul"),
    ).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => feed.locator(":scope > div").count())
      .toBeGreaterThan(before);
  },
);

approvedTest("escoteiro is redirected away from the timeline", async ({
  page,
}) => {
  await page.goto("/escotista/timeline");
  // useAuthGate("escotista") bounces a non-escotista off the route.
  await expect(page).not.toHaveURL(/\/escotista\/timeline/, { timeout: 10_000 });
});
