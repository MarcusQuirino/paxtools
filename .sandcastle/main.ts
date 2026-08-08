/**
 * AFK backlog drain for paxtools.
 *
 * Pairs with `/to-tickets`: that skill publishes GitHub issues labelled
 * `ready-for-agent`, each declaring its blocking edges. This script works that
 * backlog unattended while you're away.
 *
 * Shape (chosen deliberately — see "Why one branch" below):
 *
 *   plan ── one agent reads the whole backlog, builds the dependency graph,
 *           and emits an ordered plan. Nothing downstream picks its own work.
 *
 *   master
 *     └── sandcastle/<timestamp>            one session branch, one sandbox
 *           ├── feat: #101 …  (+ changeset)   implement → gate → review
 *           ├── feat: #102 …  (#101's code is already in the tree)
 *           └── fix:  #103 …
 *
 *   → e2e on the host → one pull request closing every issue it landed.
 *
 * **Why one branch.** Tickets from `/to-tickets` block each other. A branch per
 * issue cut from master cannot see its blocker's code, so a session could only
 * ever drain one dependency layer; stacked branches solve that but strand
 * children when the base merges (this repo hit exactly that on #12). One
 * accumulating branch makes each blocker's code simply present in the tree for
 * the next ticket, and collapses the session into a single reviewable PR.
 *
 * **Why the issues stay open until the PR merges.** The agent comments on each
 * issue but never closes it — the code isn't on master yet. The PR body carries
 * `Closes #N` for every issue, so merging closes them all at once. Within the
 * session, issues already implemented are passed forward as `{{DONE_ISSUES}}`
 * so the next iteration treats them as satisfied blockers.
 *
 * Run it:
 *   bun run sandcastle
 *
 * Prerequisites:
 *   - Docker running, and `bunx sandcastle docker build-image` run once after
 *     any change to .sandcastle/Dockerfile.
 *   - .sandcastle/.env with CLAUDE_CODE_OAUTH_TOKEN and GH_TOKEN.
 *   - `gh` authenticated on the host (used to push and open the PR).
 */

