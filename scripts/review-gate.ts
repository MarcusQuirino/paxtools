#!/usr/bin/env bun
/**
 * I/O half of the independent review gate. Runs in .github/workflows/review.yml
 * from the TRUSTED (base-branch) checkout; never executes anything from the PR.
 *
 *   bun scripts/review-gate.ts context    # gather PR context into $WORKDIR/context
 *   bun scripts/review-gate.ts schema     # print the verdict JSON schema
 *   bun scripts/review-gate.ts finalize <claude-output.json>
 *
 * Env: REPO, PR_NUMBER, HEAD_SHA, BASE_SHA, WORKDIR (contains pr/ = PR head
 * checkout), RUN_URL, GH_TOKEN. Flow: docs/agents/review-gate.md.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  COMMENT_MARKER,
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
    console.error(`::error::${parsed.error}`);
    process.exit(1);
  }
  const outcome = decide(parsed.verdict);
  console.log(
    `Verdict: ${outcome} (${parsed.verdict.blocking.length} blocking, ${parsed.verdict.nits.length} nits) in ${Math.round(parsed.meta.durationMs / 1000)}s / ${parsed.meta.turns} turns`,
  );
  if (outcome === "block") {
    for (const b of parsed.verdict.blocking) {
      console.error(`::error file=${b.file},line=${b.line}::[${b.category}] ${b.problem} — Fix: ${b.fix}`);
    }
    process.exit(1);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "context") await context();
else if (cmd === "schema") console.log(JSON.stringify(VERDICT_SCHEMA));
else if (cmd === "finalize" && arg) finalize(arg);
else {
  console.error("usage: review-gate.ts context | schema | finalize <claude-output.json>");
  process.exit(2);
}
