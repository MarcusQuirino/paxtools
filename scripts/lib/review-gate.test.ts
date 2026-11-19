import { describe, expect, test } from "bun:test";
import {
  choosePr,
  esc,
  type PullSummary,
  COMMENT_MARKER,
  decide,
  leaksSecret,
  parseClaudeResult,
  pendingChecks,
  renderCi,
  renderComment,
  renderError,
  type Verdict,
  WAIT_FOR_CHECKS,
} from "./review-gate";

const pass: Verdict = { verdict: "pass", summary: "Adds X. Delivers.", blocking: [], nits: [] };
const finding = {
  category: "auth" as const,
  file: "convex/foo.ts",
  line: 12,
  problem: "Public mutation writes without checking the caller.",
  fix: "Call requireUser(ctx) and check troop ownership before patch.",
};
const block: Verdict = { verdict: "block", summary: "Adds Y.", blocking: [finding], nits: [] };

const out = (structured: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    duration_ms: 90_000,
    num_turns: 14,
    structured_output: structured,
    ...extra,
  });

describe("parseClaudeResult", () => {
  test("accepts a valid verdict and returns run meta", () => {
    const r = parseClaudeResult(out(block));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.verdict.blocking[0]!.file).toBe("convex/foo.ts");
      expect(r.meta.turns).toBe(14);
    }
  });

  test("fails closed on empty / non-JSON / failed runs", () => {
    expect(parseClaudeResult("").ok).toBe(false);
    expect(parseClaudeResult("nope").ok).toBe(false);
    expect(parseClaudeResult(out(pass, { is_error: true, result: "rate limited" }))).toEqual({
      ok: false,
      error: "reviewer run failed: rate limited",
    });
    expect(parseClaudeResult(out(pass, { subtype: "error_max_turns" })).ok).toBe(false);
  });

  test("rejects malformed verdicts", () => {
    expect(parseClaudeResult(out(undefined)).ok).toBe(false);
    expect(parseClaudeResult(out({ ...pass, verdict: "lgtm" })).ok).toBe(false);
    expect(parseClaudeResult(out({ ...pass, summary: " " })).ok).toBe(false);
    expect(parseClaudeResult(out({ ...block, blocking: [{ ...finding, fix: "" }] })).ok).toBe(false);
    expect(parseClaudeResult(out({ ...block, blocking: [{ ...finding, category: "vibes" }] })).ok).toBe(false);
    expect(parseClaudeResult(out({ ...pass, nits: [{ file: "a", line: 1.5, note: "x" }] })).ok).toBe(false);
  });
});

describe("decide", () => {
  test("pass only when verdict is pass and nothing blocks", () => {
    expect(decide(pass)).toBe("pass");
    expect(decide(block)).toBe("block");
    expect(decide({ ...pass, blocking: [finding] })).toBe("block");
    expect(decide({ ...block, blocking: [] })).toBe("block");
  });

  test("nits never block", () => {
    expect(decide({ ...pass, nits: [{ file: "a.ts", line: 1, note: "rename" }] })).toBe("pass");
  });
});

describe("renderComment", () => {
  const ctx = { sha: "abcdef1234", runUrl: "https://run", rubricUrl: "https://rubric" };

  test("pass comment carries marker, sha, no author instructions", () => {
    const c = renderComment(pass, ctx);
    expect(c.startsWith(COMMENT_MARKER)).toBe(true);
    expect(c).toContain("✅ Independent review: pass");
    expect(c).toContain("`abcdef1`");
    expect(c).not.toContain("fix and push");
  });

  test("blocking comment lists file:line and the fix", () => {
    const c = renderComment({ ...block, nits: [{ file: "b.ts", line: 3, note: "a | b" }] }, ctx);
    expect(c).toContain("1 blocking finding");
    expect(c).toContain("`convex/foo.ts:12`");
    expect(c).toContain("**Fix:** Call requireUser");
    expect(c).toContain("a \\| b");
    expect(c).toContain("fix and push");
  });

  test("block without findings is still shown as blocking", () => {
    expect(renderComment({ ...block, blocking: [] }, ctx)).toContain("without findings");
  });

  test("error comment fails closed", () => {
    expect(renderError("boom", ctx)).toContain("no verdict");
  });
});

describe("leaksSecret", () => {
  test("detects secrets, ignores short/undefined", () => {
    expect(leaksSecret("token sk-ant-oat01-xyz here", ["sk-ant-oat01-xyz"])).toBe(true);
    expect(leaksSecret("abc", [undefined, "abc"])).toBe(false);
    expect(leaksSecret("clean", ["sk-ant-oat01-xyz"])).toBe(false);
  });
});

describe("CI snapshot", () => {
  const done = (name: string, conclusion = "success") => ({ name, status: "completed", conclusion });

  test("waits for missing or running fast checks only", () => {
    const runs = [
      ...WAIT_FOR_CHECKS.slice(1).map((n) => done(n)),
      { name: "Lint, Test, Build", status: "in_progress", conclusion: null },
      { name: "E2E (Playwright)", status: "in_progress", conclusion: null },
    ];
    expect(pendingChecks(runs)).toEqual(["Lint, Test, Build"]);
    expect(pendingChecks(WAIT_FOR_CHECKS.map((n) => done(n)))).toEqual([]);
    expect(pendingChecks([])).toEqual(WAIT_FOR_CHECKS);
  });

  test("uses the newest run per name and hides the review itself", () => {
    const md = renderCi([
      done("Changeset", "failure"),
      done("Changeset"),
      done("Independent review", "failure"),
    ]);
    expect(md).toContain("| Changeset | failure |");
    expect(md).not.toContain("| Changeset | success |");
    expect(md).not.toContain("Independent review");
  });
});

describe("choosePr", () => {
  const repo = "o/r";
  const pr = (n: number, over: Partial<PullSummary> = {}): PullSummary => ({
    number: n,
    state: "open",
    draft: false,
    head: { sha: "s1", repo: { full_name: repo } },
    base: { ref: "master", sha: "b" },
    ...over,
  });

  test("prefers the open PR to master for this exact head", () => {
    const r = choosePr([pr(1, { base: { ref: "other", sha: "x" } }), pr(2), pr(3, { state: "closed" })], repo, "s1");
    expect(r.ok && r.pr.number).toBe(2);
  });

  test("refuses stale heads, forks and drafts (fail, never skip)", () => {
    expect(choosePr([pr(1, { head: { sha: "old", repo: { full_name: repo } } })], repo, "s1").ok).toBe(false);
    expect(choosePr([pr(1, { head: { sha: "s1", repo: { full_name: "fork/r" } } })], repo, "s1").ok).toBe(false);
    expect(choosePr([pr(1, { head: { sha: "s1", repo: null } })], repo, "s1").ok).toBe(false);
    expect(choosePr([pr(1, { draft: true })], repo, "s1").ok).toBe(false);
  });
});

describe("esc (model text in comments)", () => {
  test("one line, escaped pipes, no live @mentions", () => {
    const out = esc(" ping @marcus\nand | more \n");
    expect(out).toBe("ping @​marcus and \\| more");
    expect(out).not.toMatch(/@[a-z]/);
  });

  test("blocking findings are escaped in the comment", () => {
    const c = renderComment(
      { ...block, blocking: [{ ...finding, problem: "line1\n2. fake item @octocat" }] },
      { sha: "abcdef1234", runUrl: "r", rubricUrl: "u" },
    );
    expect(c).toContain("line1 2. fake item @​octocat");
  });
});
