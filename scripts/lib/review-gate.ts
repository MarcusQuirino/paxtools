/**
 * Pure logic for the independent review gate (.github/workflows/review.yml,
 * docs/agents/review-gate.md). The CLI in scripts/review-gate.ts does the I/O.
 */

/**
 * Name of the check run the gate posts on the PR head = the required status
 * check in ruleset 27609274 (pinned to the GitHub Actions app).
 */
export const REVIEW_CHECK = "Independent review";

/** Marker that identifies the gate's sticky PR comment. */
export const COMMENT_MARKER = "<!-- independent-review -->";

/**
 * Checks the reviewer waits for before reading CI (fast ones, ~1 min).
 * E2E is slower and separately required, so the review runs in parallel
 * with it instead of adding its duration to every PR.
 */
export const WAIT_FOR_CHECKS = [
  "Lint, Test, Build",
  "Changeset",
  "Migration registry append-only",
  "Convex codegen in sync",
  "Coverage floor (convex/)",
];

const CATEGORIES = [
  "intent",
  "correctness",
  "auth",
  "tests",
  "migration",
  "security",
  "data-loss",
  "process",
  "scope",
  "verification",
] as const;

/** JSON schema passed to `claude --json-schema`; the verdict must match it. */
export const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "blocking", "nits"],
  properties: {
    verdict: { type: "string", enum: ["pass", "block"] },
    summary: { type: "string" },
    blocking: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "file", "line", "problem", "fix"],
        properties: {
          category: { type: "string", enum: [...CATEGORIES] },
          file: { type: "string" },
          line: { type: "integer" },
          problem: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
    nits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "line", "note"],
        properties: {
          file: { type: "string" },
          line: { type: "integer" },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

export type Blocking = {
  category: (typeof CATEGORIES)[number];
  file: string;
  line: number;
  problem: string;
  fix: string;
};
export type Nit = { file: string; line: number; note: string };
export type Verdict = {
  verdict: "pass" | "block";
  summary: string;
  blocking: Blocking[];
  nits: Nit[];
};

const isStr = (v: unknown): v is string => typeof v === "string";
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isLine = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v);

/**
 * Extract and validate the verdict from `claude -p --output-format json`
 * output. Anything malformed is an error: the gate fails closed.
 */
export function parseClaudeResult(
  stdout: string,
): { ok: true; verdict: Verdict; meta: RunMeta } | { ok: false; error: string } {
  let out: unknown;
  try {
    out = JSON.parse(stdout);
  } catch {
    return { ok: false, error: "reviewer output is not JSON" };
  }
  if (!isObj(out)) return { ok: false, error: "reviewer output is not an object" };
  if (out.is_error === true || out.subtype !== "success") {
    const why = isStr(out.result) ? out.result : String(out.subtype);
    return { ok: false, error: `reviewer run failed: ${why}` };
  }
  const v = out.structured_output;
  const problem = validateVerdict(v);
  if (problem) return { ok: false, error: `invalid verdict: ${problem}` };
  return {
    ok: true,
    verdict: v as Verdict,
    meta: {
      durationMs: typeof out.duration_ms === "number" ? out.duration_ms : 0,
      turns: typeof out.num_turns === "number" ? out.num_turns : 0,
      costUsd: typeof out.total_cost_usd === "number" ? out.total_cost_usd : 0,
    },
  };
}

export type RunMeta = { durationMs: number; turns: number; costUsd: number };

export function validateVerdict(v: unknown): string | null {
  if (!isObj(v)) return "missing structured_output";
  if (v.verdict !== "pass" && v.verdict !== "block") return "verdict must be pass|block";
  if (!isStr(v.summary) || !v.summary.trim()) return "empty summary";
  if (!Array.isArray(v.blocking)) return "blocking must be an array";
  if (!Array.isArray(v.nits)) return "nits must be an array";
  for (const b of v.blocking) {
    if (
      !isObj(b) ||
      !CATEGORIES.includes(b.category as Blocking["category"]) ||
      !isStr(b.file) ||
      !isLine(b.line) ||
      !isStr(b.problem) ||
      !isStr(b.fix) ||
      !b.fix.trim()
    )
      return "malformed blocking finding";
  }
  for (const n of v.nits) {
    if (!isObj(n) || !isStr(n.file) || !isLine(n.line) || !isStr(n.note))
      return "malformed nit";
  }
  return null;
}

/**
 * Pass only when the reviewer says pass AND lists no blocking finding.
 * A "block" with no findings is inconsistent → still blocks (fail closed).
 */
export function decide(v: Verdict): "pass" | "block" {
  return v.verdict === "pass" && v.blocking.length === 0 ? "pass" : "block";
}

/**
 * True if any secret value (≥ 8 chars) appears verbatim in text. A last-line
 * tripwire, not a general secret filter: the reviewer has no token in its env
 * and can't read outside its working dir, so it shouldn't see one at all.
 */
export function leaksSecret(text: string, secrets: (string | undefined)[]): boolean {
  return secrets.some((s) => !!s && s.length >= 8 && text.includes(s));
}

/**
 * Model text → one safe markdown line: no table breaks, no newlines, and no
 * live @mentions (the reviewer read untrusted text; it must not ping people).
 */
export const esc = (s: string) =>
  s
    .trim()
    .replace(/\|/g, "\\|")
    .replace(/\r?\n+/g, " ")
    .replace(/@(?=[A-Za-z0-9-])/g, "@\u200b");

export type CommentCtx = {
  sha: string;
  runUrl: string;
  rubricUrl: string;
  meta?: RunMeta;
};

