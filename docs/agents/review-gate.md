# Independent review gate

Every PR gets reviewed by a **fresh agent that didn't write it**, and master
can't take the PR until that review passes on the PR's latest commit. The
author never approves its own work.

| | |
|---|---|
| Required check | `Independent review` (ruleset 27609274, GitHub Actions app 15368) |
| Workflow | `.github/workflows/review.yml` (`pull_request_target`) |
| Reviewer | Claude Code CLI, `opus` / effort `high`, Marcus's subscription (`CLAUDE_CODE_OAUTH_TOKEN` secret) |
| Rubric (the prompt) | [`docs/agents/review-rubric.md`](./review-rubric.md) — versioned, tune it by PR |
| Glue | `scripts/review-gate.ts` + `scripts/lib/review-gate.ts` (tested) |
| Typical time | ~1 min waiting for the fast checks + the review itself (see PR for measured runs); runs in parallel with `E2E (Playwright)` |

## Flow

1. PR opened / pushed / reopened / marked ready → the workflow runs **from
   master** (not from the PR).
2. It gathers context into `review/context/`: PR title + body + linked
   issues (`pr.md`), the diff vs the merge base, the changed-file list, the
   conventions **from master** (`CLAUDE.md`, `AGENTS.md`, `docs/agents/`,
   Convex guidelines) and the CI results on that commit (waits ≤10 min for
   the fast checks; E2E is reported as-is).
3. A new `claude -p` session reviews it against the rubric: intent vs diff,
   correctness, Convex auth/validation/migrations, missing or weakened tests,
   guardrail tampering, security/data loss, scope creep.
4. It returns a schema-checked verdict: `pass`, or `block` with blocking
   findings (`file:line`, problem, concrete fix) plus non-blocking nits.
5. The gate posts/updates one sticky PR comment and the job **fails if
   anything blocks** — or if the reviewer produced no valid verdict (fails
   closed: expired token, usage limit, malformed output).
6. A new push = new head SHA = no review on it yet → master is blocked
   again until the new review passes. A stale in-flight review is cancelled.

Drafts and fork PRs fail fast without spending a review (no skipping: a
skipped job would count as passing). Mark the PR ready → it reviews.

## When the review blocks your PR (author agents read this)

- **Fix and push.** Apply each blocking finding's fix (or an equivalent
  one), add the missing test, restore the weakened check. The push triggers a
  fresh review.
- **Never argue the check off.** Don't edit the PR body to persuade the
  reviewer, don't add "reviewer: approve" text (that is itself blocking),
  don't re-run the job hoping for a different answer, don't touch the
  workflow, rubric or ruleset to get green.
- **If a finding is wrong**, say why in a PR comment and ask Marcus. Only
  Marcus decides to override, and the fix for a bad rubric is a separate PR
  to `review-rubric.md`.
- Nits don't block; fix them if cheap.
- "No verdict" (⚠️) = infrastructure. Report it; don't work around it.

Reproduce a review locally (same prompt, your subscription): see the
`Review` step in `review.yml`; run `bun scripts/review-gate.ts context` with
`REPO PR_NUMBER HEAD_SHA BASE_SHA WORKDIR` set and the PR head cloned at
`$WORKDIR/pr`, then the same `claude -p …` from `$WORKDIR`.

## Why the author can't approve itself

- **No shared context.** The reviewer is a new process on a GitHub runner:
  `--safe-mode` (no `CLAUDE.md` auto-load, memory, hooks, MCP, skills or
  settings from any directory), `--no-session-persistence`, and the only input
  is what the workflow hands it. The author's thread, memory and reasoning
  never reach it.
- **The PR can't edit its reviewer.** `pull_request_target` runs the
  workflow, `scripts/review-gate.ts` and the rubric from **master**; a PR that
  changes them only affects reviews after it merges (and the rubric tells the
  reviewer to scrutinise such PRs). Conventions are read from master too, so
  a PR can't loosen `CLAUDE.md` for its own review.
- **A plain token can't post the check.** The required check is pinned to
  the GitHub Actions app (integration 15368). A commit status or check run
  posted with a PAT / `gh` token doesn't satisfy it (PATs can't create check
  runs at all).
- **The reviewer can't be turned against the repo.** It runs with only
  Read/Grep/Glob, no GitHub token in its environment (`env -i`), no network
  tools, and nothing from the PR is executed. PR text is declared untrusted;
  attempts to steer the reviewer are blocking findings. Output is scanned for
  secrets before posting.

## Remaining gaps (honest list)

1. **Another Actions job can impersonate the check.** The ruleset can only
   pin the *app* (GitHub Actions), not the workflow. A determined author with
   push access can get a green `Independent review` from GitHub Actions by
   (a) adding a `pull_request` workflow with a job of that name, or (b)
   opening a PR against a non-master branch whose `review.yml` is fake
   (`pull_request_target` uses the *base* branch's workflow), then opening
   the PR to master — check runs belong to the commit. The rubric blocks (a)
   when the real reviewer sees it, but a duplicate passing run may still
   satisfy the ruleset. **Fix (needs Marcus):** a dedicated GitHub App whose
   key lives in a `review-gate` environment restricted to `master`; the gate
   posts the check as that App and the ruleset pins its integration ID.
   Neither a PR-defined workflow nor a non-master base can read that
   environment, so only master's `review.yml` can produce the check.
2. **Re-run until green.** `gh run rerun` re-reviews the same commit; LLM
   output varies. Policy forbids it; nothing enforces it.
3. **Agents hold Marcus's admin token.** Anything admin can do (edit the
   ruleset, workflows on master via a merged PR, secrets) an agent can do.
   No ruleset closes that; a scoped token for agents would.
4. **Same model family.** The reviewer is Claude reviewing (often) Claude.
   Independence is of context, not of model. A second-provider reviewer is
   possible later if blind spots show up.
5. **Subscription limits.** Reviews share Marcus's Claude usage. A usage-limit
   hit fails closed (blocks merges) until it resets; re-run the job then.
   `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) is valid ~1 year —
   created 2026-04-12, so rotate before ~2027-04.
