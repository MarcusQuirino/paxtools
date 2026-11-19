#!/usr/bin/env bun
/**
 * I/O half of the independent review gate. Runs in .github/workflows/review.yml
 * from the TRUSTED checkout (master); never executes anything from the PR.
 *
 *   bun scripts/review-gate.ts start      # resolve the PR, open the check run
 *   bun scripts/review-gate.ts context    # gather PR context into $WORKDIR/context
 *   bun scripts/review-gate.ts schema     # print the verdict JSON schema
 *   bun scripts/review-gate.ts finalize <claude-output.json>
 *   bun scripts/review-gate.ts abort      # job died: fail the check if still open
 *
 * Env: REPO, HEAD_SHA, WORKDIR (contains pr/ = PR head checkout), RUN_URL,
 * GH_TOKEN; `start` exports PR_NUMBER, BASE_SHA, CHECK_RUN_ID to $GITHUB_ENV.
 * Flow: docs/agents/review-gate.md.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  choosePr,
  COMMENT_MARKER,
  REVIEW_CHECK,
  type CheckRun,
  decide,
  leaksSecret,
  parseClaudeResult,
  pendingChecks,
  renderCi,
  renderComment,
  renderError,
  VERDICT_SCHEMA,
} from "./lib/review-gate";

const TRUSTED = join(import.meta.dir, "..");

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`::error::${name} is not set`);
    process.exit(2);
  }
  return v;
}

function run(cmd: string, args: string[], input?: string): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error(`::error::${cmd} ${args.join(" ")} failed:\n${r.stderr}`);
    process.exit(2);
  }
  return r.stdout;
}

const gh = (args: string[], input?: string) => run("gh", args, input);

function exportEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
    if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${k}=${v}\n`);
  }
}

type Conclusion = "success" | "failure";

/** The required check: a check run on the PR head, created by GitHub Actions. */
function completeCheck(conclusion: Conclusion, title: string, summary: string) {
  const repo = env("REPO");
  const payload = JSON.stringify({
    status: "completed",
    conclusion,
    output: { title, summary: summary.slice(0, 65_000) },
  });
  gh(["api", "-X", "PATCH", `repos/${repo}/check-runs/${env("CHECK_RUN_ID")}`, "--input", "-"], payload);
}

/**
 * Resolve the PR for HEAD_SHA, open the `Independent review` check run on it
 * (in progress), and refuse forks/drafts by failing it. Exit 1 = stop the job.
 */
function start() {
  const repo = env("REPO");
  const head = env("HEAD_SHA");
  const check = JSON.parse(
    gh([
      "api", "-X", "POST", `repos/${repo}/check-runs`, "--input", "-",
    ], JSON.stringify({ name: REVIEW_CHECK, head_sha: head, status: "in_progress", details_url: env("RUN_URL") })),
  ) as { id: number };
  exportEnv({ CHECK_RUN_ID: String(check.id) });

  const prs = JSON.parse(gh(["api", `repos/${repo}/commits/${head}/pulls`])) as Parameters<typeof choosePr>[0];
  const pick = choosePr(prs, repo, head);
  if (!pick.ok) {
    completeCheck("failure", "Not reviewed", pick.reason);
    console.error(`::error::${pick.reason}`);
    process.exit(1);
  }
  exportEnv({ PR_NUMBER: String(pick.pr.number), BASE_SHA: pick.pr.base.sha });
  console.log(`Reviewing PR #${pick.pr.number} at ${head} (check run ${check.id})`);
}

function abort() {
  const repo = env("REPO");
  const id = process.env.CHECK_RUN_ID;
  if (!id) return;
  const status = gh(["api", `repos/${repo}/check-runs/${id}`, "--jq", ".status"]).trim();
  if (status !== "completed") {
    completeCheck("failure", "Review job failed", `The review job ended without a verdict. [Run](${env("RUN_URL")}). Re-run it once fixed; it fails closed.`);
  }
}

