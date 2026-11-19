#!/usr/bin/env bun
/**
 * Verify-on-the-running-app tooling (docs/agents/verify.md).
 *
 *   bun scripts/verify.ts affected [--base origin/master]
 *       Features the diff touches + their neighbours, from
 *       docs/agents/feature-map.yaml: routes, personas, specs, check recipes.
 *   bun scripts/verify.ts preview-url [--pr N]
 *       The PR head's Vercel preview URL (its own Convex preview backend) and
 *       its deployment status.
 *   bun scripts/verify.ts publish [--pr N] [--dir .verification/out]
 *       Push the evidence dir to branch `verification-evidence` under
 *       `pr-<N>/` (replacing the previous run) and print the markdown for
 *       the PR's Verification section.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { affectedFeatures, FEATURE_MAP_PATH, parseFeatureMap, renderAffected } from "./lib/feature-map";
import { EVIDENCE_BRANCH, evidenceDir, LOG_FILE, renderEvidenceLinks } from "./lib/verification-evidence";

function sh(cmd: string, args: string[], opts: { cwd?: string; allowFail?: boolean } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: opts.cwd, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`${cmd} ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
    process.exit(2);
  }
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function prNumber(): string {
  const pr = flag("pr") ?? sh("gh", ["pr", "view", "--json", "number", "--jq", ".number"], { allowFail: true }).out;
  if (!/^\d+$/.test(pr)) {
    console.error("No PR for this branch — open it first (gh pr create) or pass --pr N.");
    process.exit(2);
  }
  return pr;
}

function affected() {
  const base = flag("base") ?? "origin/master";
  const mergeBase = sh("git", ["merge-base", base, "HEAD"]).out;
  const committed = sh("git", ["diff", "--name-only", `${mergeBase}..HEAD`]).out;
  const working = sh("git", ["diff", "--name-only", "HEAD"]).out;
  const untracked = sh("git", ["ls-files", "--others", "--exclude-standard"]).out;
  const changed = [...new Set([committed, working, untracked].flatMap((s) => s.split("\n")).filter(Boolean))];
  const map = parseFeatureMap(readFileSync(FEATURE_MAP_PATH, "utf8"));
  console.log(`${changed.length} changed files vs ${base}\n`);
  console.log(renderAffected(affectedFeatures(map, changed)));
}

function previewUrl() {
  const pr = prNumber();
  const sha = sh("gh", ["pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"]).out;
  // `vercel ls` prints its table on stderr and bare URLs on stdout.
  const url = sh("vercel", ["ls", "paxtools", "--meta", `githubCommitSha=${sha}`], { allowFail: true }).out.split("\n")[0] ?? "";
  if (!url.startsWith("https://")) {
    console.error(`No Vercel deployment for ${sha.slice(0, 7)} yet — builds take ~1 min after a push; retry.`);
    process.exit(1);
  }
  const inspect = sh("vercel", ["inspect", url], { allowFail: true });
  const status = /status\s+●?\s*(\w+)/i.exec(`${inspect.out}\n${inspect.err}`)?.[1] ?? "unknown";
  console.log(`PR #${pr} head ${sha.slice(0, 7)}\nURL     ${url}\nstatus  ${status}`);
  if (status.toLowerCase() !== "ready") process.exitCode = 1;
}

const README = `# verification-evidence

Orphan branch, never merged. Author agents publish proof that a PR works on
the running app here: \`pr-<n>/log.md\` + screenshots, via
\`bun scripts/verify.ts publish\` (docs/agents/verify.md on master). The
Independent review gate reads \`pr-<n>/\` for the PR it reviews. Test-persona
data only — never screenshots of prod or real members.
`;

function publish() {
  const pr = prNumber();
  const dir = flag("dir") ?? ".verification/out";
  if (!existsSync(join(dir, LOG_FILE))) {
    console.error(`${dir}/${LOG_FILE} missing — run your scenario (verifySession().finish() writes it) first.`);
    process.exit(2);
  }
  const files = readdirSync(dir).filter((f) => !f.startsWith("."));
  const repo = sh("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).out;
  const head = sh("git", ["rev-parse", "--short", "HEAD"]).out;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const wt = mkdtempSync(join(tmpdir(), "verify-evidence-"));
    rmSync(wt, { recursive: true });
    let orphan: string | null = null;
    const remote = sh("git", ["fetch", "origin", `+refs/heads/${EVIDENCE_BRANCH}:refs/remotes/origin/${EVIDENCE_BRANCH}`], { allowFail: true });
    if (remote.ok) {
      sh("git", ["worktree", "add", "--detach", wt, `origin/${EVIDENCE_BRANCH}`]);
    } else {
      // First publish ever: orphan branch, Vercel deploys disabled on it.
      sh("git", ["worktree", "add", "--detach", wt]);
      orphan = `tmp-evidence-${Date.now()}`;
      sh("git", ["checkout", "--orphan", orphan], { cwd: wt });
      sh("git", ["rm", "-rfq", "."], { cwd: wt });
      writeFileSync(join(wt, "README.md"), README);
      writeFileSync(join(wt, "vercel.json"), `${JSON.stringify({ git: { deploymentEnabled: false } }, null, 2)}\n`);
    }
    try {
      const target = join(wt, evidenceDir(pr));
      rmSync(target, { recursive: true, force: true });
      cpSync(dir, target, { recursive: true });
      sh("git", ["add", "-A"], { cwd: wt });
      sh("git", ["commit", "-qm", `evidence: PR #${pr} @ ${head}`], { cwd: wt });
      const push = sh("git", ["push", "origin", `HEAD:refs/heads/${EVIDENCE_BRANCH}`], { cwd: wt, allowFail: true });
      if (!push.ok) {
        console.error(`push rejected (attempt ${attempt}), refetching: ${push.err.split("\n").at(-1)}`);
        continue;
      }
      const commit = sh("git", ["rev-parse", "HEAD"], { cwd: wt }).out;
      console.log(`Published ${files.length} files to ${EVIDENCE_BRANCH}:${evidenceDir(pr)}/ (${commit.slice(0, 7)})\n`);
      console.log("Paste into the PR's Verification section:\n");
      console.log(renderEvidenceLinks({ repo, commit, pr, files }));
      return;
    } finally {
      sh("git", ["worktree", "remove", "--force", wt], { allowFail: true });
      if (orphan) sh("git", ["branch", "-D", orphan], { allowFail: true });
    }
  }
  console.error("Could not push evidence after 3 attempts.");
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === "affected") affected();
else if (cmd === "preview-url") previewUrl();
else if (cmd === "publish") publish();
else {
  console.error("usage: bun scripts/verify.ts affected [--base REF] | preview-url [--pr N] | publish [--pr N] [--dir DIR]");
  process.exit(2);
}
