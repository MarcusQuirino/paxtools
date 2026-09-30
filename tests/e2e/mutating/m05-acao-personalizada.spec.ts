/**
 * M5 (story 28) — Ação personalizada full lifecycle on the bloco screen.
 *
 * Carla Reis (`sim-troop-escoteiro-3`) has NO seeded custom action. As an
 * escoteiro acting on herself she can add a free-text "ação personalizada"
 * to a bloco (bloco screen /bloco/<id> → dashed "Ação personalizada" button →
 * bottom sheet input + "Adicionar"; the row lands in the Variáveis list with
 * check id `custom-<customActionId>`), mark it complete (which — because she
 * is self-marking — creates a PENDING conclusão, NOT an approved one, so it is
 * never locked and stays uncheckable-back), unmark it, and finally delete it.
 *
 * The spec is self-cleaning and retry-safe: it uses a unique marker text, wipes
 * any leftover row from a crashed prior run at the start, and ends by deleting
 * the row it created (the lifecycle covers the delete naturally). Back-to-back
 * reruns pass.
 *
 * PERSISTENCE without page.reload(): the test-auth refresh token is single-use
 * and rotates on every full page load, so a second full load in a run (or a
 * rerun) logs the session out. Instead we prove persistence with a client-side
 * round-trip (Plano → Progressão → bloco row) that UNMOUNTS and re-mounts the
 * bloco screen, which re-reads `api.progression.getMyCompletions` from the live
 * Convex subscription — i.e. committed server state, not local component state.
 *
 * Server contract (convex/progression.ts): addCustomAction inserts
 * `{completed:false}`; toggleCustomAction on a self-marking escoteiro flips
 * completed→true with status "pending" (no approval lock while pending), then
 * back to false; deleteCustomAction removes an incomplete row.
 *
 * OWNERSHIP: mutates only Carla Reis. Asserts only on her own row.
 */

import { testAs, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";
import { openBloco } from "../shared/bloco-nav";

const test = testAs("sim-troop-escoteiro-3");

const BLOCO_ID = "aprendizagem-continua";
// Unique marker so leftover-cleanup and assertions never collide with seed
// data or a sibling agent's rows.
const MARKER = "E2E-M5 ação personalizada autolimpável";

/** Client-side round-trip that re-mounts the bloco screen from server state
 *  (see the file header — no full reload). Ends back on the bloco screen. */
async function remountBloco(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Plano" }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 10_000 });
  await page.getByRole("link", { name: "Progressão", exact: true }).click();
  await expect(page).not.toHaveURL(/\/plan/, { timeout: 10_000 });
  await openBloco(page, BLOCO_ID);
}

/** The custom-action row (present only once created), scoped by marker text. */
function customRow(page: Page) {
  return page.locator('[data-action-row^="custom-"]').filter({ hasText: MARKER });
}

/** Delete every leftover row bearing our marker (retry-safety at start). */
async function deleteLeftovers(page: Page): Promise<void> {
  const row = customRow(page);
  for (let i = 0; i < 5; i++) {
    const remaining = await row.count();
    if (remaining === 0) return;
    await row.first().getByRole("button", { name: "Remover" }).click();
    await expect(row).toHaveCount(remaining - 1, { timeout: 5_000 });
  }
  await expect(row).toHaveCount(0);
}

test("escoteiro adds, completes (pending), unmarks and deletes an ação personalizada", async ({
  page,
}) => {
  await page.goto("/");
  await openBloco(page, BLOCO_ID);

  // ── Retry-safety: clear any leftover from a crashed prior run ─────────────
  await deleteLeftovers(page);

  // ── Add (dashed button → bottom sheet → "Adicionar") ──────────────────────
  await page.getByTestId("add-custom-action").click();
  const input = page.getByTestId("custom-action-text");
  await expect(input).toBeVisible();
  await input.fill(MARKER);
  await page.getByTestId("custom-action-submit").click();
  await expect(input).toHaveCount(0); // sheet closes on submit

  const row = customRow(page);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(MARKER);

  // Creation persists — a client re-mount re-reads it from the server.
  await remountBloco(page);
  await expect(customRow(page)).toHaveCount(1);

  // ── Mark complete → PENDING (self-marked, so NOT locked) ──────────────────
  const checkbox = customRow(page).getByRole("checkbox");
  await expect(checkbox).toHaveAttribute("data-state", "open");
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "pending");
  // A pending self-mark stays enabled (an approved one would be disabled).
  await expect(checkbox).toBeEnabled();

  // Pending state persists across a re-mount.
  await remountBloco(page);
  const checkboxAfter = customRow(page).getByRole("checkbox");
  await expect(checkboxAfter).toHaveAttribute("data-state", "pending");
  await expect(checkboxAfter).toBeEnabled();

  // ── Unmark → back to incomplete ───────────────────────────────────────────
  await checkboxAfter.click();
  await expect(customRow(page).getByRole("checkbox")).toHaveAttribute(
    "data-state",
    "open",
  );

  // ── Delete → gone (self-cleaning end of the lifecycle) ────────────────────
  await customRow(page).getByRole("button", { name: "Remover" }).click();
  await expect(customRow(page)).toHaveCount(0);

  // Deletion persists across a re-mount.
  await remountBloco(page);
  await expect(customRow(page)).toHaveCount(0);
});
