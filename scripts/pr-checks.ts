#!/usr/bin/env bun
/**
 * Wait for a PR's required checks on its CURRENT head, foreground, with an
 * exit code (docs/agents/ci-checks.md "Waiting for CI"):
 *
 *   bun scripts/pr-checks.ts wait [--pr N] [--no-review] [--timeout-min 60]
 *
 * Exit 0 = every required check passed (incl. a fresh `Independent review`),
 * 1 = something failed (links printed), 2 = usage/timeout.
 * --no-review: skip the review (a draft waiting for E2E before `verify`).
 *
 * Unlike `gh pr checks --watch`, it ignores the draft's stale review failure
 * and waits for the review that belongs to the latest Guardrails run on the
 * head created since the PR was last marked ready (scripts/lib/pr-checks.ts). If a new commit lands mid-wait it
 * follows the new head.
 */

import { spawnSync } from "node:child_process";
import {
  type CheckState,
  evaluate,
  type GuardrailsRun,
  type RequiredCheck,
  REVIEW_CHECK,
  type ReviewRun,
  reviewState,
} from "./lib/pr-checks";

function gh(args: string[]): string {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  // Just after a push nothing is reported yet — that's "pending", not an error.
  if (r.status !== 0 && /no (required )?checks reported/.test(r.stderr)) return "[]";
  // `gh pr checks` exits 8 while checks are pending and 1 when one failed;
  // its JSON is still on stdout.
  if (r.status !== 0 && !r.stdout) throw new Error(`gh ${args.join(" ")}: ${r.stderr.trim()}`);
  return r.stdout;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function wait() {
  const withReview = !process.argv.includes("--no-review");
  const deadline = Date.now() + Number(flag("timeout-min") ?? 60) * 60_000;
  const prArg = flag("pr") ? [flag("pr")!] : [];
  const repo = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
  let lastPrinted = "";
  let lastHead = "";

  while (true) {
    const pr = JSON.parse(gh(["pr", "view", ...prArg, "--json", "number,isDraft,headRefOid"])) as {
      number: number;
      isDraft: boolean;
      headRefOid: string;
    };
    if (lastHead && lastHead !== pr.headRefOid) console.log(`\nhead moved ${lastHead.slice(0, 7)} → ${pr.headRefOid.slice(0, 7)}; following it`);
    lastHead = pr.headRefOid;
    const required = JSON.parse(
      gh(["pr", "checks", String(pr.number), "--required", "--json", "name,bucket,link"]) || "[]",
    ) as RequiredCheck[];
    let review: CheckState;
    if (withReview) {
      const reviews = JSON.parse(
        gh([
          "api",
          `repos/${repo}/commits/${pr.headRefOid}/check-runs?check_name=${encodeURIComponent(REVIEW_CHECK)}&per_page=100`,
          "--jq",
          ".check_runs",
        ]),
      ) as ReviewRun[];
      const guardrails = JSON.parse(
        gh(["run", "list", "--workflow", "guardrails.yml", "--commit", pr.headRefOid, "--json", "createdAt,status", "--limit", "20"]),
      ) as GuardrailsRun[];
      const readyAt =
        gh([
          "api",
          "--paginate",
          `repos/${repo}/issues/${pr.number}/timeline?per_page=100`,
          "--jq",
          '.[] | select(.event == "ready_for_review") | .created_at',
        ])
          .trim()
          .split("\n")
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
      review = reviewState(reviews, guardrails, pr.isDraft, readyAt);
    } else {
      review = { name: `${REVIEW_CHECK} (skipped: --no-review)`, state: "pass", detail: "" };
    }
    const result = evaluate(required, review);
    const table = result.checks.map((c) => `  ${c.state.padEnd(7)} ${c.name}  ${c.detail}`).join("\n");
    if (table !== lastPrinted) {
      console.log(`\nPR #${pr.number} @ ${pr.headRefOid.slice(0, 7)} — ${new Date().toISOString().slice(11, 19)}Z\n${table}`);
      lastPrinted = table;
    }
    if (result.done) {
      console.log(result.ok ? "\nAll required checks passed on the current head." : "\nFAILED — see the links above.");
      process.exit(result.ok ? 0 : 1);
    }
    if (Date.now() > deadline) {
      console.error("\nTimed out waiting; re-run to keep waiting.");
      process.exit(2);
    }
    await sleep(20_000);
  }
}

if (process.argv[2] === "wait") await wait();
else {
  console.error("usage: bun scripts/pr-checks.ts wait [--pr N] [--no-review] [--timeout-min 60]");
  process.exit(2);
}
