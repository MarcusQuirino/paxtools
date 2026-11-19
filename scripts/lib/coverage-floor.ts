/**
 * Coverage floor for convex/ — pure logic over bun's lcov output. The CLI is
 * scripts/check-coverage.ts (`bun run test:coverage`).
 *
 * Ratchet: FLOOR sits just under the measured number. When coverage goes up,
 * raise FLOOR in the same PR (never lower it to get green — add tests).
 */

export const FLOOR = {
  /** Measured 96.24% on 2026-11-19. */
  lines: 96.0,
  /** Measured 97.38% on 2026-11-19. */
  functions: 97.0,
};

/**
 * bun only reports files a test actually imported, so a brand-new untested
 * module would be invisible to the percentages. Every convex/ source file
 * must therefore be loaded by some test — except these, which have no
 * unit-testable logic today. Shrink this list; don't grow it without a
 * reason in the PR.
 */
export const NOT_UNIT_TESTED = new Set([
  "convex/ai.ts", // Anthropic action; covered by the m16-ai-smoke e2e spec
  "convex/auth.config.ts", // provider config
  "convex/convex.config.ts", // component registration
  "convex/http.ts", // HTTP router wiring for auth
  "convex/migrations.ts", // REGISTRY guarded by check:migrations; helpers in convex/lib are tested
]);

export type FileCoverage = {
  path: string;
  linesFound: number;
  linesHit: number;
  fnFound: number;
  fnHit: number;
};

export function parseLcov(lcov: string): FileCoverage[] {
  const out: FileCoverage[] = [];
  let cur: FileCoverage | null = null;
  for (const raw of lcov.split(/\r?\n/)) {
    const line = raw.trim();
    const [key, value = ""] = line.split(/:(.*)/s);
    if (key === "SF") {
      cur = { path: value, linesFound: 0, linesHit: 0, fnFound: 0, fnHit: 0 };
    } else if (cur && key === "LF") cur.linesFound = Number(value);
    else if (cur && key === "LH") cur.linesHit = Number(value);
    else if (cur && key === "FNF") cur.fnFound = Number(value);
    else if (cur && key === "FNH") cur.fnHit = Number(value);
    else if (cur && line === "end_of_record") {
      out.push(cur);
      cur = null;
    }
  }
  return out;
}

/** convex/ source files that count toward the floor. */
export function isConvexSource(path: string): boolean {
  return (
    path.startsWith("convex/") &&
    /\.(ts|tsx|js)$/.test(path) &&
    !path.startsWith("convex/_generated/") &&
    !/\.test\.tsx?$/.test(path) &&
    !path.endsWith(".testkit.ts") &&
    !path.endsWith(".d.ts")
  );
}

export type CoverageReport = {
  lines: number;
  functions: number;
  linesHit: number;
  linesFound: number;
  fnHit: number;
  fnFound: number;
  /** convex/ sources no test loaded and not in NOT_UNIT_TESTED. */
  unloaded: string[];
  /** NOT_UNIT_TESTED entries that ARE now loaded — remove them. */
  staleExemptions: string[];
};

export function summarize(
  files: FileCoverage[],
  allSources: string[],
): CoverageReport {
  const convex = files.filter((f) => isConvexSource(f.path));
  const sum = (k: keyof Omit<FileCoverage, "path">) =>
    convex.reduce((n, f) => n + f[k], 0);
  const linesFound = sum("linesFound");
  const linesHit = sum("linesHit");
  const fnFound = sum("fnFound");
  const fnHit = sum("fnHit");
  const loaded = new Set(convex.map((f) => f.path));
  const sources = allSources.filter(isConvexSource);
  return {
    lines: linesFound === 0 ? 0 : (100 * linesHit) / linesFound,
    functions: fnFound === 0 ? 0 : (100 * fnHit) / fnFound,
    linesHit,
    linesFound,
    fnHit,
    fnFound,
    unloaded: sources.filter((p) => !loaded.has(p) && !NOT_UNIT_TESTED.has(p)),
    staleExemptions: [...NOT_UNIT_TESTED].filter((p) => loaded.has(p)),
  };
}

export function checkFloor(
  r: CoverageReport,
  floor: { lines: number; functions: number } = FLOOR,
): string[] {
  const errors: string[] = [];
  if (r.lines < floor.lines) {
    errors.push(
      `convex/ line coverage ${r.lines.toFixed(2)}% is below the floor ${floor.lines}%`,
    );
  }
  if (r.functions < floor.functions) {
    errors.push(
      `convex/ function coverage ${r.functions.toFixed(2)}% is below the floor ${floor.functions}%`,
    );
  }
  for (const p of r.unloaded) {
    errors.push(`${p} is not loaded by any test (0% coverage, invisible to the floor)`);
  }
  for (const p of r.staleExemptions) {
    errors.push(
      `${p} is now covered by tests — remove it from NOT_UNIT_TESTED in scripts/lib/coverage-floor.ts`,
    );
  }
  return errors;
}

export const COVERAGE_FIX_HINT = `How to fix:
  - Add bun tests for the convex/ code you added or changed (convex-test
    pattern: see any convex/*.test.ts and convex/fixtures.testkit.ts).
  - Per-file numbers: bun run test:coverage prints the table; lcov lands in
    coverage/lcov.info.
  - A new convex/ module no test imports must get a test. Only pure wiring
    (config, router) may go in NOT_UNIT_TESTED, with a reason.
  - Never lower FLOOR to get green. When coverage rises, raise FLOOR in
    scripts/lib/coverage-floor.ts to just under the new number.
See docs/agents/ci-checks.md.`;