export function renderComment(v: Verdict, ctx: CommentCtx): string {
  const outcome = decide(v);
  const head =
    outcome === "pass"
      ? `### ✅ Independent review: pass`
      : `### ❌ Independent review: ${v.blocking.length || "unexplained"} blocking finding${v.blocking.length === 1 ? "" : "s"}`;
  const lines = [
    COMMENT_MARKER,
    head,
    "",
    `Reviewed \`${ctx.sha.slice(0, 7)}\` · [run](${ctx.runUrl}) · [rubric](${ctx.rubricUrl})${
      ctx.meta ? ` · ${Math.round(ctx.meta.durationMs / 1000)}s, ${ctx.meta.turns} turns` : ""
    }`,
    "",
    esc(v.summary),
  ];
  if (v.blocking.length) {
    lines.push("", "#### Blocking", "");
    v.blocking.forEach((b, i) => {
      lines.push(
        `${i + 1}. **[${b.category}]** \`${esc(b.file)}:${b.line}\` — ${esc(b.problem)}`,
        `   - **Fix:** ${esc(b.fix)}`,
      );
    });
  } else if (outcome === "block") {
    lines.push("", "Reviewer returned `block` without findings — treated as blocking. Push again to re-review.");
  }
  if (v.nits.length) {
    lines.push("", "<details><summary>Nits (non-blocking)</summary>", "");
    for (const n of v.nits) lines.push(`- \`${esc(n.file)}:${n.line}\` — ${esc(n.note)}`);
    lines.push("", "</details>");
  }
  if (outcome === "block") {
    lines.push(
      "",
      "> Author: fix and push — a new commit triggers a fresh review. Don't argue the check off or re-run it hoping for a different answer. If a finding is wrong, say why in the PR and ask Marcus. (`docs/agents/review-gate.md`)",
    );
  }
  return lines.join("\n") + "\n";
}

/** Comment when the reviewer couldn't produce a verdict (fails closed). */
export function renderError(error: string, ctx: Omit<CommentCtx, "meta">): string {
  return [
    COMMENT_MARKER,
    "### ⚠️ Independent review: no verdict",
    "",
    `Commit \`${ctx.sha.slice(0, 7)}\` · [run](${ctx.runUrl})`,
    "",
    `The reviewer failed: ${esc(error)}`,
    "",
    "The check fails closed. If this is infrastructure (expired `CLAUDE_CODE_OAUTH_TOKEN`, usage limit, outage), re-run the job once it's fixed; otherwise ping Marcus.",
    "",
  ].join("\n");
}

export type CheckRun = {
  name: string;
  status: string;
  conclusion: string | null;
  html_url?: string;
};

/** Latest run per name (the API lists newest first). */
export function latestByName(runs: CheckRun[]): CheckRun[] {
  const seen = new Map<string, CheckRun>();
  for (const r of runs) if (!seen.has(r.name)) seen.set(r.name, r);
  return [...seen.values()];
}

/** Waited-for checks that haven't completed yet (missing counts as pending). */
export function pendingChecks(runs: CheckRun[], wanted = WAIT_FOR_CHECKS): string[] {
  const latest = new Map(latestByName(runs).map((r) => [r.name, r]));
  return wanted.filter((n) => latest.get(n)?.status !== "completed");
}

export function renderCi(runs: CheckRun[]): string {
  const rows = latestByName(runs)
    .filter((r) => r.name !== REVIEW_CHECK)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => `| ${esc(r.name)} | ${r.status === "completed" ? (r.conclusion ?? "?") : r.status} |`);
  return [
    "# CI on this commit (at review time)",
    "",
    "| Check | Result |",
    "|---|---|",
    ...(rows.length ? rows : ["| (none reported yet) | |"]),
    "",
  ].join("\n");
}

export type PullSummary = {
  number: number;
  state: string;
  draft?: boolean;
  head: { sha: string; repo: { full_name: string } | null };
  base: { ref: string; sha: string };
};

/**
 * Pick the open PR whose head is `sha` (prefer one targeting master).
 * Forks and drafts are refused — the gate fails rather than skips, because a
 * skipped/neutral check would count as passing.
 */
export function choosePr(
  prs: PullSummary[],
  repo: string,
  sha: string,
): { ok: true; pr: PullSummary } | { ok: false; reason: string } {
  const open = prs.filter((p) => p.state === "open" && p.head.sha === sha);
  const pr = open.find((p) => p.base.ref === "master") ?? open[0];
  if (!pr) return { ok: false, reason: `No open PR has ${sha.slice(0, 7)} as its head (pushed again since?).` };
  if (pr.head.repo?.full_name !== repo)
    return { ok: false, reason: "Fork PRs aren't auto-reviewed (secrets + subscription). Marcus: push the branch to this repo and open the PR from there." };
  if (pr.draft) return { ok: false, reason: "Draft PR — the review runs when it's marked ready for review." };
  return { ok: true, pr };
}

/**
 * What the always-run `abort` step does with the check run.
 *
 * `completed` = the check run id this job recorded right after its own PATCH
 * completed the check (a verdict, or start's fork/draft/stale refusal), or
 * null. Only a match keeps the check. Everything else — no verdict, a crash,
 * cancel, timeout, or a marker from another check run — fails it.
 *
 * Deliberately NOT a re-read of the check's status: `GET check-runs/{id}`
 * right after the PATCH can still say `in_progress` (seen on PR #158), and
 * that stale read overwrote a pass with "Review job failed".
 */
export function abortAction(
  checkRunId: string | undefined,
  completed: string | null,
): "no-check" | "keep" | "fail" {
  if (!checkRunId) return "no-check";
  return completed?.trim() === checkRunId ? "keep" : "fail";
}
