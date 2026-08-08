/**
 * R7 — Grupo identity: numeral + região escoteira (#71).
 *
 * A grupo is identified by its numeral and its região, written "99999/RS" for
 * the seeded test group (`TEST_GROUP_NUMBER`/`TEST_GROUP_REGIAO` in
 * convex/testing.ts). This spec pins that it actually reaches the two surfaces
 * that name the group: the escotista painel header and /settings.
 *
 * OWNERSHIP: reads the identity only — never the group NAME, which m17
 * transiently renames and solely owns (tests/utils/personas.ts). Number and
 * região are not mutated by any spec, so this is safe in the readonly phase.
 *
 * Regression guard: #71 first rendered the name as a bare text node beside the
 * identity span, so the two merged into "__TEST__ Grupo QA99999/RS" — visually
 * spaced by `ml-1` but a single run of text to a screen reader and to any text
 * query. The `exact: true` assertions below are what fails if that returns.
 */

import { adminTest, approvedTest, expect } from "../../fixtures/auth";

/** Mirrors TEST_GROUP_NUMBER / TEST_GROUP_REGIAO in convex/testing.ts. */
const GROUP_IDENTITY = "99999/RS";

adminTest("escotista painel header identifies the grupo as numeral/UF", async ({
  page,
}) => {
  await page.goto("/escotista");
  await expect(page.getByPlaceholder("Buscar escoteiro...")).toBeVisible();

  await expect(
    page.getByText(GROUP_IDENTITY, { exact: true }).first(),
  ).toBeVisible();

  // An accessible name concatenates descendant text ACROSS element boundaries,
  // so splitting name and identity into two spans is not enough on its own —
  // the heading announced as "<name>99999/RS" until the identity gained a
  // leading space. The \s is the whole point of this assertion. Matched by
  // regex rather than a literal because m17 owns (and transiently renames) the
  // group name, so this spec must not depend on it.
  await expect(
    page.getByRole("heading", { name: /\s99999\/RS$/ }),
  ).toBeVisible();
});

approvedTest("settings identifies the grupo as numeral/UF for a member", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Grupo" })).toBeVisible();

  // exact:true is the point: it only passes while the identity is its own text
  // node, not concatenated onto the group name.
  await expect(
    page.getByText(GROUP_IDENTITY, { exact: true }).first(),
  ).toBeVisible();
});
