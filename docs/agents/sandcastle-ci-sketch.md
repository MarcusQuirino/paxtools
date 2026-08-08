# Sketch: label-triggered agents in CI

**Status:** sketch only — nothing here is built. Written 2026-07-31 after reading
how [`mattpocock/sandcastle`](https://github.com/mattpocock/sandcastle) uses its
own tool. Decide later; this exists so the decision doesn't need the research
done again.

The local AFK loop (`.sandcastle/main.ts`, `bun run sandcastle`) is a *pull*
model: you start it, it drains the backlog, you get one PR. This sketch is the
*push* model that lives beside it — you label an issue and forget about it.

## What upstream actually built

Five workflows (`.github/workflows/agent-*.yml`) driving five one-shot scripts
(`.sandcastle/agent-workflows/*/`), stitched together by labels:

```
issue labelled agent:implement
   → branch agent/issue-N-slug, implement, push, open DRAFT PR
   → auto-labels the PR agent:review
PR labelled agent:review
   → review agent posts real inline review comments on the diff
PR labelled agent:implement-pr
   → agent addresses unresolved review threads, replies, declines with reasons
plus: agent:explore (investigate an issue, comment findings)
      agent:update-branch (rebase/merge main into the PR branch)
```

Distinctive choices worth keeping if we build this:

- **`noSandbox()`.** The Actions runner *is* the isolation, so there is no Docker
  or worktree — the scripts run against the checkout directly. That is why these
  scripts are unusable locally and the local loop is a separate program.
- **Env in, files out.** Each script reads `required("PR_NUMBER")` etc. and writes
  its results to `$OUTPUT_DIR/*.json`, which later workflow steps read to post
  comments. Failures write `failure_reason.txt`, which the workflow turns into an
  issue comment — so a crashed run explains itself on the issue instead of dying
  silently in a log.
- **A label state machine.** `agent:implement` → `agent:in-progress` →
  `agent:blocked` (with the reason comment). The labels are the queue; GitHub is
  the database.
- **Refuse loudly, early.** Before spending a token it rejects: PRD-shaped issues
  (any issue with sub-issues), sub-issues (label the parent instead), and issues
  a collaborator's open PR already closes. Each refusal removes the trigger label
  and comments why.
- **Separate extraction pass** (`runWithExtraction`) — do the work, then *resume*
  the session with a prompt that forbids edits and only emits the structured tag.

We already adopted the last two ideas into the local loop: the refusal preflights
became `claimedByOpenPr()` + the planner's PRD guard, and the extraction pass
became `extract()` in `main.ts`.

## What a paxtools version would look like

### Labels

We already have `ready-for-agent` from `/to-tickets`. Adding an `agent:*` axis
alongside it keeps triage vocabulary (`docs/agents/triage-labels.md`) separate
from execution state, which is the right split — `ready-for-agent` says "a human
finished specifying this", `agent:implement` says "go".

| Label | On | Meaning |
| --- | --- | --- |
| `agent:implement` | issue | Trigger. Removed as soon as the run starts. |
| `agent:in-progress` | issue | A run holds this issue. Always removed at the end. |
| `agent:blocked` | issue | Last run failed; the reason is in a comment. |
| `agent:review` | PR | Trigger the review agent. |

### Workflows

Start with **two**, not five: `agent-implement.yml` and `agent-review.yml`.
`explore` and `update-branch` are conveniences; `implement-pr` only earns its keep
once the review agent is actually producing threads worth answering.

### paxtools-specific work upstream didn't have to do

1. **Bun, not npm.** `oven-sh/setup-bun@v2` pinned to 1.3.14, `bun install
   --frozen-lockfile`, and the gate is `bun run lint && bun run test && bun run
   build` — same as `ci.yml`. Note `bun run test`, never bare `bun test`, which
   drags in the Playwright specs.
2. **A changeset is mandatory.** `CLAUDE.md` requires one per change. The prompt
   must demand it and the workflow should fail the run if `.changeset/*.md` is
   untouched — cheaper to catch in CI than in review.
3. **Convex.** The agent must read `convex/_generated/ai/guidelines.md`, and any
   schema change needing backfill wants a migration appended to `REGISTRY` in
   `convex/migrations.ts`. `convex/_generated` is committed, so no codegen step
   and no Convex credentials are needed for lint/test/build.
4. **Never deploy.** The agent must not run `convex deploy`, `vercel`, or
   `gh workflow run`. Merging to master already auto-deploys staging via `ci.yml`;
   prod is tag-only. Give the job the narrowest `permissions:` block that works
   (`contents: write`, `issues: write`, `pull-requests: write`) and no Convex or
   Vercel secrets at all — the safest way to guarantee it can't deploy is to
   withhold the credentials.
5. **No e2e in the agent job.** Same reasoning as the local loop: `E2E_TARGET=
   staging` tests the deployed site rather than the branch, and `local` needs a
   live Convex dev deployment. Leave e2e to `e2e-staging.yml`, still manual.
6. **PR, never master.** Draft PR targeting `master`, body carrying
   `Closes #N` — which is also what makes `claimedByOpenPr()` in the local loop
   see the work and skip it. The two models compose for free, but only because
   both write `Closes #N`.

### Secrets

`CLAUDE_CODE_OAUTH_TOKEN` (repo secret). Plus an `AGENT_PAT` if the agent's own
label writes need to trigger downstream workflows — the default `GITHUB_TOKEN`
deliberately will not, which is exactly why upstream's implement job carries a
PAT with a `GITHUB_TOKEN` fallback for the `agent:review` hand-off.

## Cost and the honest argument against

Every labelled issue is an Actions runner for up to an hour plus opus tokens, and
`bun install` + `bun run build` runs cold each time — no warm container to
amortise it across tickets the way the local loop does. One issue, one runner.

So the real question isn't capability, it's where the work starts. The local loop
already covers "I planned a batch and want it done overnight", and does it more
cheaply. This is worth building when you want the *other* trigger: a ticket filed
from your phone that's implemented before you next open the laptop, or an agent
review on every PR including your own. If neither of those is a real itch, the
local loop is the whole product.

## If we build it

Upstream's scripts are a working reference, not a dependency — copy the shapes,
not the files (`CODING_STANDARDS.md` there is Effect-specific and irrelevant to
us; ours would point at `CLAUDE.md`, `CONTEXT.md`, and `docs/adr/`). Build
`agent-implement.yml` first, run it on one throwaway issue, and only add
`agent-review.yml` once the implement path is boring.
