import { describe, expect, test } from "bun:test";
import {
  evaluateChangeset,
  isShipped,
  validateChangeset,
  type ChangedFile,
} from "./changeset-rules";

const GOOD = '---\n"paxtools": patch\n---\n\nFix the thing.\n';
const EMPTY = "---\n---\n"; // exactly what `bunx changeset --empty` writes

function run(files: ChangedFile[], contents: Record<string, string> = {}) {
  return evaluateChangeset(files, (p) => contents[p] ?? "");
}

describe("isShipped", () => {
  test.each([
    ["src/routes/index.tsx", true],
    ["convex/users.ts", true],
    ["convex/_generated/api.d.ts", true],
    ["public/favicon.ico", true],
    ["package.json", true],
    ["bun.lock", true],
    ["scripts/vercel-build.ts", true],
    ["convex/users.test.ts", false],
    ["src/lib/foo.test.tsx", false],
    ["convex/fixtures.testkit.ts", false],
    ["docs/deploy.md", false],
    [".github/workflows/ci.yml", false],
    ["tests/e2e/foo.spec.ts", false],
    ["scripts/check-changeset.ts", false],
    ["AGENTS.md", false],
    ["playwright.config.ts", false],
  ])("%s → %p", (path, expected) => {
    expect(isShipped(path)).toBe(expected);
  });
});

describe("validateChangeset", () => {
  test("accepts a normal changeset (quoted or bare name)", () => {
    expect(validateChangeset(GOOD)).toEqual([]);
    expect(validateChangeset("---\npaxtools: minor\n---\n\nNew.\n")).toEqual([]);
  });
  test("accepts the empty opt-out changeset", () => {
    expect(validateChangeset(EMPTY)).toEqual([]);
  });
  test("rejects a missing frontmatter", () => {
    expect(validateChangeset("just text")).toEqual([
      expect.stringMatching(/frontmatter/),
    ]);
  });
  test("rejects a bad bump type", () => {
    expect(validateChangeset('---\n"paxtools": huge\n---\n\nX\n')[0]).toMatch(
      /bad frontmatter line/,
    );
  });
  test("rejects an unknown package", () => {
    expect(validateChangeset('---\n"other": patch\n---\n\nX\n')[0]).toMatch(
      /unknown package/,
    );
  });
  test("rejects a missing description", () => {
    expect(validateChangeset('---\n"paxtools": patch\n---\n')[0]).toMatch(
      /no description/,
    );
  });
});

describe("evaluateChangeset", () => {
  test("shipped change without changeset fails and lists files", () => {
    const v = run([{ status: "M", path: "src/a.ts" }]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toContain("src/a.ts");
  });

  test("shipped change with changeset passes", () => {
    const v = run(
      [
        { status: "M", path: "convex/users.ts" },
        { status: "A", path: ".changeset/x.md" },
      ],
      { ".changeset/x.md": GOOD },
    );
    expect(v.ok).toBe(true);
  });

  test("empty changeset opts out", () => {
    const v = run(
      [
        { status: "M", path: "src/a.ts" },
        { status: "A", path: ".changeset/x.md" },
      ],
      { ".changeset/x.md": EMPTY },
    );
    expect(v.ok).toBe(true);
  });

  test("invalid changeset fails even when not strictly required", () => {
    const v = run([{ status: "A", path: ".changeset/x.md" }], {
      ".changeset/x.md": "oops",
    });
    expect(v.ok).toBe(false);
  });

  test("docs/CI/tests-only PR passes without changeset", () => {
    const v = run([
      { status: "M", path: "docs/agents/e2e.md" },
      { status: "M", path: ".github/workflows/ci.yml" },
      { status: "A", path: "tests/e2e/new.spec.ts" },
      { status: "M", path: "convex/users.test.ts" },
    ]);
    expect(v).toEqual({ ok: true, reason: expect.stringMatching(/no shipped/) });
  });

  test("README.md in .changeset is not a changeset", () => {
    const v = run([
      { status: "M", path: "src/a.ts" },
      { status: "M", path: ".changeset/README.md" },
    ]);
    expect(v.ok).toBe(false);
  });

  test("deleting a changeset alone doesn't satisfy the rule", () => {
    const v = run([
      { status: "M", path: "src/a.ts" },
      { status: "D", path: ".changeset/x.md" },
    ]);
    expect(v.ok).toBe(false);
  });

  test("release PR (version) passes", () => {
    const v = run([
      { status: "D", path: ".changeset/x.md" },
      { status: "M", path: "CHANGELOG.md" },
      { status: "M", path: "package.json" },
    ]);
    expect(v).toEqual({ ok: true, reason: expect.stringMatching(/release/) });
  });
});
