#!/usr/bin/env bun
/**
 * CI: fail if convex/migrations.ts REGISTRY was edited other than by
 * appending. Compares HEAD against the merge base with the base branch.
 *
 *   bun run check:migrations            # vs origin/master
 *   BASE_REF=origin/foo bun run check:migrations
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import {
  MIGRATIONS_FILE,
  REGISTRY_FIX_HINT,
  checkRegistry,
} from "./lib/migration-registry";
import { git, resolveMergeBase } from "./lib/git";

const mergeBase = resolveMergeBase();
const show = spawnSync("git", ["show", `${mergeBase}:${MIGRATIONS_FILE}`], {
  encoding: "utf8",
});
const baseSrc = show.status === 0 ? show.stdout : null;
const headSrc = existsSync(MIGRATIONS_FILE)
  ? readFileSync(MIGRATIONS_FILE, "utf8")
  : null;

let errors: string[];
try {
  errors = checkRegistry(baseSrc, headSrc);
} catch (e) {
  errors = [`could not parse ${MIGRATIONS_FILE}: ${(e as Error).message}`];
}

if (errors.length > 0) {
  console.error(
    `::error file=${MIGRATIONS_FILE}::Migration REGISTRY is append-only ` +
      `(compared against ${git(["rev-parse", "--short", mergeBase])}).`,
  );
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n${REGISTRY_FIX_HINT}`);
  process.exit(1);
}
console.log("✓ Migration REGISTRY is append-only vs the base branch.");