async function context() {
  const repo = env("REPO");
  const pr = env("PR_NUMBER");
  const head = env("HEAD_SHA");
  const base = env("BASE_SHA");
  const work = env("WORKDIR");
  const ctx = join(work, "context");
  mkdirSync(join(ctx, "conventions"), { recursive: true });

  // PR text + linked issues (author claims; the rubric treats them as untrusted).
  const info = JSON.parse(
    gh([
      "pr", "view", pr, "--repo", repo, "--json",
      "title,body,author,baseRefName,headRefName,closingIssuesReferences,url",
    ]),
  ) as {
    title: string;
    body: string;
    author: { login: string };
    baseRefName: string;
    headRefName: string;
    url: string;
    closingIssuesReferences: { number: number }[];
  };
  const issues = info.closingIssuesReferences.map((i) => {
    const issue = JSON.parse(
      gh(["issue", "view", String(i.number), "--repo", repo, "--json", "number,title,body"]),
    ) as { number: number; title: string; body: string };
    return `## Linked issue #${issue.number}: ${issue.title}\n\n${issue.body || "(no body)"}\n`;
  });
  writeFileSync(
    join(ctx, "pr.md"),
    [
      `# PR #${pr}: ${info.title}`,
      "",
      `- URL: ${info.url}`,
      `- Author: ${info.author.login}`,
      `- ${info.headRefName} → ${info.baseRefName}`,
      `- Head commit: ${head}`,
      "",
      "## Body (author's claims)",
      "",
      info.body || "(empty — the PR states no intent; treat that as an intent finding)",
      "",
      ...(issues.length ? issues : ["## Linked issues\n\n(none)\n"]),
    ].join("\n"),
  );

  // Diff against the merge base, from the PR head checkout (git only — no PR code runs).
  const prDir = join(work, "pr");
  const mergeBase = run("git", ["-C", prDir, "merge-base", base, head]).trim();
  writeFileSync(join(ctx, "pr.diff"), run("git", ["-C", prDir, "diff", "--no-color", `${mergeBase}..${head}`]));
  writeFileSync(
    join(ctx, "files.txt"),
    run("git", ["-C", prDir, "diff", "--stat=200", "--stat-name-width=150", `${mergeBase}..${head}`]) +
      "\n" +
      run("git", ["-C", prDir, "diff", "--name-status", `${mergeBase}..${head}`]),
  );

  // Conventions from the trusted checkout (master), not the PR.
  for (const f of ["CLAUDE.md", "AGENTS.md", "convex/_generated/ai/guidelines.md"]) {
    const src = join(TRUSTED, f);
    if (existsSync(src)) {
      const dst = join(ctx, "conventions", f);
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(src, dst);
    }
  }
  cpSync(join(TRUSTED, "docs/agents"), join(ctx, "conventions/docs/agents"), { recursive: true });

  // CI: wait (bounded) for the fast checks, then snapshot everything.
  const deadline = Date.now() + 10 * 60_000;
  let runs: CheckRun[] = [];
  for (;;) {
    runs = JSON.parse(
      gh(["api", `repos/${repo}/commits/${head}/check-runs?per_page=100`, "--jq", ".check_runs"]),
    ) as CheckRun[];
    const pending = pendingChecks(runs);
    if (!pending.length || Date.now() > deadline) {
      if (pending.length) console.log(`Proceeding with checks still pending: ${pending.join(", ")}`);
      break;
    }
    console.log(`Waiting for: ${pending.join(", ")}`);
    await Bun.sleep(20_000);
  }
  writeFileSync(join(ctx, "ci.md"), renderCi(runs));
  console.log(`Context written to ${ctx}`);
}

function upsertComment(body: string) {
  const repo = env("REPO");
  const pr = env("PR_NUMBER");
  const ids = gh([
    "api", "--paginate", `repos/${repo}/issues/${pr}/comments`, "--jq",
    `.[] | select(.user.login == "github-actions[bot]" and (.body | startswith("${COMMENT_MARKER}"))) | .id`,
  ])
    .split("\n")
    .filter(Boolean);
  const payload = JSON.stringify({ body });
  if (ids.length) {
    gh(["api", "-X", "PATCH", `repos/${repo}/issues/comments/${ids.at(-1)}`, "--input", "-"], payload);
  } else {
    gh(["api", "-X", "POST", `repos/${repo}/issues/${pr}/comments`, "--input", "-"], payload);
  }
}

function finalize(outputPath: string) {
  const repo = env("REPO");
  const sha = env("HEAD_SHA");
  const runUrl = env("RUN_URL");
  const ctx = {
    sha,
    runUrl,
    rubricUrl: `https://github.com/${repo}/blob/master/docs/agents/review-rubric.md`,
  };
  const raw = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  const parsed = parseClaudeResult(raw);
  const body = parsed.ok
    ? renderComment(parsed.verdict, { ...ctx, meta: parsed.meta })
    : renderError(parsed.error, ctx);

  // The reviewer saw untrusted text; never let it echo a secret into a public comment.
  if (leaksSecret(body, [process.env.CLAUDE_CODE_OAUTH_TOKEN, process.env.GH_TOKEN])) {
    console.error("::error::Reviewer output contains a secret — not posting it. Rotate the token.");
    process.exit(1);
  }

  upsertComment(body);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);

  if (!parsed.ok) {
    completeCheck("failure", "No verdict", body);
    console.error(`::error::${parsed.error}`);
    process.exit(1);
  }
  const outcome = decide(parsed.verdict);
  const n = parsed.verdict.blocking.length;
  completeCheck(
    outcome === "pass" ? "success" : "failure",
    outcome === "pass" ? "Pass" : `${n || "Unexplained"} blocking finding${n === 1 ? "" : "s"}`,
    body,
  );
  console.log(
    `Verdict: ${outcome} (${parsed.verdict.blocking.length} blocking, ${parsed.verdict.nits.length} nits) in ${Math.round(parsed.meta.durationMs / 1000)}s / ${parsed.meta.turns} turns`,
  );
  if (outcome === "block") {
    for (const b of parsed.verdict.blocking) {
      console.error(`::error::${b.file}:${b.line} [${b.category}] ${b.problem} — Fix: ${b.fix}`);
    }
    process.exit(1);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "start") start();
else if (cmd === "abort") abort();
else if (cmd === "context") await context();
else if (cmd === "schema") console.log(JSON.stringify(VERDICT_SCHEMA));
else if (cmd === "finalize" && arg) finalize(arg);
else {
  console.error("usage: review-gate.ts start | context | schema | finalize <claude-output.json> | abort");
  process.exit(2);
}
