/**
 * M5 (story 28) — Ação personalizada full lifecycle on the dashboard.
 *
 * Carla Reis (`sim-troop-escoteiro-3`) has NO seeded custom action. As an
 * escoteiro acting on herself she can add a free-text "ação personalizada"
 * inside a bloco's variable section, mark it complete (which — because she is
 * self-marking — creates a PENDING conclusão, NOT an approved one, so it is
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
 * round-trip (Plano → Tudo) that UNMOUNTS and re-mounts the dashboard, which
 * re-reads `api.progression.getMyCompletions` from the live Convex subscription
 * — i.e. committed server state, not local component state.
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

const test = testAs("sim-troop-escoteiro-3");

const BLOCO_TRIGGER = /Aprendizagem Contínua/i;
// Unique marker so leftover-cleanup and assertions never collide with seed
// data or a sibling agent's rows.
const MARKER = "E2E-M5 ação personalizada autolimpável";
const CUSTOM_INPUT_PLACEHOLDER = "Adicionar ação personalizada...";

/**
 * Converge a bloco accordion into the expanded state. Radix animations plus
 * Convex live re-renders keep the trigger "unstable" under load, so we
 * `force`-click and re-check `aria-expanded` rather than trusting one click.
 */
async function expandBloco(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: BLOCO_TRIGGER }).first();
  await expect(trigger).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if ((await trigger.getAttribute("aria-expanded")) === "true") return;
    await trigger.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

/** Client-side round-trip that re-mounts the dashboard from server state
 *  (see the file header — no full reload). Leaves the target bloco expanded. */
async function remountHome(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Plano" }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 10_000 });
  await page.getByRole("link", { name: "Tudo" }).click();
  await expect(page).not.toHaveURL(/\/plan/, { timeout: 10_000 });
  await expandBloco(page);
}

/** The custom-action row (present only once created), scoped by marker text. */
function customRow(page: Page) {
  return page.locator("div.group").filter({ hasText: MARKER });
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
  await expandBloco(page);

  // ── Retry-safety: clear any leftover from a crashed prior run ─────────────
  await deleteLeftovers(page);

  // ── Add ───────────────────────────────────────────────────────────────────
  const input = page.getByPlaceholder(CUSTOM_INPUT_PLACEHOLDER).first();
  await expect(input).toBeVisible();
  await input.fill(MARKER);
  await input.press("Enter");

  const row = customRow(page);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(MARKER);

  // Creation persists — a client re-mount re-reads it from the server.
  await remountHome(page);
  await expect(customRow(page)).toHaveCount(1);

  // ── Mark complete → PENDING (self-marked, so NOT locked) ──────────────────
  const checkbox = customRow(page).getByRole("checkbox");
  await expect(checkbox).toHaveAttribute("data-state", "unchecked");
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("data-state", "checked");
  // A pending self-mark stays enabled (an approved one would be disabled).
  await expect(checkbox).toBeEnabled();

  // Pending state persists across a re-mount.
  await remountHome(page);
  const checkboxAfter = customRow(page).getByRole("checkbox");
  await expect(checkboxAfter).toHaveAttribute("data-state", "checked");
  await expect(checkboxAfter).toBeEnabled();

  // ── Unmark → back to incomplete ───────────────────────────────────────────
  await checkboxAfter.click();
  await expect(customRow(page).getByRole("checkbox")).toHaveAttribute(
    "data-state",
    "unchecked",
  );

  // ── Delete → gone (self-cleaning end of the lifecycle) ────────────────────
  await customRow(page).getByRole("button", { name: "Remover" }).click();
  await expect(customRow(page)).toHaveCount(0);

  // Deletion persists across a re-mount.
  await remountHome(page);
  await expect(customRow(page)).toHaveCount(0);
});
