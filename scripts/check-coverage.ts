#!/usr/bin/env bun
/**
 * CI: run the bun test suite with coverage and enforce the convex/ floor
 * (scripts/lib/coverage-floor.ts).
 *
 *   bun run test:coverage
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  COVERAGE_FIX_HINT,
  FLOOR,
  checkFloor,
  parseLcov,
  summarize,
} from "./lib/coverage-floor";
import { git } from "./lib/git";

// Same test roots as `bun run test`.
const test = spawnSync(
  "bun",
  [
    "test",
    "src",
    "convex",
    "scripts",
    "--coverage",
    "--coverage-reporter=text",
    "--coverage-reporter=lcov",
    "--coverage-dir=coverage",
  ],
  { stdio: "inherit" },
);
if (test.status !== 0) {
  console.error("::error::Tests failed (see output above); coverage not checked.");
  process.exit(test.status ?? 1);
}

const files = parseLcov(readFileSync("coverage/lcov.info", "utf8"));
const sources = git(["ls-files", "convex"]).split("\n").filter(Boolean);
const report = summarize(files, sources);
const errors = checkFloor(report);

const summary =
  `convex/ coverage: lines ${report.lines.toFixed(2)}% (${report.linesHit}/${report.linesFound}, floor ${FLOOR.lines}%), ` +
  `functions ${report.functions.toFixed(2)}% (${report.fnHit}/${report.fnFound}, floor ${FLOOR.functions}%)`;

if (errors.length > 0) {
  console.error(`\n::error::Coverage floor for convex/ failed. ${summary}`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n${COVERAGE_FIX_HINT}`);
  process.exit(1);
}
console.log(`\n✓ ${summary}`);
const headroom = Math.min(
  report.lines - FLOOR.lines,
  report.functions - FLOOR.functions,
);
if (headroom > 1) {
  console.log(
    "  Coverage is >1 point above the floor — raise FLOOR in scripts/lib/coverage-floor.ts.",
  );
}
