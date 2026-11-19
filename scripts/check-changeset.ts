#!/usr/bin/env bun
/**
 * CI: PRs that change shipped code must add a changeset. Rules and opt-out:
 * scripts/lib/changeset-rules.ts.
 *
 *   bun run check:changeset            # vs origin/master
 *   BASE_REF=origin/foo bun run check:changeset
 */

import { readFileSync } from "node:fs";
import {
  CHANGESET_FIX_HINT,
  evaluateChangeset,
  type ChangedFile,
} from "./lib/changeset-rules";
import { git, resolveMergeBase } from "./lib/git";

const mergeBase = resolveMergeBase();
const files: ChangedFile[] = git([
  "diff",
  "--name-status",
  "--no-renames",
  mergeBase,
  "HEAD",
])
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, path] = line.split("\t");
    const s = status === "A" || status === "D" ? status : "M";
    return { status: s, path: path! };
  });

const verdict = evaluateChangeset(files, (p) => readFileSync(p, "utf8"));
if (!verdict.ok) {
  console.error("::error::Changeset check failed.");
  for (const e of verdict.errors) console.error(`  ✗ ${e}`);
  console.error(`\n${CHANGESET_FIX_HINT}`);
  process.exit(1);
}
console.log(`✓ Changeset check: ${verdict.reason}`);