import { execFileSync } from "node:child_process";
import { createSandbox, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Hard ceiling on tickets drained per session. The run stops earlier when the
 *  backlog empties or everything left is blocked. */
const MAX_ISSUES = 3;

/** Second, fresh-context pass over each ticket's diff before moving on.
 *  The implement prompt deliberately omits self-review so this isn't a repeat:
 *  a reviewer that didn't write the code catches "plausible but misses the
 *  ticket" in a way the author's own context cannot. Set false to halve cost. */
const REVIEW = true;

/** Run the Playwright suite once, on the host, after the loop. See runE2e() —
 *  it touches your dev Convex deployment, so read that comment before leaving
 *  it on for a machine whose dev data you care about. */
const RUN_E2E = true;

/** Per CLAUDE.md's model-routing rubric: planning, implementation and code review
 *  are all "non-trivial subagent" work, so all three sit at opus/high. The plan
 *  gates everything downstream, so it is the last place to economise. */
const PLANNER = claudeCode("claude-opus-5", { effort: "high" });
const IMPLEMENTER = claudeCode("claude-opus-5", { effort: "high" });
const REVIEWER = claudeCode("claude-opus-5", { effort: "high" });

/** Exactly what ci.yml runs on the pull request, so green here means green
 *  there. Enforced by the harness, not just asked for in the prompt — an
 *  unattended agent that believes it ran the tests is a real failure mode. */
const GATE = "bun run lint && bun run test && bun run build";

/** How many times to hand a failing gate back to the implementer before giving
 *  up on the ticket. Each retry resumes the same session, so it costs one turn,
 *  not a re-read of the whole codebase. */
const GATE_ATTEMPTS = 3;

const repoRoot = process.cwd();

// ---------------------------------------------------------------------------
// Host helpers
// ---------------------------------------------------------------------------

function git(args: string[], cwd = repoRoot): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Last N lines of gate output — enough for the agent to act on, small enough
 *  not to blow out the resumed context. */
function tail(text: string, lines = 60): string {
  return text.split("\n").slice(-lines).join("\n");
}

/**
 * Issue numbers already spoken for by an open pull request.
 *
 * Tickets stay open until their PR merges, so without this a second session
 * started before you've reviewed the first would happily re-implement the exact
 * same tickets. Borrowed from how sandcastle's own CI workflow preflights
 * `agent:implement` (it refuses when a collaborator PR already closes the issue).
 */
function claimedByOpenPr(): number[] {
  const raw = execFileSync(
    "gh",
    ["pr", "list", "--state", "open", "--limit", "100", "--json", "body"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const claimed = new Set<number>();
  for (const pr of JSON.parse(raw) as { body: string | null }[]) {
    for (const m of (pr.body ?? "").matchAll(
      /\b(?:closes|fixes|resolves)\s+#(\d+)/gi,
    )) {
      claimed.add(Number(m[1]));
    }
  }
  return [...claimed].sort((a, b) => a - b);
}

/**
 * Fail fast, and readably, on the two things that actually go wrong before a
 * session starts. Without this the first failure surfaces as a forty-line Effect
 * stack trace from inside the provider.
 *
 * The retry is not paranoia: Docker Desktop's containerd image store serves
 * `docker images` from an index that is ready before tag resolution is, so a
 * daemon that has just started reports the image as listed but not inspectable.
 * A few seconds of patience beats telling you to rebuild an image you already have.
 */
function preflightImage(attempts = 4): void {
  const image = `sandcastle:${repoRoot.split("/").pop()}`;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      execFileSync(
        "docker",
        ["image", "inspect", image, "--format", "{{.Config.User}}"],
        { encoding: "utf8", stdio: "pipe" },
      );
      return;
    } catch {
      if (attempt === attempts) break;
      console.log(`⏳ Waiting for Docker to resolve ${image} (${attempt}/${attempts})…`);
      execFileSync("sleep", ["3"]);
    }
  }

  console.error(
    `\n✖ Docker cannot resolve the image "${image}".\n\n` +
      `  If Docker Desktop just started, give it a moment and re-run.\n` +
      `  If \`docker images\` does not list it at all, build it:\n\n` +
      `      bun run sandcastle:build-image\n`,
  );
  process.exit(1);
}

preflightImage();

const targetBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (targetBranch !== "master") {
  console.warn(
    `⚠️  Host is on "${targetBranch}", not master. The session branch is cut ` +
      `from it and the PR will target it. Ctrl-C now if that's not what you want.`,
  );
}

// Timestamped so repeated or concurrent sessions never collide on a branch name.
const sessionBranch = `sandcastle/${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19)}`;

// ---------------------------------------------------------------------------
// Structured result the implementer reports back
// ---------------------------------------------------------------------------

// Deliberately outside the repo checkout: a scratch file inside the worktree is
// one `git add -A` away from ending up in a commit.
const PLAN_FILE = "/tmp/sandcastle-plan.json";
const RESULT_FILE = "/tmp/sandcastle-result.json";

const Plan = z.object({
  tickets: z.array(
    z.object({
      issue: z.number(),
      title: z.string(),
      blockedBy: z.array(z.number()).default([]),
      why: z.string().default(""),
    }),
  ),
  skipped: z
    .array(z.object({ issue: z.number(), reason: z.string() }))
    .default([]),
});

const ImplementResult = z.object({
  status: z.enum(["implemented", "blocked"]),
  summary: z.string(),
});

type Ticket = z.infer<typeof Plan>["tickets"][number];
type Landed = { issue: number; title: string; summary: string };

/** Minimal structural view of what `sandbox.run()` gives back. `resume` is only
 *  present when the provider captured a session id, which claudeCode does. */
type Resumable = {
  commits: { sha: string }[];
  resume?: (
    prompt: string,
    options?: { promptArgs?: undefined },
  ) => Promise<Resumable>;
};

/**
 * `resume()` re-uses the original run's options but swaps `promptFile` for an
 * inline `prompt`, and sandcastle rejects `promptArgs` alongside an inline
 * prompt. Every one of our runs passes promptArgs, so a bare `.resume(text)`
 * always throws — clear them explicitly. Upstream's `runWithExtraction` strips
 * the same field for the same reason.
 */
const RESUME_OPTS = { promptArgs: undefined } as const;

/**
 * Ask an agent that has just finished working to report what it did, in a turn
 * of its own.
 *
 * Lifted from how sandcastle's own `agent-workflows` do it (`runWithExtraction`):
 * rather than asking the working agent to also emit structured output as its
 * last act — which it forgets, or garbles, once its context is full of the real
 * task — resume its session with a prompt that can do nothing *but* report.
 * The upstream version leans on `Output.object`, which is a top-level `run()`
 * feature; inside a shared sandbox the equivalent is a file the harness reads.
 */
async function extract<T>(
  run: Resumable,
  file: string,
  shape: string,
  schema: z.ZodType<T>,
  attempts = 2,
): Promise<T | null> {
  let current = run;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (!current.resume) return null;

    current = await current.resume(
      [
        `Write your result to \`${file}\`. That is the only thing this turn does.`,
        "",
        "Do not edit any file in the repo. Do not run tests, builds, or git",
        "commands. Do not commit. You are only recording what you already did.",
        "",
        `\`${file}\` must contain exactly this JSON shape:`,
        "",
        "```json",
        shape,
        "```",
        "",
        "Then output <promise>COMPLETE</promise>.",
      ].join("\n"),
      RESUME_OPTS,
    );

    const read = await sandbox.exec(`cat ${file}`);
    if (read.exitCode === 0) {
      try {
        const parsed = schema.safeParse(JSON.parse(read.stdout));
        if (parsed.success) return parsed.data;
        console.error(`⚠️  ${file} did not match the expected shape`);
      } catch {
        console.error(`⚠️  ${file} is not valid JSON`);
      }
    } else {
      console.error(`⚠️  ${file} was not written`);
    }

    if (attempt < attempts) console.log(`↻  Re-asking for ${file}`);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

console.log(`\n🏰 Session branch: ${sessionBranch}  (→ ${targetBranch})\n`);

const sandbox = await createSandbox({
  branch: sessionBranch,
  sandbox: docker(),
  hooks: {
    sandbox: {
      // node_modules is NOT copied from the host: macOS-native binaries
      // (oxlint, tsgolint) would be unusable in a linux container. One clean
      // install per session, not per ticket — the container stays warm.
      onSandboxReady: [
        { command: "bun install --frozen-lockfile", timeoutMs: 600_000 },
      ],
    },
  },
  // Only the host-side Playwright step needs this; it's gitignored, so it can
  // never end up in a commit.
  copyToWorktree: [".env.local"],
});

const landed: Landed[] = [];
const abandoned: { issue: number; title: string; why: string }[] = [];

/** The last commit on the branch known to be complete and gate-green. Every
 *  rollback in the loop resets to exactly here, so one bad ticket costs its own
 *  work and nothing that already landed. Starts at the branch point. */
let verifiedTip = git(["rev-parse", "HEAD"], sandbox.worktreePath);

const claimed = claimedByOpenPr();
if (claimed.length) {
  console.log(
    `↩︎  Skipping ${claimed.map((n) => `#${n}`).join(", ")} — already on an open PR`,
  );
}

// ---------------------------------------------------------------------------
// Phase 0: plan
//
// One agent reasons over the whole backlog at once. Letting each implementer
// pick its own next ticket is a greedy walk with no view of the graph; a single
// planner sees every edge, orders the session topologically, and gives each
// implementer one unambiguous job.
// ---------------------------------------------------------------------------

console.log("🗺️  Planning\n");
await sandbox.exec(`rm -f ${PLAN_FILE}`);

const planRun = await sandbox.run({
  name: "planner",
  agent: PLANNER,
  promptFile: "./.sandcastle/plan-prompt.md",
  promptArgs: {
    CLAIMED_ISSUES: claimed.length
      ? claimed.map((n) => `- #${n}`).join("\n")
      : "_None._",
    MAX_TICKETS: String(MAX_ISSUES),
  },
  idleTimeoutSeconds: 1800,
});

const plan = await extract(
  planRun,
  PLAN_FILE,
  `{
  "tickets": [
    { "issue": 101, "title": "ticket title", "blockedBy": [], "why": "why it's here" }
  ],
  "skipped": [{ "issue": 105, "reason": "PRD with sub-issues" }]
}`,
  Plan,
);

if (!plan) {
  console.log("\n🛑 Planner produced no usable plan. Stopping.");
  await sandbox.close();
  process.exit(1);
}

for (const s of plan.skipped) console.log(`   skipped #${s.issue} — ${s.reason}`);

if (!plan.tickets.length) {
  console.log("\n🛑 Nothing workable in the backlog. Stopping.");
  await sandbox.close();
  process.exit(0);
}

console.log(`\n📋 Plan — ${plan.tickets.length} ticket(s):`);
for (const t of plan.tickets) {
  const deps = t.blockedBy.length ? ` (after ${t.blockedBy.map((n) => `#${n}`).join(", ")})` : "";
  console.log(`   #${t.issue} — ${t.title}${deps}`);
}

// ---------------------------------------------------------------------------
// Phases 1–3, per ticket: implement → gate → review
// ---------------------------------------------------------------------------

/** Tickets that didn't land. Anything downstream of one of these is skipped:
 *  its blocker's code never made it into the tree, so the plan's premise for
 *  working it no longer holds. */
const failed = new Set<number>();

for (const [index, ticket] of plan.tickets.entries()) {
  const i = index + 1;
  console.log(`\n━━━ Ticket ${i}/${plan.tickets.length}: #${ticket.issue} ━━━\n`);

  const missing = ticket.blockedBy.filter((n) => failed.has(n));
  if (missing.length) {
    console.log(
      `⏭️  Skipping — blocked by ${missing.map((n) => `#${n}`).join(", ")}, which did not land`,
    );
    failed.add(ticket.issue);
    continue;
  }

  const doneList = landed.length
    ? landed.map((l) => `- #${l.issue} — ${l.title}`).join("\n")
    : "_Nothing yet — this is the first ticket of the session._";

  // Everything this ticket adds sits above here. The reviewer diffs against it
  // rather than HEAD~1, which would miss earlier commits whenever a gate retry
  // made the implementer commit more than once.
  const ticketBase = verifiedTip;

  await sandbox.exec(`rm -f ${RESULT_FILE}`);

  let implement = await sandbox.run({
    name: `implement-${i}`,
    agent: IMPLEMENTER,
    promptFile: "./.sandcastle/implement-prompt.md",
    promptArgs: {
      ISSUE_NUMBER: String(ticket.issue),
      ISSUE_TITLE: ticket.title,
      DONE_ISSUES: doneList,
    },
    // A ticket is a full explore→TDD→verify cycle; the 10-minute default idle
    // window trips on a long `bun run build`.
    idleTimeoutSeconds: 1800,
  });

  const result = await extract(
    implement,
    RESULT_FILE,
    `{ "status": "implemented | blocked", "summary": "what you built, or why you stopped" }`,
    ImplementResult,
  );

  // A ticket that didn't land is no longer fatal: the plan tells us which of the
  // remaining tickets depended on it, so the rest of the session can carry on.
  const abandon = (why: string) => {
    console.log(`\n⏭️  #${ticket.issue} not landed — ${why}`);
    abandoned.push({ issue: ticket.issue, title: ticket.title, why });
    failed.add(ticket.issue);
    git(["reset", "--hard", verifiedTip], sandbox.worktreePath);
  };

  if (!result) {
    abandon("implementer never reported a readable result");
    continue;
  }

  if (result.status !== "implemented") {
    abandon(result.summary);
    continue;
  }

  if (!implement.commits.length) {
    // Reported success but committed nothing. Trust the tree, not the claim.
    abandon("reported success but made no commit");
    continue;
  }

  console.log(
    `\n✅ #${ticket.issue} — ${ticket.title}  (${implement.commits.length} commit(s))`,
  );

  // --- Gate: verify, and hand failures back to the same session -------------
  let green = false;
  for (let attempt = 1; attempt <= GATE_ATTEMPTS; attempt++) {
    console.log(`\n🔍 Gate attempt ${attempt}/${GATE_ATTEMPTS}: ${GATE}`);
    const check = await sandbox.exec(GATE);

    if (check.exitCode === 0) {
      green = true;
      console.log("✅ Gate green");
      break;
    }

    console.log(`❌ Gate failed (exit ${check.exitCode})`);
    if (attempt === GATE_ATTEMPTS || !implement.resume) break;

    implement = await implement.resume(
      `The quality gate failed after your commit. This is what \`${GATE}\` printed:\n\n` +
        "```\n" +
        tail(`${check.stdout}\n${check.stderr}`) +
        "\n```\n\n" +
        "Fix the cause — do not weaken or skip a test to get past it. Commit the " +
        "fix on this branch, then output <promise>COMPLETE</promise>.",
      RESUME_OPTS,
    );
  }

  if (!green) {
    // Leaving a red commit on the branch would poison every later ticket, since
    // they build on this tree. Roll back to the last green state and move on.
    abandon(`could not pass \`${GATE}\` in ${GATE_ATTEMPTS} attempts`);
    continue;
  }

  // The implementer's work is committed and green — this is the fallback point
  // if the reviewer below makes things worse.
  const implementedTip = git(["rev-parse", "HEAD"], sandbox.worktreePath);

  // --- Review: fresh context over the diff ----------------------------------
  if (REVIEW) {
    console.log(`\n👀 Reviewing #${ticket.issue}`);

    await sandbox.run({
      name: `review-${i}`,
      agent: REVIEWER,
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: {
        ISSUE: String(ticket.issue),
        ISSUE_TITLE: ticket.title,
        BASE_SHA: ticketBase,
      },
      idleTimeoutSeconds: 1800,
    });

    const recheck = await sandbox.exec(GATE);
    if (recheck.exitCode !== 0) {
      // The reviewer broke the build. Its corrections are worth less than a
      // green branch, so drop them and keep the implementer's verified work.
      console.log("⚠️  Reviewer left the gate red — discarding its commits");
      git(["reset", "--hard", implementedTip], sandbox.worktreePath);
    }
  }

  landed.push({
    issue: ticket.issue,
    title: ticket.title,
    summary: result.summary,
  });
  verifiedTip = git(["rev-parse", "HEAD"], sandbox.worktreePath);
}

if (!landed.length) {
  console.log("\nNothing landed. Cleaning up.");
  for (const a of abandoned) console.log(`   #${a.issue} — ${a.why}`);
  await sandbox.close();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Post-loop: e2e on the host
// ---------------------------------------------------------------------------

let e2eOutcome = "not run";

const logDir = `${repoRoot}/.sandcastle/logs`;
const e2eLog = `${logDir}/${sessionBranch.replace(/\//g, "-")}-e2e.log`;

/**
 * Playwright cannot be a per-ticket gate inside the sandbox:
 *
 *   - `E2E_TARGET=staging` points at the *deployed* staging site, so it would
 *     test master, not the branch — useless as a gate on the agent's diff, and
 *     it reseeds shared staging on every run.
 *   - `E2E_TARGET=local` needs Chromium plus `bun dev` (Vite + `convex dev`)
 *     against a live Convex dev deployment — not available in the container.
 *
 * So it runs once, on the host, in the session worktree, against the local
 * target. Two consequences worth knowing:
 *
 *   1. `bun install` re-runs first, because the worktree's node_modules were
 *      installed inside the linux container. This is why it runs after the
 *      loop: it leaves the container's node_modules platform-wrong.
 *   2. `bun dev` pushes the branch's `convex/` to YOUR dev deployment, and the
 *      suite reseeds it. Dev data is expendable by design, but set
 *      RUN_E2E = false if you have a poking session you care about.
 */
function runE2e(worktree: string): string {
  console.log("\n🎭 Playwright (host, local target)");
  console.log(`   tail -f ${e2eLog}`);

  // `tee` rather than stdio:"inherit": the run ends with the worktree removed,
  // so anything that only reached the terminal is unreachable by the time you
  // want to know why it failed.
  //
  // `node_modules` must be DELETED, not reinstalled over. The container's
  // install left linux ELF binaries in `node_modules/.bin`, and `bun install`
  // treats that tree as already satisfied — it reports a handful of packages and
  // leaves every platform binary wrong. Playwright's webServer then runs
  // `bun dev` through /bin/sh, which resolves `.bin/bun` ahead of the host's:
  //   /bin/sh: .../node_modules/.bin/bun: cannot execute binary file  (exit 126)
  execFileSync(
    "bash",
    ["-o", "pipefail", "-c", `rm -rf node_modules && bun install 2>&1 | tee -a '${e2eLog}'`],
    { cwd: worktree, stdio: "inherit" },
  );
  execFileSync(
    "bash",
    ["-o", "pipefail", "-c", `bun run test:e2e 2>&1 | tee -a '${e2eLog}'`],
    { cwd: worktree, stdio: "inherit", env: { ...process.env, TEST_AUTH: "1" } },
  );
  return "✅ passed";
}

/** Rescue Playwright's HTML report and traces before `close()` deletes the
 *  worktree they live in. Without this a red e2e leaves you a draft PR and no
 *  way to see what actually broke. */
function saveE2eArtifacts(worktree: string): void {
  for (const dir of ["playwright-report", "test-results"]) {
    try {
      execFileSync("cp", ["-R", `${worktree}/${dir}`, `${logDir}/${dir}`], {
        stdio: "pipe",
      });
    } catch {
      // Absent when Playwright died before writing them — nothing to rescue.
    }
  }
  console.log(`   artifacts: ${logDir}/playwright-report/index.html`);
}

if (RUN_E2E) {
  try {
    e2eOutcome = runE2e(sandbox.worktreePath);
  } catch (error) {
    // Usually "command failed with exit code 1" and the real story is in the log
    // — but not always: a step that dies *before* Playwright writes anything
    // (bad cwd, missing binary) leaves no log at all, and swallowing the error
    // then makes the failure undiagnosable. Print it, and carry the message into
    // the PR so a red run explains itself without a re-run.
    const why = error instanceof Error ? error.message.split("\n")[0] : String(error);
    e2eOutcome = `❌ failed — PR opened as draft (\`${why}\`; log: \`${e2eLog.replace(`${repoRoot}/`, "")}\`)`;
    console.error("\n⚠️  e2e failed:", error);
  }
  saveE2eArtifacts(sandbox.worktreePath);
  console.log(`\n🎭 e2e: ${e2eOutcome}`);
}

// ---------------------------------------------------------------------------
// Post-loop: push and open one PR
// ---------------------------------------------------------------------------

console.log(`\n📤 Pushing ${sessionBranch}`);
git(["push", "-u", "origin", sessionBranch], sandbox.worktreePath);

const title =
  landed.length === 1
    ? `${landed[0]!.title} (#${landed[0]!.issue})`
    : `sandcastle: ${landed.map((l) => `#${l.issue}`).join(", ")}`;

const body = [
  `Unattended \`sandcastle\` session — ${landed.length} ticket(s) drained onto \`${sessionBranch}\``,
  `in dependency order, each gated on \`${GATE}\`${REVIEW ? " and reviewed by a fresh agent" : ""}.`,
  "",
  "## Tickets",
  "",
  ...landed.map((l) => `- **Closes #${l.issue}** — ${l.title}\n  ${l.summary}`),
  ...(abandoned.length
    ? [
        "",
        "## Planned but not landed",
        "",
        "These were in the session plan and did not make it. They stay open, and",
        "nothing from them is on this branch.",
        "",
        ...abandoned.map((a) => `- #${a.issue} — ${a.title}: ${a.why}`),
      ]
    : []),
  "",
  "## Verification",
  "",
  `- \`${GATE}\` — ✅ green after every ticket`,
  `- Playwright e2e (local target) — ${e2eOutcome}`,
  "",
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
].join("\n");

const prArgs = [
  "pr",
  "create",
  "--base",
  targetBranch,
  "--head",
  sessionBranch,
  "--title",
  title,
  "--body",
  body,
];
// A red e2e run is worth landing for inspection, but not worth merging blind.
if (e2eOutcome.startsWith("❌")) prArgs.push("--draft");

const prUrl = execFileSync("gh", prArgs, {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

console.log(`\n🎉 ${prUrl}\n`);

await sandbox.close();
